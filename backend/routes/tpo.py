from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase
from services.hireability import calculate_hireability_index

router = APIRouter()

# ============================================================
# Pydantic Models
# ============================================================

class TPORegister(BaseModel):
    college_id: str
    name: str
    email: str
    password: str
    designation: Optional[str] = None
    proof_document_url: Optional[str] = None

class TPOLogin(BaseModel):
    email: str
    password: str


# ============================================================
# TPO Registration & Login
# (mirrors routes/auth.py's register_student / login_student pattern exactly)
# ============================================================

@router.post("/register")
async def register_tpo(payload: TPORegister):
    """Registers a TPO official under an existing college.
    Creates the Supabase Auth user server-side. Starts unverified until admin approves."""
    try:
        college = supabase.table("colleges").select("id").eq("id", payload.college_id).execute()
        if not college.data:
            raise HTTPException(status_code=404, detail="College not found")

        existing = supabase.table("tpo_officials").select("id").eq("email", payload.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="A TPO official with this email already exists")

        # 1. Register with Supabase Auth (Admin API) — same pattern as register_student
        user_id = None
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True
            })
            if auth_response.user:
                user_id = auth_response.user.id
        except Exception as auth_err:
            print("Supabase Auth Error (bypassing for test):", auth_err)

        # 2. Insert into public.tpo_officials
        result = supabase.table("tpo_officials").insert({
            "auth_id": user_id,
            "college_id": payload.college_id,
            "name": payload.name,
            "email": payload.email,
            "designation": payload.designation,
            "proof_document_url": payload.proof_document_url,
            "is_verified": False
        }).execute()

        return {"message": "Registration successful", "tpo_official": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login")
async def login_tpo(payload: TPOLogin):
    """Logs in a TPO official. Same pattern as login_student in routes/auth.py."""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Invalid credentials")

        user_id = auth_response.user.id

        tpo_response = supabase.table("tpo_officials").select("*").eq("auth_id", user_id).execute()
        if not tpo_response.data:
            fallback = supabase.table("tpo_officials").select("*").eq("email", payload.email).execute()
            if fallback.data:
                tpo_official = fallback.data[0]
                supabase.table("tpo_officials").update({"auth_id": user_id}).eq("id", tpo_official["id"]).execute()
                tpo_official["auth_id"] = user_id
                tpo_response.data = [tpo_official]
            else:
                raise HTTPException(status_code=404, detail="TPO profile not found")

        tpo_data = tpo_response.data[0]
        college = supabase.table("colleges").select("*").eq("id", tpo_data["college_id"]).execute()

        return {
            "message": "Login successful",
            "tpo_official": tpo_data,
            "college": college.data[0] if college.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password.")


@router.get("/me/{auth_id}")
async def get_tpo_profile(auth_id: str):
    """Fetches the TPO's own profile plus their college info."""
    try:
        tpo = supabase.table("tpo_officials").select("*").eq("auth_id", auth_id).execute()
        if not tpo.data:
            raise HTTPException(status_code=404, detail="TPO profile not found")

        tpo_data = tpo.data[0]
        college = supabase.table("colleges").select("*").eq("id", tpo_data["college_id"]).execute()
        
        co_tpos = supabase.table("tpo_officials").select("id, name, email, designation").eq("college_id", tpo_data["college_id"]).execute()
        co_tpos_data = [t for t in co_tpos.data if t["id"] != tpo_data["id"]]

        return {
            "tpo_official": tpo_data,
            "college": college.data[0] if college.data else None,
            "co_tpos": co_tpos_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Access Gate
# ============================================================

def _assert_tpo_verified(auth_id: str) -> dict:
    """Blocks dashboard access unless this TPO's account is verified."""
    tpo = supabase.table("tpo_officials").select("*").eq("auth_id", auth_id).execute()
    if not tpo.data:
        raise HTTPException(status_code=404, detail="TPO profile not found")

    tpo_data = tpo.data[0]
    if not tpo_data["is_verified"]:
        raise HTTPException(status_code=403, detail="Your account is not yet verified. Please wait for admin approval.")

    return tpo_data


# ============================================================
# Student Cluster (auto-linked by college_id — no separate approval queue)
# ============================================================

@router.get("/students/{auth_id}")
async def get_college_students(auth_id: str, branch: Optional[str] = None):
    """Lists all students belonging to this TPO's college, or linked via requests."""
    tpo_data = _assert_tpo_verified(auth_id)
    college_id = tpo_data["college_id"]

    try:
        query = supabase.table("students").select("id, name, email, branch, year, usn, is_verified").eq("college_id", college_id)
        if branch:
            query = query.eq("branch", branch)
            
        students = query.execute()
        if not students.data:
            return {"students": []}

        # Batch fetch ALL skills for these students in ONE query (huge perf win vs N queries)
        student_ids = [s["id"] for s in students.data]
        all_skills_res = supabase.table("student_skills").select("*").in_("student_id", student_ids).execute()
        
        # Group skills by student_id in memory
        skills_by_student: dict = {}
        for skill in all_skills_res.data:
            sid = skill["student_id"]
            if sid not in skills_by_student:
                skills_by_student[sid] = []
            skills_by_student[sid].append(skill)

        enriched = []
        for student in students.data:
            sid = student["id"]
            skills = skills_by_student.get(sid, [])
            total_skills = len(skills)
            verified_skills = len([s for s in skills if s["verification_level"] >= 1])
            avg_score = round(sum(s["skill_score"] for s in skills) / total_skills, 1) if total_skills else 0

            # Find top cluster (interest) based on skills
            cluster = "General"
            if skills:
                top_skill = max(skills, key=lambda x: x["skill_score"])
                cluster = top_skill["skill_name"]
            
            # Calculate GLI score using already-fetched skills (no extra DB hit)
            skill_list = [{**s, "updated_at": s.get("created_at")} for s in skills]
            gli_data = calculate_hireability_index(skill_list)

            enriched.append({
                **student,
                "total_skills": total_skills,
                "verified_skills": verified_skills,
                "avg_skill_score": avg_score,
                "gli_score": gli_data["score"],
                "cluster": cluster
            })

        return {"students": enriched}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/{auth_id}/{student_id}")
async def get_student_monitor(auth_id: str, student_id: str):
    """Deep dive into a specific student's profile for the TPO."""
    tpo_data = _assert_tpo_verified(auth_id)
    college_id = tpo_data["college_id"]
    
    try:
        student = supabase.table("students").select("*").eq("id", student_id).eq("college_id", college_id).execute()
        if not student.data:
            raise HTTPException(status_code=404, detail="Student not found or not linked to this college")
            
        skills = supabase.table("student_skills").select("*").eq("student_id", student_id).execute()
        try:
            roadmaps_req = supabase.table("student_roadmap_nodes").select("*").eq("student_id", student_id).execute()
            roadmaps_data = roadmaps_req.data
        except Exception:
            roadmaps_data = []
        
        return {
            "student": student.data[0],
            "skills": skills.data,
            "roadmaps": roadmaps_data
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/{auth_id}/{student_id}/activity")
async def get_student_activity(auth_id: str, student_id: str):
    """Calculates learning time, current streak, and 30-day activity heatmap."""
    from datetime import datetime, timedelta
    tpo_data = _assert_tpo_verified(auth_id)
    
    try:
        # Check student belongs to college
        student = supabase.table("students").select("id").eq("id", student_id).eq("college_id", tpo_data["college_id"]).execute()
        if not student.data:
            raise HTTPException(status_code=404, detail="Student not found")

        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        
        mcqs = supabase.table("student_seen_questions").select("created_at").eq("student_id", student_id).gte("created_at", thirty_days_ago).execute()
        coding = supabase.table("student_seen_coding_questions").select("created_at").eq("student_id", student_id).gte("created_at", thirty_days_ago).execute()
        
        all_timestamps = [req["created_at"] for req in mcqs.data] + [req["created_at"] for req in coding.data]
        
        # Calculate learning time (Estimates: 2 mins per MCQ, 15 mins per coding task)
        total_learning_minutes = (len(mcqs.data) * 2) + (len(coding.data) * 15)
        
        # Build daily heatmap
        activity_map = {}
        for i in range(30):
            day_str = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            activity_map[day_str] = 0
            
        for ts in all_timestamps:
            # Parse ISO timestamp and format to YYYY-MM-DD
            try:
                # Handle potential trailing Z or microseconds
                date_part = ts.split("T")[0]
                if date_part in activity_map:
                    activity_map[date_part] += 1
            except:
                pass
                
        heatmap = [{"date": k, "count": v} for k, v in activity_map.items()]
        heatmap.sort(key=lambda x: x["date"]) # chronological order
        
        # Calculate streak
        current_streak = 0
        for item in reversed(heatmap):
            if item["count"] > 0:
                current_streak += 1
            else:
                # Break streak if it's not today
                if item["date"] != datetime.now().strftime("%Y-%m-%d"):
                    break

        return {
            "total_learning_minutes": total_learning_minutes,
            "current_streak": current_streak,
            "heatmap": heatmap
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# Connection Requests ( college_student_links )
# ============================================================

class InviteRequest(BaseModel):
    student_email: str

@router.post("/invite/{auth_id}")
async def invite_student(auth_id: str, req: InviteRequest):
    tpo_data = _assert_tpo_verified(auth_id)
    college_id = tpo_data["college_id"]
    
    try:
        student = supabase.table("students").select("id").eq("email", req.student_email).execute()
        if not student.data:
            raise HTTPException(status_code=404, detail="Student not found with this email")
            
        student_id = student.data[0]["id"]
        
        # Check existing link
        existing = supabase.table("college_student_links").select("*").eq("student_id", student_id).eq("college_id", college_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="A request or link already exists")
            
        supabase.table("college_student_links").insert({
            "student_id": student_id,
            "college_id": college_id,
            "status": "pending_student_acceptance",
            "initiated_by": "tpo"
        }).execute()
        
        return {"success": True, "message": "Invitation sent successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/requests/{auth_id}")
async def get_pending_requests(auth_id: str):
    tpo_data = _assert_tpo_verified(auth_id)
    college_id = tpo_data["college_id"]
    
    try:
        requests = supabase.table("college_student_links").select("*, students(name, email, branch)").eq("college_id", college_id).eq("status", "pending_tpo_approval").execute()
        return {"requests": requests.data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/requests/approve/{auth_id}/{link_id}")
async def approve_request(auth_id: str, link_id: str):
    tpo_data = _assert_tpo_verified(auth_id)
    college_id = tpo_data["college_id"]
    
    try:
        link = supabase.table("college_student_links").select("*").eq("id", link_id).eq("college_id", college_id).execute()
        if not link.data:
            raise HTTPException(status_code=404, detail="Request not found")
            
        supabase.table("college_student_links").update({"status": "linked"}).eq("id", link_id).execute()
        # Auto-update the student's college_id as well for backward compatibility
        student_id = link.data[0]["student_id"]
        supabase.table("students").update({"college_id": college_id}).eq("id", student_id).execute()
        
        return {"success": True, "message": "Request approved"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# College-Level Analytics Dashboard
# ============================================================

@router.get("/analytics/{auth_id}")
async def get_college_analytics(auth_id: str):
    """Aggregate stats for the TPO dashboard: student count, avg skill score,
    verification breakdown, and top skills across the college."""
    tpo_data = _assert_tpo_verified(auth_id)
    college_id = tpo_data["college_id"]

    try:
        students_full = supabase.table("students").select("*").eq("college_id", college_id).execute()
        student_ids = [s["id"] for s in students_full.data]
        total_students = len(student_ids)

        if not student_ids:
            return {
                "total_students": 0,
                "avg_skill_score": 0,
                "total_verified_skills": 0,
                "top_skills": [],
                "placement_stats": {
                    "total_applications": 0,
                    "hired": 0,
                    "shortlisted": 0
                }
            }

        all_skills = []
        try:
            # Batch fetch skills to avoid N+1 query loops
            skills_res = supabase.table("student_skills").select("skill_name, verification_level, skill_score").in_("student_id", student_ids).execute()
            all_skills = skills_res.data or []
        except Exception:
            pass

        total_score = sum(s["skill_score"] for s in all_skills)
        avg_skill_score = round(total_score / len(all_skills), 1) if all_skills else 0
        total_verified = len([s for s in all_skills if s["verification_level"] >= 1])

        skill_counts = {}
        for s in all_skills:
            skill_counts[s["skill_name"]] = skill_counts.get(s["skill_name"], 0) + 1
        top_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        applications = supabase.table("applications").select("id, status").in_("student_id", student_ids).execute()
        placement_stats = {
            "total_applications": len(applications.data),
            "hired": len([a for a in applications.data if a["status"] == "hired"]),
            "shortlisted": len([a for a in applications.data if a["status"] == "shortlisted"])
        }
        
        # Branch-wise stats
        branch_counts = {}
        for s in students_full.data:
            branch = s.get("branch") or "Unknown"
            branch_counts[branch] = branch_counts.get(branch, 0) + 1

        # Activity Trend (Last 7 Days) for whole college
        from datetime import datetime, timedelta
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
        
        # Batch fetching timestamps for all students can be heavy, but we filter by >= 7 days
        # Workaround: we can only filter by student_id via IN if there are <= 100 students, 
        # so for robustness, we just fetch the last 7 days of activity and filter locally
        mcqs_recent = supabase.table("student_seen_questions").select("created_at, student_id").gte("created_at", seven_days_ago).execute()
        coding_recent = supabase.table("student_seen_coding_questions").select("created_at, student_id").gte("created_at", seven_days_ago).execute()
        
        # Filter for our college students
        student_id_set = set(student_ids)
        valid_activity = []
        for row in mcqs_recent.data + coding_recent.data:
            if row["student_id"] in student_id_set:
                valid_activity.append(row["created_at"])
                
        trend_map = {}
        for i in range(7):
            d_str = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            trend_map[d_str] = 0
            
        for ts in valid_activity:
            d_part = ts.split("T")[0]
            if d_part in trend_map:
                trend_map[d_part] += 1
                
        activity_trend = [{"date": datetime.strptime(k, "%Y-%m-%d").strftime("%a"), "full_date": k, "activity": v} for k, v in trend_map.items()]
        activity_trend.sort(key=lambda x: x["full_date"])

        return {
            "total_students": total_students,
            "avg_skill_score": avg_skill_score,
            "total_verified_skills": total_verified,
            "top_skills": [{"skill_name": k, "student_count": v} for k, v in top_skills],
            "placement_stats": placement_stats,
            "branch_stats": [{"branch": k, "count": v} for k, v in branch_counts.items()],
            "activity_trend": activity_trend
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
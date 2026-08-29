from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

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

        return {
            "tpo_official": tpo_data,
            "college": college.data[0] if college.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Access Gate
# ============================================================

def _assert_tpo_verified(auth_id: str) -> dict:
    """Blocks dashboard access unless this TPO's account is verified.
    Returns the tpo record (with college_id) if verified."""
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
async def get_college_students(auth_id: str):
    """Lists all students belonging to this TPO's college, with their skill counts.
    Auto-linked: every student who registered under this college_id appears here."""
    tpo_data = _assert_tpo_verified(auth_id)
    college_id = tpo_data["college_id"]

    try:
        students = supabase.table("students").select("id, name, email, branch, year, usn, is_verified").eq("college_id", college_id).execute()

        enriched = []
        for student in students.data:
            skills = supabase.table("student_skills").select("skill_name, verification_level, skill_score").eq("student_id", student["id"]).execute()
            total_skills = len(skills.data)
            verified_skills = len([s for s in skills.data if s["verification_level"] >= 1])
            avg_score = round(sum(s["skill_score"] for s in skills.data) / total_skills, 1) if total_skills else 0

            enriched.append({
                **student,
                "total_skills": total_skills,
                "verified_skills": verified_skills,
                "avg_skill_score": avg_score
            })

        return {"students": enriched}
    except HTTPException:
        raise
    except Exception as e:
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
        students = supabase.table("students").select("id").eq("college_id", college_id).execute()
        student_ids = [s["id"] for s in students.data]
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
        for sid in student_ids:
            skills = supabase.table("student_skills").select("skill_name, verification_level, skill_score").eq("student_id", sid).execute()
            all_skills.extend(skills.data)

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

        return {
            "total_students": total_students,
            "avg_skill_score": avg_skill_score,
            "total_verified_skills": total_verified,
            "top_skills": [{"skill_name": k, "student_count": v} for k, v in top_skills],
            "placement_stats": placement_stats
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
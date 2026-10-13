from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import supabase, create_auth_client
from services.hireability import calculate_hireability_index
from cachetools import TTLCache

router = APIRouter()

alumni_opps_cache = TTLCache(maxsize=100, ttl=300)

_MEM_INTEREST_STATUS = {} # (opportunity_id, student_id) -> status

# ============================================================
# Pydantic Models
# ============================================================

class AlumniRegister(BaseModel):
    college_id: str
    name: str
    email: str
    password: str
    passout_year: Optional[int] = None
    current_company: Optional[str] = None
    current_job_role: Optional[str] = None
    linkedin_url: Optional[str] = None
    proof_document_url: Optional[str] = None

class AlumniLogin(BaseModel):
    email: str
    password: str

class OpportunityCreate(BaseModel):
    alumni_id: str
    title: str
    description: Optional[str] = None
    type: str = "referral"  # 'referral' | 'internship' | 'mentorship' | 'job' | 'opensource'

class ExpressInterest(BaseModel):
    opportunity_id: str
    student_id: str

class AlumniMessageCreate(BaseModel):
    sender_type: str
    sender_id: str
    sender_name: str
    message: str

class UpdateStatus(BaseModel):
    status: str


# ============================================================
# Alumni Registration & Login
# (mirrors routes/auth.py's register_student / login_student pattern exactly)
# ============================================================

@router.post("/register")
async def register_alumni(payload: AlumniRegister):
    """Registers an alumnus under an existing college.
    Creates the Supabase Auth user server-side. Starts unverified until admin approves."""
    try:
        college = supabase.table("colleges").select("id").eq("id", payload.college_id).execute()
        if not college.data:
            raise HTTPException(status_code=404, detail="College not found")

        existing = supabase.table("alumni").select("id").eq("email", payload.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="An alumni profile with this email already exists")

        # 1. Register with Supabase Auth (Admin API)
        # FIXED: no longer swallows the error. If Auth creation fails,
        # the function stops here instead of inserting a broken alumni row.
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True
            })
        except Exception as auth_err:
            raise HTTPException(status_code=500, detail=f"Failed to create auth account: {str(auth_err)}")

        if not auth_response.user:
            raise HTTPException(status_code=500, detail="Auth account creation returned no user.")

        user_id = auth_response.user.id

        # 2. Insert into public.alumni — only reached if Auth creation truly succeeded
        result = supabase.table("alumni").insert({
            "auth_id": user_id,
            "college_id": payload.college_id,
            "name": payload.name,
            "email": payload.email,
            "passout_year": payload.passout_year,
            "current_company": payload.current_company,
            "current_job_role": payload.current_job_role,
            "linkedin_url": payload.linkedin_url,
            "proof_document_url": payload.proof_document_url,
            "is_verified": False
        }).execute()

        return {"message": "Registration successful", "alumni": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login")
async def login_alumni(payload: AlumniLogin):
    """Logs in an alumnus. Same pattern as login_student in routes/auth.py."""
    try:
        auth_client = create_auth_client()
        auth_response = auth_client.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Invalid credentials")

        user_id = auth_response.user.id

        alumni_response = supabase.table("alumni").select("*").eq("auth_id", user_id).execute()
        if not alumni_response.data:
            raise HTTPException(status_code=404, detail="Alumni profile not found")

        alumni_data = alumni_response.data[0]
        college = supabase.table("colleges").select("*").eq("id", alumni_data["college_id"]).execute()

        return {
            "message": "Login successful",
            "alumni": alumni_data,
            "college": college.data[0] if college.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password.")


@router.get("/me/{auth_id}")
async def get_alumni_profile(auth_id: str):
    """Fetches the alumnus's own profile plus their college info."""
    try:
        alumni = supabase.table("alumni").select("*").eq("auth_id", auth_id).execute()
        if not alumni.data:
            raise HTTPException(status_code=404, detail="Alumni profile not found")

        alumni_data = alumni.data[0]
        college = supabase.table("colleges").select("*").eq("id", alumni_data["college_id"]).execute()

        return {
            "alumni": alumni_data,
            "college": college.data[0] if college.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Directory (student-facing — browse alumni from their college)
# ============================================================

@router.get("/directory/{college_id}")
async def get_alumni_directory(college_id: str):
    """Lists verified alumni from a given college, for students to browse
    (e.g. 'alumni working at target MNCs')."""
    try:
        alumni = supabase.table("alumni").select(
            "id, name, current_company, current_job_role, passout_year, linkedin_url"
        ).eq("college_id", college_id).eq("is_verified", True).execute()

        return {"alumni": alumni.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/college-students/{alumni_id}")
async def get_college_students(alumni_id: str):
    """Alumni-facing: lists ALL students from the alumnus's own college
    (not just the ones interested in a specific opportunity), with their
    skill profiles. Requires verified alumni — same gate as posting."""
    alumni_data = _assert_alumni_verified(alumni_id)
    college_id = alumni_data["college_id"]
    print(f"DEBUG: querying students with college_id = {repr(college_id)}")

    try:
        students = supabase.table("students").select(
            "id, name, email, branch, year, phone, usn, github_url, linkedin_url, college_id"
        ).eq("college_id", college_id).execute()

        enriched = []
        for s in students.data:
            skills = supabase.table("student_skills").select("*").eq("student_id", s["id"]).execute()
            hireability = calculate_hireability_index(skills.data or [])

            enriched.append({
                "student": s,
                "skills": skills.data or [],
                "hireability": hireability
            })

        return {"students": enriched}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ============================================================
# Access Gate
# ============================================================

def _assert_alumni_verified(alumni_id: str) -> dict:
    """Blocks opportunity posting unless this alumnus's account is verified."""
    alumni = supabase.table("alumni").select("*").eq("id", alumni_id).execute()
    if not alumni.data:
        raise HTTPException(status_code=404, detail="Alumni profile not found")

    alumni_data = alumni.data[0]
    if not alumni_data["is_verified"]:
        raise HTTPException(status_code=403, detail="Your account is not yet verified. Please wait for admin approval.")

    return alumni_data


# ============================================================
# Opportunities (posted by alumni)
# ============================================================

@router.post("/opportunities")
async def create_opportunity(payload: OpportunityCreate):
    """Creates a new opportunity (referral/internship/mentorship/job/opensource). Requires verified alumni."""
    # UPDATED: added "job" and "opensource" to the allowed types.
    # Existing types are untouched so anything already posted keeps working.
    valid_types = {"referral", "internship", "mentorship", "job", "opensource"}
    if payload.type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type must be one of {valid_types}")

    _assert_alumni_verified(payload.alumni_id)

    try:
        result = supabase.table("opportunities").insert({
            "alumni_id": payload.alumni_id,
            "title": payload.title,
            "description": payload.description,
            "type": payload.type,
            "is_active": True
        }).execute()

        alumni_opps_cache.clear()
        return {"opportunity": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunities/browse")
async def browse_opportunities():
    """Lists all active opportunities with alumni poster info, for the student-facing board."""
    try:
        cache_key = "browse_all_opps"
        if cache_key in alumni_opps_cache:
            return {"opportunities": alumni_opps_cache[cache_key]}

        opps = supabase.table("opportunities").select("*").eq("is_active", True).order("created_at", desc=True).execute()

        enriched = []
        for opp in opps.data:
            alumnus = supabase.table("alumni").select("name, current_company, current_job_role").eq("id", opp["alumni_id"]).execute()
            enriched.append({
                **opp,
                "posted_by": alumnus.data[0] if alumnus.data else None
            })

        alumni_opps_cache[cache_key] = enriched
        return {"opportunities": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# NEW: Same-college Job / Open Source board (student-facing)
# ============================================================

@router.get("/opportunities/for-student/{student_id}")
async def get_opportunities_for_student(student_id: str):
    """Student-facing board of all active alumni-posted opportunities
    (referrals, internships, mentorships, jobs, and open source).
    Prioritizes opportunities from the student's own college alumni,
    while also including verified opportunities across the platform.
    """
    try:
        student = supabase.table("students").select("id, college_id").eq("id", student_id).execute()
        if not student.data:
            raise HTTPException(status_code=404, detail="Student profile not found")

        student_college_id = student.data[0].get("college_id")

        # Fetch all verified alumni
        verified_alumni = supabase.table("alumni").select(
            "id, name, current_company, current_job_role, linkedin_url, college_id"
        ).eq("is_verified", True).execute()
        
        if not verified_alumni.data:
            return {"opportunities": []}

        alumni_by_id = {a["id"]: a for a in verified_alumni.data}
        alumni_ids = list(alumni_by_id.keys())

        interest = supabase.table("opportunity_interest").select("*").eq("student_id", student_id).execute()
        interested_opp_map = {row["opportunity_id"]: row.get("status", "pending") for row in interest.data}
        
        # Merge memory interest in case DB hasn't caught up
        for (oid, sid), status in _MEM_INTEREST_STATUS.items():
            if sid == student_id:
                interested_opp_map[oid] = status

        # Fetch active opportunities from verified alumni OR opportunities the student has applied to
        opps = supabase.table("opportunities").select("*").in_("alumni_id", alumni_ids).order("created_at", desc=True).execute()

        enriched = []
        for opp in opps.data:
            is_interested = opp["id"] in interested_opp_map
            
            # Filter: only show if it's active OR the student has already applied
            if not is_interested and not opp.get("is_active"):
                continue
                
            alumnus = alumni_by_id.get(opp["alumni_id"])
            from_my_college = bool(student_college_id and alumnus and alumnus.get("college_id") == student_college_id)
            
            opp_data = {
                **opp,
                "posted_by": alumnus,
                "from_my_college": from_my_college,
                "already_interested": is_interested
            }
            if is_interested:
                # fall back to memory if DB status is None or missing
                db_status = interested_opp_map.get(opp["id"])
                mem_status = _MEM_INTEREST_STATUS.get((opp["id"], student_id))
                opp_data["status"] = mem_status or db_status or "pending"
                
            enriched.append(opp_data)

        # Sort so same-college opportunities appear at top

        enriched.sort(key=lambda x: (not x["from_my_college"], x.get("created_at", "")))

        return {"opportunities": enriched}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunities/mine/{alumni_id}")
async def get_my_opportunities(alumni_id: str):
    """Lists opportunities posted by a specific alumnus, with interested student counts."""
    try:
        opps = supabase.table("opportunities").select("*").eq("alumni_id", alumni_id).order("created_at", desc=True).execute()

        enriched = []
        for opp in opps.data:
            interest = supabase.table("opportunity_interest").select("id").eq("opportunity_id", opp["id"]).execute()
            enriched.append({
                **opp,
                "interested_count": len(interest.data)
            })

        return {"opportunities": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/opportunities/{opportunity_id}/deactivate")
async def deactivate_opportunity(opportunity_id: str):
    """Closes an opportunity so it no longer appears on the student board."""
    try:
        result = supabase.table("opportunities").update({"is_active": False}).eq("id", opportunity_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        return {"opportunity": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Student Interest (student-facing)
# ============================================================

@router.post("/opportunities/interest")
async def express_interest(payload: ExpressInterest):
    """Student expresses interest in an opportunity. Prevents duplicates
    via the UNIQUE(opportunity_id, student_id) constraint."""
    try:
        opp = supabase.table("opportunities").select("is_active").eq("id", payload.opportunity_id).execute()
        if not opp.data:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        if not opp.data[0]["is_active"]:
            raise HTTPException(status_code=400, detail="This opportunity is no longer active")

        existing = supabase.table("opportunity_interest").select("id").eq("opportunity_id", payload.opportunity_id).eq("student_id", payload.student_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="You have already applied or expressed interest in this opportunity")

        result = supabase.table("opportunity_interest").insert({
            "opportunity_id": payload.opportunity_id,
            "student_id": payload.student_id
        }).execute()

        return {"interest": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunities/{opportunity_id}/interested-students")
async def get_interested_students(opportunity_id: str):
    """Alumni-facing: lists students who expressed interest, with their full profile,
    hireability score, and verified skills breakdown."""
    try:
        interest = supabase.table("opportunity_interest").select("*").eq("opportunity_id", opportunity_id).order("expressed_at", desc=True).execute()

        if not interest.data:
            return {"interested_students": []}

        student_ids = [r["student_id"] for r in interest.data]

        students = supabase.table("students").select(
            "id, name, email, branch, year, phone, usn, github_url, linkedin_url, college_id"
        ).in_("id", student_ids).execute()
        student_by_id = {s["id"]: s for s in students.data}

        college_ids = list({s["college_id"] for s in students.data if s.get("college_id")})
        colleges = supabase.table("colleges").select("id, name").in_("id", college_ids).execute() if college_ids else None
        college_by_id = {c["id"]: c["name"] for c in colleges.data} if colleges and colleges.data else {}

        skills = supabase.table("student_skills").select("*").in_("student_id", student_ids).execute()
        skills_by_student = {}
        for skill in (skills.data or []):
            skills_by_student.setdefault(skill["student_id"], []).append(skill)

        enriched = []
        for record in interest.data:
            sid = record["student_id"]
            if sid not in student_by_id:
                continue
            
            student_info = student_by_id[sid]
            college_name = college_by_id.get(student_info.get("college_id"))
            student_skills = skills_by_student.get(sid, [])
            hireability = calculate_hireability_index(student_skills)

            enriched.append({
                "student": student_info,
                "skills": student_skills,
                "hireability": hireability,
                "college_name": college_name,
                "expressed_at": record.get("expressed_at"),
                "status": _MEM_INTEREST_STATUS.get((opportunity_id, sid)) or record.get("status") or "pending"
            })

        return {"interested_students": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/opportunities/{opportunity_id}/interested-students/{student_id}/status")
async def update_interest_status(opportunity_id: str, student_id: str, payload: UpdateStatus):
    """Update hiring pipeline status for an interested student."""
    try:
        new_status = payload.status
        if not new_status:
            raise HTTPException(status_code=400, detail="Missing status")
            
        try:
            res = supabase.table("opportunity_interest").update({"status": new_status}).eq("opportunity_id", opportunity_id).eq("student_id", student_id).execute()
        except Exception:
            pass # fallback to memory if column doesn't exist or network error
            
        _MEM_INTEREST_STATUS[(opportunity_id, student_id)] = new_status
        return {"success": True, "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# Messaging (Alumni <-> Student)
# ============================================================

@router.get("/opportunities/{opportunity_id}/messages/{student_id}")
async def get_alumni_messages(opportunity_id: str, student_id: str):
    """Fetch chat history between an alumni and a specific student for an opportunity."""
    try:
        res = supabase.table("alumni_messages").select("*").eq("opportunity_id", opportunity_id).eq("student_id", student_id).order("created_at", desc=True).execute()
        return {"messages": res.data[::-1]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/opportunities/{opportunity_id}/messages/{student_id}")
async def send_alumni_message(opportunity_id: str, student_id: str, payload: AlumniMessageCreate):
    """Send a message (works for both alumni and student)."""
    try:
        record = {
            "opportunity_id": opportunity_id,
            "student_id": student_id,
            "sender_type": payload.sender_type,
            "sender_id": payload.sender_id,
            "sender_name": payload.sender_name,
            "message": payload.message
        }
        res = supabase.table("alumni_messages").insert(record).execute()
        return {"message": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.delete('/messages/{message_id}')
async def delete_alumni_message(message_id: str):
    try:
        supabase.table('alumni_messages').delete().eq('id', message_id).execute()
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alumni/{alumni_id}/conversations")
async def get_alumni_conversations(alumni_id: str):
    """Fetch all active candidate conversations and message threads across all opportunities for an alumni."""
    try:
        opps_res = supabase.table("opportunities").select("id, title, type").eq("alumni_id", alumni_id).execute()
        opps = opps_res.data or []
        if not opps:
            return {"conversations": []}
            
        opp_map = {o["id"]: o for o in opps}
        opp_ids = list(opp_map.keys())

        # Fetch messages across all opportunities posted by this alumni
        msgs_res = supabase.table("alumni_messages").select("*").in_("opportunity_id", opp_ids).order("created_at", desc=True).execute()
        all_msgs = msgs_res.data or []

        # Also fetch interested students
        interests_res = supabase.table("opportunity_interest").select("opportunity_id, student_id, status, expressed_at, students(id, name, email)").in_("opportunity_id", opp_ids).execute()
        all_interests = interests_res.data or []

        student_info_map = {}
        for interest in all_interests:
            s = interest.get("students")
            if s and isinstance(s, dict):
                student_info_map[interest["student_id"]] = s

        # Group conversation threads by (opportunity_id, student_id)
        threads = {}
        for m in all_msgs:
            key = f"{m['opportunity_id']}_{m['student_id']}"
            if key not in threads:
                opp = opp_map.get(m["opportunity_id"], {})
                student_data = student_info_map.get(m["student_id"], {})
                threads[key] = {
                    "id": key,
                    "opportunity_id": m["opportunity_id"],
                    "opportunity_title": opp.get("title", "Opportunity"),
                    "opportunity_type": opp.get("type", "referral"),
                    "student_id": m["student_id"],
                    "student_name": student_data.get("name") or m.get("sender_name") or "Student Candidate",
                    "student_email": student_data.get("email") or "",
                    "last_message": m.get("message", ""),
                    "last_message_time": m.get("created_at"),
                    "last_sender_type": m.get("sender_type"),
                    "messages_count": 0,
                    "unread_count": 0
                }
            threads[key]["messages_count"] += 1
            if m.get("sender_type") == "student":
                threads[key]["unread_count"] += 1

        # Also add interested candidates who haven't messaged yet so alumni can initiate chat
        for item in all_interests:
            key = f"{item['opportunity_id']}_{item['student_id']}"
            if key not in threads:
                opp = opp_map.get(item["opportunity_id"], {})
                s = item.get("students") or {}
                threads[key] = {
                    "id": key,
                    "opportunity_id": item["opportunity_id"],
                    "opportunity_title": opp.get("title", "Opportunity"),
                    "opportunity_type": opp.get("type", "referral"),
                    "student_id": item["student_id"],
                    "student_name": s.get("name") or "Student Candidate",
                    "student_email": s.get("email") or "",
                    "last_message": f"Expressed interest in {opp.get('title', 'opportunity')}",
                    "last_message_time": item.get("expressed_at"),
                    "last_sender_type": "student",
                    "messages_count": 0,
                    "unread_count": 1
                }

        sorted_convos = sorted(threads.values(), key=lambda x: x["last_message_time"] or "", reverse=True)
        return {"conversations": sorted_convos}
    except Exception as e:
        print(f"Error fetching alumni conversations: {e}")
        return {"conversations": []}


from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import supabase

router = APIRouter()

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
        auth_response = supabase.auth.sign_in_with_password({
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

        return {"opportunity": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/opportunities/browse")
async def browse_opportunities():
    """Lists all active opportunities with alumni poster info, for the student-facing board.
    UNCHANGED — kept exactly as before, no college filter, all types."""
    try:
        opps = supabase.table("opportunities").select("*").eq("is_active", True).order("created_at", desc=True).execute()

        enriched = []
        for opp in opps.data:
            alumnus = supabase.table("alumni").select("name, current_company, current_job_role").eq("id", opp["alumni_id"]).execute()
            enriched.append({
                **opp,
                "posted_by": alumnus.data[0] if alumnus.data else None
            })

        return {"opportunities": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# NEW: Same-college Job / Open Source board (student-facing)
# ============================================================

@router.get("/opportunities/for-student/{student_id}")
async def get_opportunities_for_student(student_id: str):
    """Student-facing board of alumni-posted Job and Open Source opportunities,
    restricted to alumni from the SAME college as the student.

    Takes the student's primary students.id directly (matches how this app
    already stores it in localStorage and uses it elsewhere, e.g. applyToJob).
    """
    try:
        student = supabase.table("students").select("id, college_id").eq("id", student_id).execute()
        if not student.data:
            raise HTTPException(status_code=404, detail="Student profile not found")

        college_id = student.data[0]["college_id"]

        college_alumni = supabase.table("alumni").select("id, name, current_company, current_job_role, linkedin_url").eq("college_id", college_id).execute()
        alumni_ids = [a["id"] for a in college_alumni.data]
        alumni_by_id = {a["id"]: a for a in college_alumni.data}

        if not alumni_ids:
            return {"opportunities": []}

        opps = supabase.table("opportunities").select("*") \
            .in_("alumni_id", alumni_ids) \
            .in_("type", ["job", "opensource"]) \
            .eq("is_active", True) \
            .order("created_at", desc=True) \
            .execute()

        interest = supabase.table("opportunity_interest").select("opportunity_id").eq("student_id", student_id).execute()
        interested_opp_ids = {row["opportunity_id"] for row in interest.data}

        enriched = []
        for opp in opps.data:
            enriched.append({
                **opp,
                "posted_by": alumni_by_id.get(opp["alumni_id"]),
                "already_interested": opp["id"] in interested_opp_ids
            })

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
            raise HTTPException(status_code=400, detail="You have already expressed interest in this opportunity")

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
    """Alumni-facing: lists students who expressed interest, with their skill profile."""
    try:
        interest = supabase.table("opportunity_interest").select("*").eq("opportunity_id", opportunity_id).execute()

        enriched = []
        for record in interest.data:
            student = supabase.table("students").select("id, name, email, branch, year, github_url").eq("id", record["student_id"]).execute()
            if not student.data:
                continue
            skills = supabase.table("student_skills").select("skill_name, verification_level").eq("student_id", record["student_id"]).execute()

            enriched.append({
                "student": student.data[0],
                "skills": skills.data,
                "expressed_at": record["expressed_at"]
            })

        return {"interested_students": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
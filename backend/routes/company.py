from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import supabase

router = APIRouter()

# ============================================================
# Pydantic Models
# ============================================================

class CompanyRegister(BaseModel):
    name: str
    website: Optional[str] = None
    industry: Optional[str] = None

class RecruiterRegister(BaseModel):
    company_id: str
    name: str
    email: str
    password: str
    role_title: Optional[str] = None

class RecruiterLogin(BaseModel):
    email: str
    password: str

class JobCreate(BaseModel):
    recruiter_id: str
    title: str
    description: Optional[str] = None
    required_skills: List[str] = []
    location: Optional[str] = None
    ctc: Optional[str] = None
    deadline: Optional[str] = None  # ISO date string, e.g. "2026-12-31"

class ApplicationStatusUpdate(BaseModel):
    status: str  # 'applied' | 'shortlisted' | 'rejected' | 'hired'


# ============================================================
# Company Registration
# ============================================================

@router.post("/register")
async def register_company(payload: CompanyRegister):
    """Registers a new company. Starts unverified (is_verified = False)
    until an admin approves it via the admin panel."""
    try:
        existing = supabase.table("companies").select("id").ilike("name", payload.name).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="A company with this name is already registered")

        result = supabase.table("companies").insert({
            "name": payload.name,
            "website": payload.website,
            "industry": payload.industry,
            "is_verified": False
        }).execute()

        return {"company": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_companies(q: str):
    """Autocomplete search for companies, mirrors routes/colleges.py pattern."""
    try:
        response = supabase.table("companies").select("id, name, industry, is_verified").ilike("name", f"%{q}%").execute()
        return {"results": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Recruiter Registration & Login
# (mirrors routes/auth.py's register_student / login_student pattern exactly)
# ============================================================

@router.post("/recruiter/register")
async def register_recruiter(payload: RecruiterRegister):
    """Registers a recruiter under an existing company.
    Creates the Supabase Auth user server-side, same pattern as student registration."""
    try:
        company = supabase.table("companies").select("id").eq("id", payload.company_id).execute()
        if not company.data:
            raise HTTPException(status_code=404, detail="Company not found")

        existing = supabase.table("recruiters").select("id").eq("email", payload.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="A recruiter with this email already exists")

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

        # 2. Insert into public.recruiters
        result = supabase.table("recruiters").insert({
            "auth_id": user_id,
            "company_id": payload.company_id,
            "name": payload.name,
            "email": payload.email,
            "role_title": payload.role_title
        }).execute()

        return {"message": "Registration successful", "recruiter": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recruiter/login")
async def login_recruiter(payload: RecruiterLogin):
    """Logs in a recruiter. Same pattern as login_student in routes/auth.py."""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Invalid credentials")

        user_id = auth_response.user.id

        recruiter_response = supabase.table("recruiters").select("*").eq("auth_id", user_id).execute()
        if not recruiter_response.data:
            raise HTTPException(status_code=404, detail="Recruiter profile not found")

        recruiter_data = recruiter_response.data[0]
        company = supabase.table("companies").select("*").eq("id", recruiter_data["company_id"]).execute()

        return {
            "message": "Login successful",
            "recruiter": recruiter_data,
            "company": company.data[0] if company.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password.")


@router.get("/recruiter/me/{auth_id}")
async def get_recruiter_profile(auth_id: str):
    """Fetches the recruiter's own profile plus their company's verification status."""
    try:
        recruiter = supabase.table("recruiters").select("*").eq("auth_id", auth_id).execute()
        if not recruiter.data:
            raise HTTPException(status_code=404, detail="Recruiter profile not found")

        recruiter_data = recruiter.data[0]
        company = supabase.table("companies").select("*").eq("id", recruiter_data["company_id"]).execute()

        return {
            "recruiter": recruiter_data,
            "company": company.data[0] if company.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Job Posting (recruiter-facing)
# ============================================================

def _assert_recruiter_can_post(recruiter_id: str):
    """Blocks job posting unless the recruiter's company is verified.
    This is the trust-layer gate described in the ecosystem logic."""
    recruiter = supabase.table("recruiters").select("company_id").eq("id", recruiter_id).execute()
    if not recruiter.data:
        raise HTTPException(status_code=404, detail="Recruiter not found")

    company_id = recruiter.data[0]["company_id"]
    company = supabase.table("companies").select("is_verified").eq("id", company_id).execute()
    if not company.data or not company.data[0]["is_verified"]:
        raise HTTPException(status_code=403, detail="Your company is not yet verified. Please wait for admin approval.")


@router.post("/jobs")
async def create_job(payload: JobCreate):
    """Creates a new job posting. Requires the recruiter's company to be verified."""
    try:
        _assert_recruiter_can_post(payload.recruiter_id)

        result = supabase.table("jobs").insert({
            "recruiter_id": payload.recruiter_id,
            "title": payload.title,
            "description": payload.description,
            "required_skills": payload.required_skills,
            "location": payload.location,
            "ctc": payload.ctc,
            "deadline": payload.deadline,
            "is_active": True
        }).execute()

        return {"job": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/mine/{recruiter_id}")
async def get_my_jobs(recruiter_id: str):
    """Lists all jobs posted by a specific recruiter."""
    try:
        result = supabase.table("jobs").select("*").eq("recruiter_id", recruiter_id).order("created_at", desc=True).execute()
        return {"jobs": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/jobs/{job_id}/deactivate")
async def deactivate_job(job_id: str):
    """Closes a job posting so it no longer appears in student browse view."""
    try:
        result = supabase.table("jobs").update({"is_active": False}).eq("id", job_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Job not found")
        return {"job": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Applicants (recruiter-facing view of who applied)
# ============================================================

@router.get("/jobs/{job_id}/applicants")
async def get_applicants(job_id: str):
    """Lists all students who applied to a given job, with their skill profile,
    sorted by number of matched required skills (simple eligibility ranking)."""
    try:
        job = supabase.table("jobs").select("required_skills").eq("id", job_id).execute()
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")
        required_skills = set(s.lower() for s in (job.data[0]["required_skills"] or []))

        applications = supabase.table("applications").select("*").eq("job_id", job_id).execute()

        enriched = []
        for app in applications.data:
            student = supabase.table("students").select("id, name, email, branch, year, github_url").eq("id", app["student_id"]).execute()
            if not student.data:
                continue
            student_data = student.data[0]

            skills = supabase.table("student_skills").select("skill_name, verification_level, skill_score").eq("student_id", app["student_id"]).execute()
            student_skill_names = set(s["skill_name"].lower() for s in skills.data)

            matched = required_skills.intersection(student_skill_names)
            match_percentage = round((len(matched) / len(required_skills) * 100), 1) if required_skills else 0

            enriched.append({
                "application_id": app["id"],
                "status": app["status"],
                "applied_at": app["applied_at"],
                "student": student_data,
                "skills": skills.data,
                "matched_skills": list(matched),
                "match_percentage": match_percentage
            })

        enriched.sort(key=lambda x: x["match_percentage"], reverse=True)
        return {"applicants": enriched}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/applications/{application_id}/status")
async def update_application_status(application_id: str, payload: ApplicationStatusUpdate):
    """Recruiter updates an applicant's status (shortlisted / rejected / hired)."""
    valid_statuses = {"applied", "shortlisted", "rejected", "hired"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    try:
        result = supabase.table("applications").update({"status": payload.status}).eq("id", application_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Application not found")
        return {"application": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
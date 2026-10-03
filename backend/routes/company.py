from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from database import supabase
from services.hireability import calculate_hireability_index

router = APIRouter()

# ============================================================
# Pydantic Models
# ============================================================

class CompanyRegister(BaseModel):
    name: str
    email: str
    password: str
    industry: Optional[str] = None
    website: Optional[str] = None

class CompanyLogin(BaseModel):
    email: str
    password: str

class RequiredSkill(BaseModel):
    skill_name: str
    level: int

class JobPostingCreate(BaseModel):
    title: str
    description: str
    required_skills: List[RequiredSkill]

class JobApplicationCreate(BaseModel):
    student_id: str
    resume_url: str
    cover_letter: Optional[str] = None

# ============================================================
# Auth & Registration
# ============================================================

@router.post("/register")
async def register_company(payload: CompanyRegister):
    try:
        # Check if exists
        existing = supabase.table("companies").select("id").eq("name", payload.name).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="A company with this name already exists")

        # 1. Register with Supabase Auth
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
            raise HTTPException(status_code=400, detail="Failed to create Auth User")

        # 2. Insert into public.companies
        comp_res = supabase.table("companies").insert({
            "name": payload.name,
            "industry": payload.industry,
            "website": payload.website,
            "is_verified": True
        }).execute()

        if not comp_res.data:
            raise HTTPException(status_code=500, detail="Failed to create company record")
            
        company_id = comp_res.data[0]["id"]
        
        # 3. Insert into public.recruiters
        rec_res = supabase.table("recruiters").insert({
            "auth_id": user_id,
            "company_id": company_id,
            "name": "Admin",
            "email": payload.email
        }).execute()

        return {"message": "Registration successful", "company": comp_res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login")
async def login_company(payload: CompanyLogin):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Fetch recruiter profile
        recruiter = supabase.table("recruiters").select("*").eq("auth_id", user.id).execute()
        if not recruiter.data:
            fallback = supabase.table("recruiters").select("*").eq("email", payload.email).execute()
            if fallback.data:
                rec_official = fallback.data[0]
                supabase.table("recruiters").update({"auth_id": user.id}).eq("id", rec_official["id"]).execute()
                rec_official["auth_id"] = user.id
                recruiter.data = [rec_official]
            else:
                raise HTTPException(status_code=403, detail="User is not registered as a Recruiter")
            
        # Fetch company profile
        profile = supabase.table("companies").select("*").eq("id", recruiter.data[0]["company_id"]).execute()
        if not profile.data:
            raise HTTPException(status_code=403, detail="Company profile not found")

        return {
            "access_token": response.session.access_token,
            "company": profile.data[0],
            "auth_id": user.id
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


def _assert_company(auth_id: str):
    recruiter = supabase.table("recruiters").select("*").eq("auth_id", auth_id).execute()
    if not recruiter.data:
        raise HTTPException(status_code=403, detail="Unauthorized. Not a recognized recruiter.")
        
    profile = supabase.table("companies").select("*").eq("id", recruiter.data[0]["company_id"]).execute()
    if not profile.data:
        raise HTTPException(status_code=403, detail="Unauthorized. Company not found.")
    return profile.data[0]


# ============================================================
# Company ATS Endpoints
# ============================================================

@router.post("/jobs/{auth_id}")
async def post_job(auth_id: str, payload: JobPostingCreate):
    company = _assert_company(auth_id)
    try:
        result = supabase.table("job_postings").insert({
            "company_id": company["id"],
            "title": payload.title,
            "description": payload.description,
            "required_skills": [s.dict() for s in payload.required_skills],
            "status": "open"
        }).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{auth_id}")
async def get_company_jobs(auth_id: str):
    company = _assert_company(auth_id)
    try:
        jobs = supabase.table("job_postings").select("*, job_applications(count)").eq("company_id", company["id"]).order("created_at", desc=True).execute()
        return {"jobs": jobs.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{auth_id}/{job_id}/applicants")
async def get_job_applicants(auth_id: str, job_id: str):
    company = _assert_company(auth_id)
    try:
        # Verify job belongs to company
        job = supabase.table("job_postings").select("id").eq("id", job_id).eq("company_id", company["id"]).execute()
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")

        # Fetch applications for this job
        apps = supabase.table("job_applications").select("*").eq("job_id", job_id).order("match_score", desc=True).execute()

        enriched = []
        for app in apps.data:
            student_req = supabase.table("students").select(
                "id, name, email, phone, branch, year, usn, github_url, linkedin_url, college_id"
            ).eq("id", app["student_id"]).execute()
            student_data = student_req.data[0] if student_req.data else None

            skills_req = supabase.table("student_skills").select("*").eq("student_id", app["student_id"]).execute()
            student_skills = skills_req.data or []

            hireability = calculate_hireability_index(student_skills)

            college_name = None
            if student_data and student_data.get("college_id"):
                coll = supabase.table("colleges").select("name").eq("id", student_data["college_id"]).execute()
                if coll.data:
                    college_name = coll.data[0]["name"]

            enriched.append({
                **app,
                "student": student_data,
                "students": student_data,  # backward compatibility for existing UI references
                "college_name": college_name,
                "skills": student_skills,
                "hireability": hireability
            })

        return {"applicants": enriched}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/applications/{auth_id}/{app_id}/status")
async def update_application_status(auth_id: str, app_id: str, status: str):
    company = _assert_company(auth_id)
    try:
        if status not in ['applied', 'shortlisted', 'rejected', 'hired']:
            raise HTTPException(status_code=400, detail="Invalid status")
            
        # Verify application belongs to a job posted by this company
        app = supabase.table("job_applications").select("job_id").eq("id", app_id).execute()
        if not app.data:
            raise HTTPException(status_code=404, detail="Application not found")
            
        job = supabase.table("job_postings").select("id").eq("id", app.data[0]["job_id"]).eq("company_id", company["id"]).execute()
        if not job.data:
            raise HTTPException(status_code=403, detail="Unauthorized")

        result = supabase.table("job_applications").update({"status": status}).eq("id", app_id).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/{auth_id}")
async def get_company_dashboard(auth_id: str):
    company = _assert_company(auth_id)
    try:
        jobs = supabase.table("job_postings").select("id, status").eq("company_id", company["id"]).execute()
        job_ids = [j["id"] for j in jobs.data]
        
        apps = []
        if job_ids:
            apps_req = supabase.table("job_applications").select("status").in_("job_id", job_ids).execute()
            apps = apps_req.data

        return {
            "company": company,
            "active_jobs": len([j for j in jobs.data if j["status"] == "open"]),
            "total_applications": len(apps),
            "shortlisted": len([a for a in apps if a["status"] == "shortlisted"]),
            "hired": len([a for a in apps if a["status"] == "hired"])
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Student Endpoints (Matching Engine)
# ============================================================

def _calculate_match_score(student_skills: list, required_skills: list) -> int:
    if not required_skills:
        return 100
        
    student_skill_map = {s["skill_name"].lower(): s.get("verification_level", 1) for s in student_skills}
    
    total_weight = 0
    earned_weight = 0
    
    for req in required_skills:
        name = req.get("skill_name", "").lower()
        level_needed = req.get("level", 1)
        
        weight = level_needed * 10
        total_weight += weight
        
        if name in student_skill_map:
            student_level = student_skill_map[name]
            # Full points if they meet or exceed level
            if student_level >= level_needed:
                earned_weight += weight
            else:
                # Partial points
                earned_weight += (weight * (student_level / level_needed))
                
    if total_weight == 0:
        return 100
        
    score = int((earned_weight / total_weight) * 100)
    return min(100, score)

@router.get("/student/jobs/all")
async def get_all_jobs():
    try:
        jobs = supabase.table("job_postings").select("*, companies(name)").eq("status", "open").order("created_at", desc=True).execute()
        return {"jobs": jobs.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/jobs/eligible/{student_id}")
async def get_eligible_jobs(student_id: str):
    """The Intelligent Matching Engine."""
    try:
        # 1. Fetch student skills
        skills_req = supabase.table("student_skills").select("*").eq("student_id", student_id).execute()
        student_skills = skills_req.data

        # 2. Fetch all open jobs
        jobs_req = supabase.table("job_postings").select("*, companies(name)").eq("status", "open").execute()
        
        # 3. Calculate match score for each job
        eligible_jobs = []
        for job in jobs_req.data:
            score = _calculate_match_score(student_skills, job.get("required_skills", []))
            job["match_score"] = score
            if score >= 50: # Threshold for eligibility
                eligible_jobs.append(job)
                
        # Sort by match score desc
        eligible_jobs.sort(key=lambda x: x["match_score"], reverse=True)
        return {"jobs": eligible_jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/student/jobs/{job_id}/apply")
async def apply_to_job(job_id: str, payload: JobApplicationCreate):
    try:
        # Calculate match score again for the application record
        job = supabase.table("job_postings").select("required_skills").eq("id", job_id).execute()
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")
            
        skills_req = supabase.table("student_skills").select("*").eq("student_id", payload.student_id).execute()
        score = _calculate_match_score(skills_req.data, job.data[0].get("required_skills", []))

        result = supabase.table("job_applications").insert({
            "job_id": job_id,
            "student_id": payload.student_id,
            "resume_url": payload.resume_url,
            "cover_letter": payload.cover_letter,
            "match_score": score,
            "status": "applied"
        }).execute()

        return {"message": "Application submitted successfully!", "application": result.data[0]}
    except Exception as e:
        if "duplicate key value" in str(e):
            raise HTTPException(status_code=400, detail="You have already applied for this job.")
        raise HTTPException(status_code=500, detail=str(e))
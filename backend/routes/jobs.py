from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter()

# ============================================================
# Pydantic Models
# ============================================================

class ApplyToJob(BaseModel):
    job_id: str
    student_id: str


# ============================================================
# Browse Jobs (student-facing)
# ============================================================

@router.get("/browse")
async def browse_jobs():
    """Lists all active jobs with their company name, for the student job board."""
    try:
        jobs_res = supabase.table("jobs").select("*").eq("is_active", True).order("created_at", desc=True).execute()

        enriched = []
        for job in jobs_res.data:
            recruiter = supabase.table("recruiters").select("company_id").eq("id", job["recruiter_id"]).execute()
            company_name = None
            if recruiter.data:
                company = supabase.table("companies").select("name, is_verified").eq("id", recruiter.data[0]["company_id"]).execute()
                if company.data:
                    company_name = company.data[0]["name"]

            enriched.append({
                **job,
                "company_name": company_name
            })

        return {"jobs": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}")
async def get_job_detail(job_id: str):
    """Fetches full detail for a single job posting."""
    try:
        job = supabase.table("jobs").select("*").eq("id", job_id).execute()
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")

        job_data = job.data[0]
        recruiter = supabase.table("recruiters").select("company_id, name").eq("id", job_data["recruiter_id"]).execute()
        company_data = None
        if recruiter.data:
            company = supabase.table("companies").select("name, website, industry").eq("id", recruiter.data[0]["company_id"]).execute()
            if company.data:
                company_data = company.data[0]

        return {"job": job_data, "company": company_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Eligibility Check (before applying)
# ============================================================

@router.get("/{job_id}/eligibility/{student_id}")
async def check_eligibility(job_id: str, student_id: str):
    """Compares the student's verified skills against the job's required_skills
    and returns a match percentage, so they can see fit before applying."""
    try:
        job = supabase.table("jobs").select("required_skills").eq("id", job_id).execute()
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")

        required_skills = set(s.lower() for s in (job.data[0]["required_skills"] or []))
        if not required_skills:
            return {"match_percentage": 100.0, "matched_skills": [], "missing_skills": []}

        skills = supabase.table("student_skills").select("skill_name, verification_level").eq("student_id", student_id).execute()
        student_skill_names = set(s["skill_name"].lower() for s in skills.data)

        matched = required_skills.intersection(student_skill_names)
        missing = required_skills.difference(student_skill_names)
        match_percentage = round((len(matched) / len(required_skills) * 100), 1)

        return {
            "match_percentage": match_percentage,
            "matched_skills": list(matched),
            "missing_skills": list(missing)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Apply to a Job (student-facing)
# ============================================================

@router.post("/apply")
async def apply_to_job(payload: ApplyToJob):
    """Student applies to a job. Prevents duplicate applications
    via the UNIQUE(job_id, student_id) constraint on the applications table."""
    try:
        job = supabase.table("jobs").select("is_active").eq("id", payload.job_id).execute()
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")
        if not job.data[0]["is_active"]:
            raise HTTPException(status_code=400, detail="This job is no longer accepting applications")

        existing = supabase.table("applications").select("id").eq("job_id", payload.job_id).eq("student_id", payload.student_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="You have already applied to this job")

        result = supabase.table("applications").insert({
            "job_id": payload.job_id,
            "student_id": payload.student_id,
            "status": "applied"
        }).execute()

        return {"application": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# My Applications (student-facing)
# ============================================================

@router.get("/applications/mine/{student_id}")
async def get_my_applications(student_id: str):
    """Lists all jobs a student has applied to, with current status."""
    try:
        applications = supabase.table("applications").select("*").eq("student_id", student_id).order("applied_at", desc=True).execute()

        enriched = []
        for app in applications.data:
            job = supabase.table("jobs").select("title, location, ctc, is_active").eq("id", app["job_id"]).execute()
            enriched.append({
                **app,
                "job": job.data[0] if job.data else None
            })

        return {"applications": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
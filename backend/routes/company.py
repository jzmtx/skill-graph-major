from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
from database import supabase, create_auth_client
from services.hireability import calculate_hireability_index
from cachetools import TTLCache

router = APIRouter()

# Global cache for jobs list (5 minutes TTL, up to 100 items)
jobs_cache = TTLCache(maxsize=100, ttl=300)

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
    vacancies: Optional[int] = 1
    max_shortlist_count: Optional[int] = None
    deadline: Optional[str] = None

class JobApplicationCreate(BaseModel):
    student_id: str
    resume_url: str
    cover_letter: Optional[str] = None

class CompanyMessageCreate(BaseModel):
    sender_type: str
    sender_id: str
    sender_name: str
    message: str

class CompanyAssessmentCreate(BaseModel):
    assessment_link: str
    guidelines: Optional[str] = None

class CompanyAssessmentResult(BaseModel):
    company_result: str

class StudentAssessmentStatusUpdate(BaseModel):
    student_status: str

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
        auth_client = create_auth_client()
        response = auth_client.auth.sign_in_with_password({
            "email": payload.email.strip(),
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

def _extract_job_meta(job: dict) -> dict:
    """Extracts vacancies, max_shortlist_count, deadline from JSONB metadata and returns cleaned job dict."""
    skills = job.get("required_skills") or []
    meta = None
    clean_skills = []
    for s in skills:
        if isinstance(s, dict) and "_meta" in s:
            if isinstance(s["_meta"], dict):
                meta = s["_meta"]
            else:
                meta = s
        else:
            clean_skills.append(s)
            
    vacancies = int(meta.get("vacancies", 1)) if meta and meta.get("vacancies") is not None else int(job.get("vacancies") or 1)
    default_shortlist = vacancies * 2
    max_shortlist = int(meta.get("max_shortlist_count", default_shortlist)) if meta and meta.get("max_shortlist_count") is not None else int(job.get("max_shortlist_count") or default_shortlist)
    deadline = (meta.get("deadline") or job.get("deadline") or "") if meta else (job.get("deadline") or "")
    
    is_deadline_passed = False
    if deadline:
        try:
            d_str = str(deadline).strip()
            if "T" in d_str:
                d_time = datetime.fromisoformat(d_str.replace("Z", "+00:00"))
            else:
                d_time = datetime.strptime(d_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            if now > d_time:
                is_deadline_passed = True
        except Exception:
            pass
            
    job_copy = dict(job)
    job_copy["required_skills"] = clean_skills
    job_copy["vacancies"] = vacancies
    job_copy["max_shortlist_count"] = max_shortlist
    job_copy["deadline"] = deadline
    job_copy["is_deadline_passed"] = is_deadline_passed
    return job_copy

@router.post("/jobs/{auth_id}")
async def post_job(auth_id: str, payload: JobPostingCreate):
    company = _assert_company(auth_id)
    try:
        vacancies = payload.vacancies or 1
        max_shortlist = payload.max_shortlist_count if payload.max_shortlist_count is not None else (vacancies * 2)
        deadline = payload.deadline or ""
        
        # Build skills list with embedded metadata entry
        skills_payload = [s.dict() for s in payload.required_skills]
        skills_payload.append({
            "_meta": True,
            "vacancies": vacancies,
            "max_shortlist_count": max_shortlist,
            "deadline": deadline
        })

        result = supabase.table("job_postings").insert({
            "company_id": company["id"],
            "title": payload.title,
            "description": payload.description,
            "required_skills": skills_payload,
            "status": "open"
        }).execute()
        
        # Invalidate jobs cache when a new job is posted
        if "all_open_jobs" in jobs_cache:
            del jobs_cache["all_open_jobs"]
            
        return _extract_job_meta(result.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{auth_id}")
async def get_company_jobs(auth_id: str):
    company = _assert_company(auth_id)
    try:
        jobs = supabase.table("job_postings").select("*, job_applications(count)").eq("company_id", company["id"]).order("created_at", desc=True).execute()
        enriched = [_extract_job_meta(j) for j in jobs.data]
        return {"jobs": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{auth_id}/{job_id}/applicants")
async def get_job_applicants(auth_id: str, job_id: str):
    company = _assert_company(auth_id)
    try:
        # Verify job belongs to company
        job_res = supabase.table("job_postings").select("*").eq("id", job_id).eq("company_id", company["id"]).execute()
        if not job_res.data:
            raise HTTPException(status_code=404, detail="Job not found")
        job_meta = _extract_job_meta(job_res.data[0])

        # Fetch applications with joined students for this job
        apps = supabase.table("job_applications").select("*, students(*)").eq("job_id", job_id).order("match_score", desc=True).execute()

        if not apps.data:
            return {"applicants": [], "job": job_meta}

        # If registration has closed, auto-shortlist the top candidates if not already done
        max_shortlist = job_meta.get("max_shortlist_count", 2)
        if job_meta.get("is_deadline_passed") and apps.data:
            shortlisted_any = any(a.get("status") in ["shortlisted", "hired"] for a in apps.data)
            if not shortlisted_any:
                top_apps = apps.data[:max_shortlist]
                for a in top_apps:
                    supabase.table("job_applications").update({"status": "shortlisted"}).eq("id", a["id"]).execute()
                    a["status"] = "shortlisted"

        student_ids = list(set([str(app["student_id"]) for app in apps.data if app.get("student_id")]))

        # Bulk fetch student skills
        skills_res = supabase.table("student_skills").select("*").in_("student_id", student_ids).execute()
        skills_map = {}
        for skill in skills_res.data:
            sid = str(skill["student_id"])
            if sid not in skills_map:
                skills_map[sid] = []
            skills_map[sid].append(skill)

        # Bulk fetch colleges
        college_ids = list(set([
            app.get("students", {}).get("college_id") for app in apps.data 
            if isinstance(app.get("students"), dict) and app["students"].get("college_id")
        ]))
        colleges_map = {}
        if college_ids:
            colleges_res = supabase.table("colleges").select("id, name").in_("id", college_ids).execute()
            colleges_map = {c["id"]: c["name"] for c in colleges_res.data}

        enriched = []
        for app in apps.data:
            sid = str(app["student_id"])
            student_data = app.get("students") or {"id": sid, "name": "Applicant", "email": ""}
            student_skills = skills_map.get(sid, [])
            
            hireability = calculate_hireability_index(student_skills)
            
            college_name = None
            if isinstance(student_data, dict) and student_data.get("college_id"):
                college_name = colleges_map.get(student_data["college_id"])

            enriched.append({
                **app,
                "student": student_data,
                "students": student_data,  # backward compatibility for existing UI references
                "college_name": college_name,
                "skills": student_skills,
                "hireability": hireability
            })

        return {"applicants": enriched, "job": job_meta}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/{auth_id}/{job_id}/auto-shortlist")
async def auto_shortlist_job(auth_id: str, job_id: str):
    company = _assert_company(auth_id)
    try:
        job_res = supabase.table("job_postings").select("*").eq("id", job_id).eq("company_id", company["id"]).execute()
        if not job_res.data:
            raise HTTPException(status_code=404, detail="Job not found")
        job_meta = _extract_job_meta(job_res.data[0])
        max_shortlist = job_meta.get("max_shortlist_count", 2)

        apps = supabase.table("job_applications").select("*").eq("job_id", job_id).order("match_score", desc=True).execute()
        if not apps.data:
            return {"message": "No applicants to shortlist", "shortlisted_count": 0}

        shortlisted_count = 0
        for i, a in enumerate(apps.data):
            if i < max_shortlist:
                if a.get("status") in ["applied", "shortlisted"]:
                    supabase.table("job_applications").update({"status": "shortlisted"}).eq("id", a["id"]).execute()
                    shortlisted_count += 1

        return {
            "message": f"AI ATS Screening shortlisted top {min(len(apps.data), max_shortlist)} applicants based on score.",
            "vacancies": job_meta.get("vacancies", 1),
            "max_shortlist_count": max_shortlist,
            "shortlisted_count": shortlisted_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
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
        
        status_msg = f"Your application status has been updated to: **{status.capitalize()}**"
        supabase.table("company_messages").insert({
            "application_id": app_id,
            "sender_type": "company",
            "sender_id": company["id"],
            "sender_name": company["name"],
            "message": status_msg
        }).execute()
        
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
# Messaging Endpoints
# ============================================================

@router.get("/applications/{app_id}/messages")
async def get_application_messages(app_id: str):
    try:
        print(f"DEBUG: get_application_messages called for app_id: {app_id}")
        messages = supabase.table("company_messages").select("*").eq("application_id", app_id).order("created_at", desc=False).execute()
        print(f"DEBUG: returning {len(messages.data)} messages")
        return messages.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/applications/{app_id}/messages")
async def send_application_message(app_id: str, payload: CompanyMessageCreate):
    try:
        result = supabase.table("company_messages").insert({
            "application_id": app_id,
            "sender_type": payload.sender_type,
            "sender_id": payload.sender_id,
            "sender_name": payload.sender_name,
            "message": payload.message
        }).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Assessment Endpoints
# ============================================================

@router.get("/applications/{app_id}/assessment")
async def get_application_assessment(app_id: str):
    try:
        assmt = supabase.table("company_assessments").select("*").eq("application_id", app_id).execute()
        return assmt.data[0] if assmt.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/applications/{app_id}/assessment")
async def assign_application_assessment(app_id: str, payload: CompanyAssessmentCreate):
    try:
        # Check if one already exists
        existing = supabase.table("company_assessments").select("*").eq("application_id", app_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Assessment already assigned to this application")
            
        result = supabase.table("company_assessments").insert({
            "application_id": app_id,
            "assessment_link": payload.assessment_link,
            "guidelines": payload.guidelines,
            "student_status": "pending"
        }).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/applications/{app_id}/assessment/student")
async def update_assessment_student_status(app_id: str, payload: StudentAssessmentStatusUpdate):
    try:
        if payload.student_status not in ["pending", "accepted", "completed", "declined"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        result = supabase.table("company_assessments").update({
            "student_status": payload.student_status
        }).eq("application_id", app_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Assessment not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/applications/{app_id}/assessment/result")
async def update_assessment_company_result(app_id: str, payload: CompanyAssessmentResult):
    try:
        result = supabase.table("company_assessments").update({
            "company_result": payload.company_result
        }).eq("application_id", app_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Assessment not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
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
async def get_all_jobs(student_id: Optional[str] = None):
    try:
        jobs = supabase.table("job_postings").select("*, companies(name)").eq("status", "open").order("created_at", desc=True).execute()
        
        student_skills = []
        if student_id:
            skills_req = supabase.table("student_skills").select("*").eq("student_id", student_id).execute()
            student_skills = skills_req.data or []

        enriched = []
        for j in jobs.data:
            j_meta = _extract_job_meta(j)
            clean_reqs = j_meta.get("required_skills", [])
            
            if student_id:
                score = _calculate_match_score(student_skills, clean_reqs)
                j_meta["match_score"] = score
                # Student is eligible only if match_score >= 50
                j_meta["is_eligible"] = bool(score >= 50)
                
                # Check which requirements are missing
                missing = []
                st_map = {s["skill_name"].lower(): s.get("verification_level", 0) for s in student_skills}
                for req in clean_reqs:
                    r_name = req.get("skill_name", "")
                    r_lvl = req.get("level", 1)
                    cand_lvl = st_map.get(r_name.lower(), 0)
                    if cand_lvl < r_lvl:
                        missing.append(f"{r_name} (Requires Level {r_lvl}, You: Level {cand_lvl})")
                j_meta["missing_requirements"] = missing
            else:
                j_meta["match_score"] = 0
                j_meta["is_eligible"] = True
                j_meta["missing_requirements"] = []

            enriched.append(j_meta)

        return {"jobs": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/jobs/applied/{student_id}")
async def get_student_applications(student_id: str):
    try:
        # Get all applications for this student
        apps = supabase.table("job_applications").select("*").eq("student_id", student_id).execute()
        
        if not apps.data:
            return {"applications": []}
            
        # Fetch job postings and companies manually to avoid relation issues
        job_ids = list(set([app["job_id"] for app in apps.data]))
        jobs_res = supabase.table("job_postings").select("id, title, company_id, required_skills").in_("id", job_ids).execute()
        jobs_map = {job["id"]: _extract_job_meta(job) for job in jobs_res.data}
        
        company_ids = list(set([job["company_id"] for job in jobs_res.data if job.get("company_id")]))
        companies_map = {}
        if company_ids:
            comp_res = supabase.table("companies").select("id, name").in_("id", company_ids).execute()
            companies_map = {c["id"]: c["name"] for c in comp_res.data}
            
        enriched_apps = []
        for app in apps.data:
            job = jobs_map.get(app["job_id"])
            if job:
                comp_name = companies_map.get(job.get("company_id"))
                app["job_postings"] = {
                    "title": job["title"],
                    "vacancies": job.get("vacancies", 1),
                    "deadline": job.get("deadline", ""),
                    "is_deadline_passed": job.get("is_deadline_passed", False),
                    "companies": {"name": comp_name} if comp_name else None
                }
            else:
                app["job_postings"] = None
            enriched_apps.append(app)
            
        return {"applications": enriched_apps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/jobs/eligible/{student_id}")
async def get_eligible_jobs(student_id: str):
    """The Intelligent Matching Engine."""
    try:
        # 1. Fetch student skills
        skills_req = supabase.table("student_skills").select("*").eq("student_id", student_id).execute()
        student_skills = skills_req.data or []

        # 2. Fetch all open jobs
        jobs_req = supabase.table("job_postings").select("*, companies(name)").eq("status", "open").execute()
        
        # 3. Calculate match score and filter by eligibility
        eligible_jobs = []
        for job in jobs_req.data:
            j_meta = _extract_job_meta(job)
            clean_reqs = j_meta.get("required_skills", [])
            score = _calculate_match_score(student_skills, clean_reqs)
            j_meta["match_score"] = score
            j_meta["is_eligible"] = bool(score >= 50)
            
            if score >= 50: # Threshold for eligibility
                eligible_jobs.append(j_meta)
                
        # Sort by match score desc
        eligible_jobs.sort(key=lambda x: x["match_score"], reverse=True)
        return {"jobs": eligible_jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/student/jobs/{job_id}/apply")
async def apply_to_job(job_id: str, payload: JobApplicationCreate):
    try:
        job_res = supabase.table("job_postings").select("*").eq("id", job_id).execute()
        if not job_res.data:
            raise HTTPException(status_code=404, detail="Job not found")
            
        j_meta = _extract_job_meta(job_res.data[0])
        clean_reqs = j_meta.get("required_skills", [])

        # 1. Check if registration date has closed
        if j_meta.get("is_deadline_passed"):
            deadline_val = j_meta.get("deadline") or "the closing date"
            raise HTTPException(
                status_code=400,
                detail=f"Registration closed for this position on {deadline_val}. Applications are no longer accepted."
            )

        # 2. Check student eligibility
        skills_req = supabase.table("student_skills").select("*").eq("student_id", payload.student_id).execute()
        score = _calculate_match_score(skills_req.data or [], clean_reqs)

        if score < 50:
            raise HTTPException(
                status_code=400,
                detail=f"Ineligible to apply: Your verified competency match score is {score}% (minimum 50% required). Please complete Level 1/Level 2 skill assessments to qualify."
            )

        result = supabase.table("job_applications").insert({
            "job_id": job_id,
            "student_id": payload.student_id,
            "resume_url": payload.resume_url,
            "cover_letter": payload.cover_letter,
            "match_score": score,
            "status": "applied"
        }).execute()

        # Invalidate student applications cache
        cache_key = f"student_applications_{payload.student_id}"
        if cache_key in jobs_cache:
            del jobs_cache[cache_key]

        return {"message": "Application submitted successfully!", "application": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        if "duplicate key value" in str(e):
            raise HTTPException(status_code=400, detail="You have already applied for this job.")
        raise HTTPException(status_code=500, detail=str(e))
@router.delete('/messages/{message_id}')
async def delete_company_message(message_id: str):
    try:
        supabase.table('company_messages').delete().eq('id', message_id).execute()
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


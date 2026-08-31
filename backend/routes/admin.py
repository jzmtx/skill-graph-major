from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from database import supabase
from typing import Any, Dict
import os

router = APIRouter()

@router.get("/users")
async def get_all_users():
    try:
        # Fetch students and their verified skills
        students = supabase.table("students").select("*, student_skills(skill_name, verification_level, skill_score)").execute()

        # Fetch companies (via recruiters, since companies table itself has no auth_id)
        recruiters = supabase.table("recruiters").select("*, companies(name, is_verified)").execute()

        # Fetch TPO officials
        tpo_officials = supabase.table("tpo_officials").select("*, colleges(name)").execute()

        # Fetch alumni
        alumni = supabase.table("alumni").select("*, colleges(name)").execute()

        return {
            "users": students.data,
            "recruiters": recruiters.data,
            "tpo_officials": tpo_officials.data,
            "alumni": alumni.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/questions")
async def get_all_questions():
    try:
        mcqs = supabase.table("questions").select("*").execute()
        coding = supabase.table("coding_questions").select("*").execute()
        
        return {
            "mcqs": mcqs.data,
            "coding_questions": coding.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market")
async def get_market_data():
    try:
        # Fetch real-time data from the new Adzuna/JobSpy pipeline
        raw_jds_res = supabase.table("raw_job_postings").select("*").order("created_at", desc=True).limit(2000).execute()
        legacy_jds_res = supabase.table("industry_intelligence").select("*").limit(1000).execute()
        
        roadmaps = supabase.table("career_paths").select("*").execute()
        demand_scores = supabase.table("role_skill_demand").select("*, canonical_skills(title, esco_uri)").execute()
        
        # Merge legacy data into raw_jds so user doesn't lose old Frontend Dev data
        raw_jds = raw_jds_res.data if raw_jds_res.data else []
        if legacy_jds_res.data:
            for l in legacy_jds_res.data:
                # Ensure structure matches raw_job_postings
                raw_jds.append({
                    "id": l.get("id"),
                    "role_name": l.get("role_name"),
                    "company_name": l.get("company_name", "Unknown"),
                    "job_title": l.get("job_title", l.get("role_name")),
                    "description": l.get("description", ""),
                    "url": l.get("url", ""),
                    "source": l.get("source", "Legacy"),
                    "created_at": l.get("created_at"),
                    "extracted_skills": l.get("extracted_skills", [])
                })
        
        return {
            "market_data": [], # Legacy backward compatibility
            "roadmaps": roadmaps.data,
            "raw_jds": raw_jds,
            "demand_scores": demand_scores.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UpdateQuestionRequest(BaseModel):
    question_base_text: str
    options_json: Dict[str, Any]
    correct_answer: str
    difficulty_level: int

@router.put("/questions/{question_id}")
async def update_mcq(question_id: str, req: UpdateQuestionRequest):
    try:
        updated = supabase.table("questions").update({
            "question_base_text": req.question_base_text,
            "options_json": req.options_json,
            "correct_answer": req.correct_answer,
            "difficulty_level": req.difficulty_level
        }).eq("id", question_id).execute()
        
        if not updated.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        return {"message": "Question updated successfully", "question": updated.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UpdateCodingQuestionRequest(BaseModel):
    question_base_text: str
    starter_code: str
    correct_answer: str
    difficulty_level: int

@router.put("/coding_questions/{question_id}")
async def update_coding_question(question_id: str, req: UpdateCodingQuestionRequest):
    try:
        updated = supabase.table("coding_questions").update({
            "question_base_text": req.question_base_text,
            "starter_code": req.starter_code,
            "correct_answer": req.correct_answer,
            "difficulty_level": req.difficulty_level
        }).eq("id", question_id).execute()
        
        if not updated.data:
            raise HTTPException(status_code=404, detail="Question not found")
            
        return {"message": "Coding Question updated successfully", "question": updated.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api_usage")
async def get_api_usage():
    try:
        logs = supabase.table("api_usage_logs").select("*").order("created_at", desc=True).limit(100).execute()
        return {"logs": logs.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/apify_usage")
async def get_apify_usage():
    import os
    import requests
    import concurrent.futures
    
    keys_str = os.getenv("APIFY_API_KEYS", os.getenv("APIFY_API_KEY", ""))
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    if not keys:
        return {"keys": []}
        
    results = []
    
    def fetch_key_stats(key):
        masked_key = f"...{key[-8:]}" if len(key) > 8 else key
        try:
            # 1. Fetch User Info
            user_url = f"https://api.apify.com/v2/users/me?token={key}"
            user_resp = requests.get(user_url, timeout=5)
            
            # 2. Fetch Monthly Usage
            usage_url = f"https://api.apify.com/v2/users/me/usage/monthly?token={key}"
            usage_resp = requests.get(usage_url, timeout=5)
            
            if user_resp.status_code != 200:
                return {
                    "key": masked_key,
                    "status": "Invalid/Expired",
                    "username": "N/A",
                    "email": "N/A",
                    "limit_usd": 0.00,
                    "consumed_usd": 0.00,
                    "percent_used": 0.0
                }
                
            user_data = user_resp.json().get("data", {})
            username = user_data.get("username", "Unknown")
            email = user_data.get("email", "N/A")
            
            limits = user_data.get("limits", {})
            limit_usd = limits.get("monthlyPlaygroundUsageUsd", limits.get("monthlyUsageUsd", 5.00))
            if limit_usd is None or limit_usd == 0:
                limit_usd = 5.00
                
            consumed_usd = 0.0
            if usage_resp.status_code == 200:
                usage_data = usage_resp.json().get("data", {})
                consumed_usd = usage_data.get("totalUsd", 0.0) or 0.0
                
            percent_used = round((consumed_usd / limit_usd) * 100, 2) if limit_usd > 0 else 0.0
            
            return {
                "key": masked_key,
                "status": "Online",
                "username": username,
                "email": email,
                "limit_usd": float(limit_usd),
                "consumed_usd": float(consumed_usd),
                "percent_used": percent_used
            }
        except Exception as e:
            return {
                "key": masked_key,
                "status": "Offline",
                "username": "N/A",
                "email": "N/A",
                "limit_usd": 0.00,
                "consumed_usd": 0.00,
                "percent_used": 0.0
            }

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        stats = list(executor.map(fetch_key_stats, keys))
        
    return {"keys": stats}

@router.get("/scraper_diagnostics")
async def get_scraper_diagnostics():
    from utils.scraper_logger import get_scraper_logs
    try:
        logs = get_scraper_logs()
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pipeline_errors")
async def get_pipeline_errors():
    import os, json
    log_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '../logs/pipeline_errors.json'))
    if not os.path.exists(log_file):
        return {"errors": []}
    try:
        with open(log_file, 'r') as f:
            return {"errors": json.load(f)}
    except:
        return {"errors": []}

@router.delete("/scraper_diagnostics")
async def clear_scraper_diagnostics():
    try:
        if os.path.exists("scraper_logs.json"):
            os.remove("scraper_logs.json")
        return {"success": True, "message": "Scraper logs cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RunPipelineRequest(BaseModel):
    role_name: str

@router.post("/run_pipeline")
async def run_pipeline(req: RunPipelineRequest, background_tasks: BackgroundTasks):
    try:
        import sys
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
        from roadmap_engine.data_pipeline.pipeline_orchestrator import PipelineOrchestrator
        
        orchestrator = PipelineOrchestrator()
        background_tasks.add_task(orchestrator.run_pipeline, req.role_name)
        return {"success": True, "message": f"Started pipeline for {req.role_name} in the background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/roadmaps/{roadmap_id}")
async def delete_roadmap_deep(roadmap_id: str):
    try:
        # Get the roadmap to know the role_name
        res = supabase.table("career_paths").select("*").eq("id", roadmap_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Roadmap not found")
            
        roadmap = res.data[0]
        role_name = roadmap["role_name"]
        
        # 1. Delete from career_paths
        supabase.table("career_paths").delete().eq("id", roadmap_id).execute()
        
        # 2. Delete from industry_intelligence (JDs)
        supabase.table("industry_intelligence").delete().ilike("role_name", role_name).execute()
        
        # 3. Delete from industry_statistics
        supabase.table("industry_statistics").delete().ilike("career_name", role_name).execute()
        
        return {"success": True, "message": f"Successfully deleted roadmap and all cached analytics for {role_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resources")
async def get_all_resources():
    try:
        res = supabase.table("skill_resources").select("*").execute()
        return {"resources": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predict_prerequisites")
async def get_prerequisite_predictions():
    try:
        from services.link_prediction import predict_missing_prerequisites
        predictions = predict_missing_prerequisites()
        return {"predictions": predictions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ApprovePrerequisiteRequest(BaseModel):
    skill_id: str
    prerequisite_id: str

@router.post("/approve_prerequisite")
async def approve_prerequisite_link(req: ApprovePrerequisiteRequest):
    try:
        res = supabase.table("skill_dependencies").insert({
            "skill_id": req.skill_id,
            "prerequisite_id": req.prerequisite_id,
            "dependency_type": "strict"
        }).execute()
        return {"success": True, "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph-data")
async def get_knowledge_graph_data():
    """
    Returns all technologies, learning nodes, and prerequisite edges
    for visualization in the admin Knowledge Graph Explorer.
    """
    try:
        technologies = supabase.table("technologies").select("id, normalized_name, category").execute()
        nodes = supabase.table("learning_nodes").select("id, technology_id, concept_name, difficulty_level").execute()
        prereqs = supabase.table("learning_prerequisites").select("node_id, prerequisite_node_id").execute()
        occupations = supabase.table("occupations").select("id, title").execute()
        occ_skills = supabase.table("occupation_skills").select("occupation_id, skill_id").execute()

        return {
            "technologies": technologies.data,
            "nodes": nodes.data,
            "edges": prereqs.data,
            "occupations": occupations.data,
            "occupation_skills": occ_skills.data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ============================================================
# Ecosystem Verification (Company / TPO / Alumni)
# ============================================================

@router.get("/pending_verifications")
async def get_pending_verifications():
    """Fetches all unverified companies, TPO officials, and alumni for admin review."""
    try:
        companies = supabase.table("companies").select("*").eq("is_verified", False).execute()
        tpo_officials = supabase.table("tpo_officials").select("*, colleges(name)").eq("is_verified", False).execute()
        alumni = supabase.table("alumni").select("*, colleges(name)").eq("is_verified", False).execute()

        return {
            "companies": companies.data,
            "tpo_officials": tpo_officials.data,
            "alumni": alumni.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/verify/company/{company_id}")
async def verify_company(company_id: str):
    """Admin approves a company, unlocking job posting for its recruiters."""
    try:
        result = supabase.table("companies").update({"is_verified": True}).eq("id", company_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Company not found")
        return {"message": "Company verified", "company": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/verify/tpo/{tpo_id}")
async def verify_tpo(tpo_id: str):
    """Admin approves a TPO official, unlocking their student cluster dashboard."""
    try:
        result = supabase.table("tpo_officials").update({"is_verified": True}).eq("id", tpo_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="TPO official not found")
        return {"message": "TPO official verified", "tpo_official": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/verify/alumni/{alumni_id}")
async def verify_alumni(alumni_id: str):
    """Admin approves an alumnus, unlocking opportunity posting."""
    try:
        result = supabase.table("alumni").update({"is_verified": True}).eq("id", alumni_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Alumni not found")
        return {"message": "Alumni verified", "alumni": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
class FetchExternalJobsRequest(BaseModel):
    role: str
    location: str = "India"
    results_wanted: int = 15

@router.post("/fetch_external_jobs")
async def fetch_external_jobs(req: FetchExternalJobsRequest):
    """Admin-triggered: scrapes real job listings from LinkedIn/Indeed/Glassdoor
    and inserts them into the jobs table as external listings."""
    try:
        from services.external_jobs_engine import fetch_and_store_external_jobs
        result = fetch_and_store_external_jobs(req.role, req.location, req.results_wanted)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


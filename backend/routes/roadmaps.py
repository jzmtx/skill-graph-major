from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from database import supabase
from services.roadmap_service import create_roadmap_pipeline
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from services.chat_service import get_chat_response

router = APIRouter()

class GenerateRequest(BaseModel):
    role_name: str
    ecosystem: str
    student_id: Optional[str] = None

class ChatRequest(BaseModel):
    roadmap_id: str
    messages: list

@router.get("/all/admin")
async def get_all_roadmaps():
    try:
        res = supabase.table("career_paths").select("*").execute()
        return {"roadmaps": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/raw-jds/admin")
async def get_raw_jds():
    try:
        res = supabase.table("industry_intelligence").select("*").order("created_at", desc=True).execute()
        return {"raw_jds": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-roadmaps/{student_id}")
async def get_my_roadmaps(student_id: str):
    try:
        res = supabase.table("user_saved_roadmaps") \
            .select("*, career_paths(*)") \
            .eq("student_id", student_id) \
            .execute()
        return {"roadmaps": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_roadmap(role_name: str, ecosystem: str):
    try:
        # Case insensitive match for both role and ecosystem
        res = supabase.table("career_paths") \
            .select("*") \
            .ilike("role_name", role_name) \
            .ilike("ecosystem", ecosystem) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Roadmap not found. Needs generation.")
            
        roadmap = res.data[0]
        # Check if older than 6 months
        last_updated = datetime.fromisoformat(roadmap["last_updated_at"].replace("Z", "+00:00"))
        if last_updated < datetime.now(timezone.utc) - relativedelta(months=6):
            # It's too old, we need to generate a new one
            raise HTTPException(status_code=404, detail="Roadmap expired. Needs generation.")
            
        return {"roadmap": roadmap}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate")
def generate_roadmap(req: GenerateRequest):
    try:
        # 1. Check if it already exists to prevent duplicate generation
        existing = supabase.table("career_paths") \
            .select("*") \
            .ilike("role_name", req.role_name) \
            .ilike("ecosystem", req.ecosystem) \
            .execute()
            
        if existing.data:
            roadmap = existing.data[0]
            last_updated = datetime.fromisoformat(roadmap["last_updated_at"].replace("Z", "+00:00"))
            
            if last_updated >= datetime.now(timezone.utc) - relativedelta(months=6):
                # Valid cache, return it and save to user
                if req.student_id:
                    supabase.table("user_saved_roadmaps").upsert({
                        "student_id": req.student_id,
                        "roadmap_id": roadmap["id"]
                    }).execute()
                return {"roadmap": roadmap, "message": "Already exists"}
            else:
                # Expired cache, delete it so we can regenerate
                supabase.table("career_paths").delete().eq("id", roadmap["id"]).execute()
            
        # 2. Run the heavy ML Tavily Pipeline
        pipeline_result = create_roadmap_pipeline(req.role_name, req.ecosystem)
        
        # 3. Store in DB
        db_payload = {
            "role_name": req.role_name,
            "ecosystem": req.ecosystem,
            "roadmap_json": pipeline_result["roadmap_json"],
            "analytics_json": pipeline_result["analytics"],
            "core_skills": pipeline_result["analytics"].get("core_skills", []),
            "recommended_skills": pipeline_result["analytics"].get("recommended_skills", [])
        }
        
        insert_res = supabase.table("career_paths").insert(db_payload).execute()
        new_roadmap = insert_res.data[0]
        
        # 3. Save to user profile if provided
        if req.student_id:
            supabase.table("user_saved_roadmaps").upsert({
                "student_id": req.student_id,
                "roadmap_id": new_roadmap["id"]
            }).execute()
        
        return {"roadmap": new_roadmap}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.delete("/my-roadmaps/{student_id}/{roadmap_id}")
async def delete_my_roadmap(student_id: str, roadmap_id: str):
    """Remove a roadmap from a user's saved list"""
    try:
        supabase.table("user_saved_roadmaps") \
            .delete() \
            .eq("student_id", student_id) \
            .eq("roadmap_id", roadmap_id) \
            .execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat_with_roadmap(req: ChatRequest):
    try:
        res = supabase.table("career_paths").select("*").eq("id", req.roadmap_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        
        roadmap_json = res.data[0].get("roadmap_json", {})
        reply = get_chat_response(roadmap_json, req.messages)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

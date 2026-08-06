from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from database import supabase
from services.ecosystem_engine import build_ecosystem_map
from services.roadmap_engine import generate_roadmap_from_ecosystem
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from services.chat_service import get_chat_response

router = APIRouter()

class GenerateRequest(BaseModel):
    role_name: str
    ecosystem: str
    student_id: Optional[str] = None
    request_id: Optional[str] = None
    weekly_hours: Optional[int] = 20

# Global memory for generation status
generation_status = {}

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
        updated_str = roadmap.get("last_updated_at")
        if updated_str:
            last_updated = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
        else:
            last_updated = datetime.now(timezone.utc)
            
        if last_updated < datetime.now(timezone.utc) - relativedelta(months=6):
            # It's too old, we need to generate a new one
            raise HTTPException(status_code=404, detail="Roadmap expired. Needs generation.")
            
        return {"roadmap": roadmap}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/generate_status/{request_id}")
async def get_generate_status(request_id: str):
    return generation_status.get(request_id, {"progress": 0, "message": "Initializing..."})

def generate_resources_in_background(skills_to_process: list, role_name: str):
    """Background task to pre-warm the cache by generating resources for top core skills."""
    from services.resource_engine import generate_resource_pack
    for skill_name in skills_to_process:
        try:
            print(f"Background: Auto-generating resources for {skill_name} in context of {role_name}")
            generate_resource_pack(skill_name, role_name)
        except Exception as e:
            print(f"Background: Failed to generate resources for {skill_name}: {e}")

@router.post("/generate")
def generate_roadmap(req: GenerateRequest, background_tasks: BackgroundTasks):
    req_id = req.request_id
    def update_status(progress: int, msg: str):
        if req_id:
            generation_status[req_id] = {"progress": progress, "message": msg}
            
    try:
        update_status(5, "Checking cache for existing roadmaps...")
        
        # 1. Fetch all paths for this ecosystem to do role resolution
        all_paths = supabase.table("career_paths").select("*").eq("ecosystem", req.ecosystem).execute()
        
        matching_roadmap = None
        # Try exact case-insensitive match first
        for cp in all_paths.data:
            if cp["role_name"].lower().strip() == req.role_name.lower().strip():
                matching_roadmap = cp
                break
                
        # If not found, try token-based overlap similarity resolver (70% matching)
        if not matching_roadmap:
            req_words = set(req.role_name.lower().split())
            for cp in all_paths.data:
                cp_words = set(cp["role_name"].lower().split())
                if cp_words:
                    overlap = len(req_words.intersection(cp_words)) / max(len(req_words), len(cp_words))
                    if overlap >= 0.7:
                        matching_roadmap = cp
                        print(f"Role resolver matched '{req.role_name}' to existing cluster '{cp['role_name']}'")
                        break
                        
        is_update = False
        existing_id = None
        
        if matching_roadmap:
            roadmap = matching_roadmap
            existing_id = roadmap["id"]
            updated_str = roadmap.get("last_updated_at")
            if updated_str:
                last_updated = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
            else:
                last_updated = datetime.now(timezone.utc)
            
            if last_updated >= datetime.now(timezone.utc) - relativedelta(months=6):
                # Valid cache, return it and save to user
                if req.student_id:
                    try:
                        supabase.table("user_saved_roadmaps").upsert({
                            "student_id": req.student_id,
                            "roadmap_id": roadmap["id"]
                        }).execute()
                    except Exception as e:
                        print(f"Failed to link existing roadmap to student: {e}")
                return {"roadmap": roadmap, "message": "Already exists"}
            else:
                # Expired cache, mark for update to preserve foreign keys!
                is_update = True
            
        # 2. Run the 5-Engine Pipeline
        update_status(20, "Scraping global job boards and building ecosystem map...")
        ecosystem_data = build_ecosystem_map(req.role_name if not is_update else matching_roadmap["role_name"], req.ecosystem)
        
        if not ecosystem_data.get("available_technologies"):
            raise HTTPException(status_code=400, detail="Not enough industry data found to generate a reliable roadmap for this role. Try a different role.")
            
        # 2b. Personalization Delta: Fetch existing skills
        existing_skills = []
        if req.student_id:
            try:
                skill_res = supabase.table("student_skills").select("skill_name").eq("student_id", req.student_id).execute()
                existing_skills = [s["skill_name"] for s in skill_res.data] if skill_res.data else []
            except Exception as e:
                print(f"Failed to fetch student skills for delta: {e}")
                
        ecosystem_data["student_known_skills"] = existing_skills
            
        update_status(60, "LLaMa-3 synthesizing chronological graph (this takes a moment)...")
        roadmap_json = generate_roadmap_from_ecosystem(ecosystem_data, req.weekly_hours)
        
        if not roadmap_json:
            raise Exception("LLM generation failed or returned invalid JSON.")
            
        # Set is_draft flag if fallback was triggered
        if ecosystem_data.get("is_draft"):
            roadmap_json["is_draft"] = True
            
        # Extract skills actually chosen by the LLM to filter out noise for the UI
        chosen_skills = set()
        for phase in (roadmap_json.get("phases") or []):
            for node in (phase.get("nodes") or []):
                if node.get("skill"):
                    chosen_skills.add(node["skill"])
                for alt in (node.get("alternatives") or []):
                    if alt.get("skill"):
                        chosen_skills.add(alt["skill"])
                    
        # Filter available technologies to only those validated by the LLM
        filtered_tech = [
            t for t in ecosystem_data.get("available_technologies", [])
            if t["name"] in chosen_skills
        ]
        ecosystem_data["available_technologies"] = filtered_tech
        
        update_status(90, "Finalizing roadmap and storing analytics...")
        
        # 3. Store or Update in DB
        db_payload = {
            "role_name": req.role_name if not is_update else matching_roadmap["role_name"],
            "ecosystem": req.ecosystem,
            "roadmap_json": roadmap_json,
            "analytics_json": ecosystem_data,
            "core_skills": [{"skill": t["name"], "percentage": t["demand_score"]} for t in filtered_tech],
            "recommended_skills": [],
            "last_updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if is_update and existing_id:
            update_res = supabase.table("career_paths").update(db_payload).eq("id", existing_id).execute()
            new_roadmap = update_res.data[0]
        else:
            insert_res = supabase.table("career_paths").insert(db_payload).execute()
            new_roadmap = insert_res.data[0]
        
        # 3. Save to user profile if provided
        if req.student_id:
            try:
                supabase.table("user_saved_roadmaps").upsert({
                    "student_id": req.student_id,
                    "roadmap_id": new_roadmap["id"]
                }).execute()
            except Exception as e:
                print(f"Failed to link new roadmap to student: {e}")
            
        # 4. Trigger background task to auto-generate resources for ALL skills in the roadmap
        all_skills_to_process = list(chosen_skills)
        background_tasks.add_task(generate_resources_in_background, all_skills_to_process, req.role_name)
        
        update_status(100, "Done!")
        return {"roadmap": new_roadmap}
        
    except Exception as e:
        if req_id:
            generation_status[req_id] = {"progress": 0, "message": f"Error: {str(e)}"}
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

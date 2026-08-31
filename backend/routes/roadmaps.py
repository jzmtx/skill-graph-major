from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from database import supabase
from services.ecosystem_engine import build_ecosystem_map
from services.roadmap_engine import generate_roadmap_from_ecosystem
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from services.chat_service import get_chat_response
import uuid

router = APIRouter()

def get_or_create_canonical_skill(name: str) -> str:
    slug = name.lower().strip().replace(" ", "-").replace(".", "")
    res = supabase.table("canonical_skills").select("id").eq("slug", slug).execute()
    if res.data:
        return res.data[0]["id"]
    
    # Try inserting
    try:
        res = supabase.table("canonical_skills").insert({
            "title": name,
            "slug": slug,
            "esco_uri": f"custom:{slug}-{uuid.uuid4().hex[:8]}"
        }).execute()
        return res.data[0]["id"]
    except Exception as e:
        print(f"Failed to insert canonical skill {name}: {e}")
        # fallback lookup just in case of race condition
        res = supabase.table("canonical_skills").select("id").eq("slug", slug).execute()
        if res.data: return res.data[0]["id"]
        return str(uuid.uuid4()) # fake uuid if all fails

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
        res = supabase.table("raw_job_postings").select("*").order("created_at", desc=True).limit(50).execute()
        return {"raw_jds": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-stats/admin")
async def get_market_stats():
    try:
        # Fetch only required columns to minimize payload, without limit to aggregate all data
        res = supabase.table("raw_job_postings").select("company_name, url").execute()
        
        from collections import Counter
        from urllib.parse import urlparse
        
        companies = Counter()
        urls = Counter()
        
        for row in res.data:
            c = row.get("company_name")
            if c:
                companies[c.strip().title()] += 1
                
            u = row.get("url")
            if u:
                try:
                    if not u.startswith("http"):
                        u = "https://" + u
                    domain = urlparse(u).hostname
                    if domain:
                        domain = domain.replace("www.", "")
                        urls[domain] += 1
                    else:
                        urls[u] += 1
                except:
                    urls[u] += 1
                    
        return {
            "total_count": len(res.data),
            "companies": dict(companies),
            "urls": dict(urls)
        }
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

def process_roadmap_generation_bg(req: GenerateRequest, is_update: bool, existing_id: str, matching_roadmap: dict, background_tasks: BackgroundTasks):
    req_id = req.request_id
    def update_status(progress: int, msg: str):
        if req_id:
            generation_status[req_id] = {"progress": progress, "message": msg}
            
    try:
        from roadmap_engine.synthesis.graph_generator import GraphGenerator
        generator = GraphGenerator()
        
        # Check if we have market data
        role_to_gen = req.role_name if not is_update else matching_roadmap["role_name"]
        res = supabase.table("role_skill_demand").select("id").eq("role_name", role_to_gen).limit(1).execute()
        
        if not res.data:
            update_status(5, "Running deep market analysis (scraping real jobs)...")
            from roadmap_engine.data_pipeline.pipeline_orchestrator import PipelineOrchestrator
            orchestrator = PipelineOrchestrator()
            # Pass our update_status callback to the orchestrator!
            orchestrator.run_pipeline(role_to_gen, progress_callback=update_status)
            
        update_status(25, "Extracting Canonical Skills and Building Dynamic DAG Roadmap...")
        
        # We assume Beginner proficiency by default if no student profile is provided
        proficiency = "Beginner"
        
        # Use LLM Coordinator to organize Top 40 skills into 8-12 stages
        v2_graph = generator.generate_roadmap(role_name=role_to_gen, proficiency=proficiency)
        
        if isinstance(v2_graph, dict) and "error" in v2_graph:
            raise Exception(v2_graph["error"])
            
        update_status(60, "Structuring Roadmap Stages and Branches...")
        
        # 3. Format V2.0 roadmap output — NEW BRANCHING ROADMAP (Phases + Nodes)
        flat_nodes_count = sum(len(stage.get("nodes", [])) for stage in v2_graph.get("stages", []))
        
        roadmap_json = {
            "stages":           v2_graph.get("stages", []),
            "description":      f"Complete {proficiency} learning path for {role_to_gen}. Covers 8-12 major stages including Core, Specializations, and Optional branches.",
            "total_nodes":      flat_nodes_count,
            "estimated_months": max(1, round((flat_nodes_count * 14) / 30)),
            "confidence":       95.0,
            "detailed_analysis": f"Dynamically generated Branching DAG Roadmap aligned with current industry standards using real-time JD statistics."
        }
        
        # Construct dynamic filtered technology demand stats for analytics JSON
        filtered_tech = []
        chosen_skills = set()
        chosen_skill_ids = []
        
        for stage in v2_graph.get("stages", []):
            for node in stage.get("nodes", []):
                skill_name = node.get("name")
                # V2 Architecture: Assign Canonical Skill ID
                skill_id = get_or_create_canonical_skill(skill_name)
                node["skill_id"] = skill_id
                
                chosen_skills.add(skill_name)
                chosen_skill_ids.append(skill_id)
                filtered_tech.append({
                    "name": skill_name,
                    "skill_id": skill_id,
                    "demand_score": 90.0 # Placeholder since we don't return individual scores from LLM yet
                })
        
        ecosystem_data = {
            "available_technologies": filtered_tech,
            "confidence_score": 95.0
        }
        
        update_status(90, "Finalizing roadmap and storing analytics...")
        
        # 3. Store or Update in DB
        db_payload = {
            "role_name": role_to_gen,
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
            
        # 4. Trigger background task to auto-generate resources ONLY for the first 2 skills (Lazy Generation)
        first_two_skills = chosen_skill_ids[:2]
        background_tasks.add_task(generate_resources_in_background, first_two_skills, role_to_gen)
        
        update_status(100, "Done!")
        # ALSO save data in generation_status so polling frontend can retrieve it!
        generation_status[req_id]["status"] = "completed"
        generation_status[req_id]["data"] = new_roadmap
        
    except Exception as e:
        if req_id:
            generation_status[req_id] = {"progress": 0, "message": f"Error: {str(e)}", "status": "error"}
            print(f"Error in background task: {e}")

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
        for cp in all_paths.data:
            if cp["role_name"].lower().strip() == req.role_name.lower().strip():
                matching_roadmap = cp
                break
                
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
                # Valid cache, return it synchronously (fast path)
                if req.student_id:
                    try:
                        supabase.table("user_saved_roadmaps").upsert({
                            "student_id": req.student_id,
                            "roadmap_id": roadmap["id"]
                        }).execute()
                    except Exception as e:
                        print(f"Failed to link existing roadmap to student: {e}")
                return {"roadmap": roadmap, "message": "Already exists", "status": "cached"}
            else:
                is_update = True
        
        # Dispatch background task for V2.0 Dynamic Generation!
        background_tasks.add_task(process_roadmap_generation_bg, req, is_update, existing_id, matching_roadmap, background_tasks)
        
        return {"status": "queued", "req_id": req_id}
        
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MilestoneSubmitRequest(BaseModel):
    student_id: str
    roadmap_id: str
    milestone_type: str # 'chunk_assessment' or 'capstone_project'
    title: str
    github_repo_url: str

@router.get("/my-roadmaps/{student_id}/progress/{roadmap_id}")
async def get_roadmap_progress(student_id: str, roadmap_id: str):
    """Fetch the progress of all nodes and milestones for a specific student's roadmap"""
    try:
        nodes_res = supabase.table("student_roadmap_nodes") \
            .select("*") \
            .eq("student_id", student_id) \
            .eq("roadmap_id", roadmap_id) \
            .execute()
            
        milestones_res = supabase.table("student_roadmap_milestones") \
            .select("*") \
            .eq("student_id", student_id) \
            .eq("roadmap_id", roadmap_id) \
            .execute()
            
        return {
            "nodes": nodes_res.data,
            "milestones": milestones_res.data
        }
    except Exception as e:
        # Fallback for when tables are not yet created in the database
        print("Progress tables might not exist yet:", e)
        return {"nodes": [], "milestones": []}

@router.post("/my-roadmaps/milestones/submit")
async def submit_milestone(req: MilestoneSubmitRequest):
    """Submit a GitHub repo for a Milestone or Capstone Project"""
    try:
        # Upsert the milestone submission as pending or run auto-eval immediately
        res = supabase.table("student_roadmap_milestones").upsert({
            "student_id": req.student_id,
            "roadmap_id": req.roadmap_id,
            "milestone_type": req.milestone_type,
            "title": req.title,
            "github_repo_url": req.github_repo_url,
            "status": "pending" # An admin or background worker will verify this
        }).execute()
        
        return {"success": True, "message": "Project submitted successfully for review!"}
    except Exception as e:
        print("Failed to submit milestone:", e)
        raise HTTPException(status_code=500, detail="Failed to submit project. Tables might not be created yet.")

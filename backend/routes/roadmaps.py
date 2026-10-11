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

def clean_company_name(name: str) -> str:
    if not name:
        return ""
    # Strip location or trailing suffixes
    cleaned = name.split("|")[0].split(" - ")[0].strip()
    if cleaned.lower() in ("amazon.com", "amazon web services", "amazon web services (aws)"):
        return "Amazon"
    if cleaned.lower() in ("google llc", "google inc"):
        return "Google"
    if cleaned.lower() in ("microsoft corp", "microsoft corporation"):
        return "Microsoft"
    return cleaned

def get_role_hiring_companies(role_name: str) -> list[str]:
    from collections import Counter
    mncs = []
    try:
        jds_res = supabase.table("raw_job_postings").select("company_name").ilike("role_name", f"%{role_name}%").execute()
        if jds_res.data:
            comps = [clean_company_name(r["company_name"]) for r in jds_res.data if r.get("company_name") and r["company_name"] not in ("Unknown", "Aggregator")]
            comps = [c for c in comps if c]
            counts = Counter(comps)
            for c, _ in counts.most_common(5):
                if c not in mncs:
                    mncs.append(c)
    except Exception as e:
        print(f"Error querying hiring companies for {role_name}: {e}")

    if len(mncs) < 4:
        try:
            top_res = supabase.table("raw_job_postings").select("company_name").limit(500).execute()
            if top_res.data:
                all_c = [clean_company_name(r["company_name"]) for r in top_res.data if r.get("company_name") and r["company_name"] not in ("Unknown", "Aggregator")]
                all_c = [c for c in all_c if c]
                for c, _ in Counter(all_c).most_common(8):
                    if c not in mncs:
                        mncs.append(c)
                    if len(mncs) >= 5:
                        break
        except Exception:
            pass

    if not mncs:
        mncs = ["Google", "Amazon", "Microsoft", "Meta", "Netflix"]
    return mncs

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
        res = supabase.table("raw_job_postings").select("*").order("created_at", desc=True).limit(500).execute()
        return {"raw_jds": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-stats/admin")
async def get_market_stats(role: str = None):
    try:
        # Fetch only required columns to minimize payload, without limit to aggregate all data
        query = supabase.table("raw_job_postings").select("company_name, url, role_name")
        if role:
            query = query.ilike("role_name", f"%{role}%")
            
        res = query.execute()
        
        from collections import Counter
        from urllib.parse import urlparse
        
        companies = Counter()
        urls = Counter()
        roles = Counter()
        
        for row in res.data:
            c = row.get("company_name")
            if c:
                companies[c.strip().title()] += 1
                
            r_name = row.get("role_name")
            if r_name:
                roles[r_name.strip().title()] += 1
                
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
            "urls": dict(urls),
            "roles": dict(roles)
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
        data = res.data or []
        for item in data:
            cp = item.get("career_paths")
            if cp:
                if not cp.get("analytics_json"):
                    cp["analytics_json"] = {}
                if not cp["analytics_json"].get("mncs_found"):
                    target_comps = get_role_hiring_companies(cp.get("role_name", ""))
                    cp["analytics_json"]["mncs_found"] = target_comps
                    if isinstance(cp.get("roadmap_json"), dict):
                        cp["roadmap_json"]["target_companies"] = target_comps
        return {"roadmaps": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_roadmap(role_name: str, ecosystem: str, student_id: Optional[str] = None, background_tasks: BackgroundTasks = BackgroundTasks()):
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
        # Ensure hiring companies are always populated
        if not roadmap.get("analytics_json"):
            roadmap["analytics_json"] = {}
        if not roadmap["analytics_json"].get("mncs_found"):
            target_comps = get_role_hiring_companies(roadmap.get("role_name", role_name))
            roadmap["analytics_json"]["mncs_found"] = target_comps
            if isinstance(roadmap.get("roadmap_json"), dict):
                roadmap["roadmap_json"]["target_companies"] = target_comps
        # Check if older than 6 months
        updated_str = roadmap.get("last_updated_at")
        if updated_str:
            last_updated = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
        else:
            last_updated = datetime.now(timezone.utc)
            
        if last_updated < datetime.now(timezone.utc) - relativedelta(months=6):
            # It's too old, we need to generate a new one
            raise HTTPException(status_code=404, detail="Roadmap expired. Needs generation.")
            
        if student_id:
            try:
                supabase.table("user_saved_roadmaps").upsert({
                    "student_id": student_id,
                    "roadmap_id": roadmap["id"]
                }).execute()
            except Exception as e:
                print(f"Failed to link existing roadmap to student: {e}")
                
        # Trigger progressive global resource pre-warming in batches of 3 for any missing nodes
        all_skills = extract_roadmap_skills(roadmap.get("roadmap_json", {}))
        if all_skills:
            background_tasks.add_task(generate_roadmap_resources_progressive, all_skills, roadmap.get("role_name", role_name))
            
        return {"roadmap": roadmap}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/generate_status/{request_id}")
async def get_generate_status(request_id: str):
    return generation_status.get(request_id, {"progress": 0, "message": "Initializing..."})

# Track in-flight generation to prevent redundant concurrent LLM calls
currently_generating_skills = set()

def extract_roadmap_skills(roadmap_json: dict) -> list[dict]:
    """Extract list of unique {skill_id: str, name: str} from all stages/nodes of roadmap."""
    skills = []
    seen = set()
    stages = roadmap_json.get("stages", []) if isinstance(roadmap_json, dict) else []
    for stage in stages:
        for node in stage.get("nodes", []):
            name = node.get("name") or node.get("skill")
            if not name:
                continue
            skill_id = node.get("skill_id")
            if not skill_id:
                try:
                    skill_id = get_or_create_canonical_skill(name)
                    node["skill_id"] = skill_id
                except Exception:
                    skill_id = None
                    
            dedup_key = skill_id or name.lower().strip()
            if dedup_key not in seen:
                seen.add(dedup_key)
                skills.append({
                    "skill_id": skill_id,
                    "name": name
                })
    return skills

def generate_roadmap_resources_progressive(skills: list[dict], role_name: str, batch_size: int = 3):
    """
    Progressively generate and globally cache learning resources for roadmap nodes.
    To prevent rate limits and huge LLM latency, processes nodes in chunks of 3 at a time.
    Cached nodes are skipped so previously generated resources are immediately reused globally.
    """
    from services.resource_engine import generate_resource_pack
    import time
    
    if not skills:
        return

    # 1. Fetch currently cached skill IDs from Supabase in a single fast query
    try:
        cached_res = supabase.table("skill_resources").select("skill_id").execute()
        cached_ids = {r["skill_id"] for r in (cached_res.data or []) if r.get("skill_id")}
    except Exception as e:
        print(f"[ResourceWorker] Warning fetching cache list: {e}")
        cached_ids = set()

    # 2. Filter out already cached skills and skills currently being generated
    uncached = []
    for s in skills:
        sid = s.get("skill_id")
        name = s.get("name")
        if sid and sid in cached_ids:
            continue
        if sid and sid in currently_generating_skills:
            continue
        if name and name.lower() in currently_generating_skills:
            continue
        uncached.append(s)

    if not uncached:
        print(f"[ResourceWorker] All {len(skills)} nodes for '{role_name}' already have resources cached in Supabase.")
        return

    print(f"[ResourceWorker] '{role_name}': {len(uncached)}/{len(skills)} nodes missing resources. Starting progressive generation in batches of {batch_size}...")

    # 3. Process in batches of 3
    batches = [uncached[i:i + batch_size] for i in range(0, len(uncached), batch_size)]
    for batch_num, batch in enumerate(batches, 1):
        batch_names = [b.get("name") for b in batch]
        print(f"[ResourceWorker] Starting Batch {batch_num}/{len(batches)} (3 nodes: {batch_names}) for '{role_name}'")
        
        for item in batch:
            skill_identifier = item.get("skill_id") or item.get("name")
            display_name = item.get("name")
            if not skill_identifier:
                continue
                
            currently_generating_skills.add(str(skill_identifier))
            if display_name:
                currently_generating_skills.add(display_name.lower())
                
            try:
                generate_resource_pack(str(skill_identifier), role_name)
            except Exception as err:
                print(f"[ResourceWorker] Error generating resources for {display_name}: {err}")
            finally:
                currently_generating_skills.discard(str(skill_identifier))
                if display_name:
                    currently_generating_skills.discard(display_name.lower())
                    
        print(f"[ResourceWorker] Completed Batch {batch_num}/{len(batches)} for '{role_name}'. Stored globally in skill_resources.")
        
        # Pacing between batches to avoid Groq rate limits (3s pause)
        if batch_num < len(batches):
            time.sleep(3)

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
        
        target_mncs = get_role_hiring_companies(role_to_gen)
        roadmap_json["target_companies"] = target_mncs
        
        ecosystem_data = {
            "available_technologies": filtered_tech,
            "confidence_score": 95.0,
            "mncs_found": target_mncs,
            "total_jds": 76
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
            
        # 4. Trigger progressive background generation for ALL roadmap nodes in batches of 3
        all_skills = extract_roadmap_skills(roadmap_json)
        background_tasks.add_task(generate_roadmap_resources_progressive, all_skills, role_to_gen)
        
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
                        
                # Also ensure all nodes for this cached roadmap have resources progressively generated in batches of 3
                all_skills = extract_roadmap_skills(roadmap.get("roadmap_json", {}))
                if all_skills:
                    background_tasks.add_task(generate_roadmap_resources_progressive, all_skills, roadmap.get("role_name", req.role_name))
                    
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

@router.post("/prewarm-resources")
async def prewarm_roadmap_resources(req: dict, background_tasks: BackgroundTasks):
    """Explicitly trigger progressive 3-node resource generation for a roadmap role."""
    role_name = req.get("role_name")
    if not role_name:
        raise HTTPException(status_code=400, detail="role_name required")
    res = supabase.table("career_paths").select("*").ilike("role_name", role_name).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    roadmap = res.data[0]
    all_skills = extract_roadmap_skills(roadmap.get("roadmap_json", {}))
    background_tasks.add_task(generate_roadmap_resources_progressive, all_skills, role_name)
    return {
        "status": "queued",
        "total_nodes": len(all_skills),
        "message": f"Pre-warming resources for {len(all_skills)} nodes in batches of 3"
    }

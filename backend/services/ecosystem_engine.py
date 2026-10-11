
from services.skill_engine import resolve_skill_by_name, get_related_skills
from services.industry_engine import update_industry_statistics
from database import supabase

GLOBAL_CATEGORY_ORDER = [
    "Programming Language",
    "Runtime Environment",
    "Frontend Framework",
    "Backend Framework",
    "ORM",
    "Database",
    "Data Science Library",
    "Machine Learning Library",
    "Build Tool",
    "DevOps & Tools",
    "Concept"
]

def build_ecosystem_map(career_name: str, ecosystem_root_name: str):
    """
    Marries the dynamic graph topology with actual industry stats.
    """
    # 1. Map ecosystem selection names to database skill names
    target_roots = []
    career_lower = career_name.lower()
    
    if ecosystem_root_name == "Java/Spring":
        target_roots = ["Java", "Spring Boot"]
    elif ecosystem_root_name == "Python/Django":
        target_roots = ["Python", "Django"]
    elif ecosystem_root_name == ".NET/C#":
        target_roots = ["C#", ".NET Core", "ASP.NET"]
    elif ecosystem_root_name == "Javascript/MERN":
        target_roots = ["React", "Node.js", "Express", "MongoDB"]
    elif ecosystem_root_name.lower() == "general" or not ecosystem_root_name:
        if "full stack" in career_lower or "fullstack" in career_lower:
            target_roots = ["React", "Node.js", "Express", "MongoDB"]
        else:
            target_roots = []
    else:
        target_roots = [ecosystem_root_name]
        
    # Resolve all target roots from the DB
    resolved_roots = []
    for rname in target_roots:
        resolved = resolve_skill_by_name(rname)
        if resolved:
            resolved_roots.append(resolved)
            
    # 3. Fetch the industry statistics for this career
    stats_res = supabase.table("industry_statistics") \
        .select("skill_id, composite_recommendation_score, jobspy_demand_percentage") \
        .ilike("career_name", career_name) \
        .execute()
        
    is_draft = False
    if not stats_res.data:
        # Cache miss! Run the Knowledge Acquisition Engine dynamically for this new career
        print(f"No industry statistics found for {career_name}. Running JobSpy inline...")
        res_stats = update_industry_statistics(career_name)
        if res_stats is None:
            is_draft = True
            
        # Re-fetch after generation
        stats_res = supabase.table("industry_statistics") \
            .select("skill_id, composite_recommendation_score, jobspy_demand_percentage") \
            .ilike("career_name", career_name) \
            .execute()
        
    stats_map = {row["skill_id"]: row for row in stats_res.data}
    
    # 4. Find the technologies
    enriched_tech = []
    
    if resolved_roots:
        seen_ids = set()
        for root_skill in resolved_roots:
            if root_skill["id"] in seen_ids:
                continue
            seen_ids.add(root_skill["id"])
            
            # Always include the root
            root_stat = stats_map.get(root_skill["id"], {})
            enriched_tech.append({
                "id": root_skill["id"],
                "name": root_skill["normalized_name"],
                "category": root_skill["category"] or "Language",
                "demand_score": root_stat.get("composite_recommendation_score", root_stat.get("jobspy_demand_percentage", 0)) or 80.0, # Give default high score if root
                "is_root": True
            })
            
            # Get related skills (children)
            children = get_related_skills(root_skill["id"])
            for child in children:
                if child["id"] in seen_ids:
                    continue
                seen_ids.add(child["id"])
                
                stat = stats_map.get(child["id"], {})
                score = stat.get("composite_recommendation_score", stat.get("jobspy_demand_percentage", 0))
                
                enriched_tech.append({
                    "id": child["id"],
                    "name": child["normalized_name"],
                    "category": child["category"] or "Tool",
                    "demand_score": score or 50.0, # Give positive score if child of specified ecosystem
                    "is_root": False
                })
    else:
        # General Ecosystem: Fetch all skills that have statistics for this career
        skill_ids = list(stats_map.keys())
        if skill_ids:
            # We must fetch the normalized names for these skills
            # In a real system, we'd do an 'in' query. We'll do a simple loop for now or fetch all and filter.
            res = supabase.table("skill_knowledge_graph").select("id, normalized_name, category").execute()
            all_skills = {s["id"]: s for s in res.data}
            
            for sid in skill_ids:
                if sid in all_skills:
                    stat = stats_map[sid]
                    score = stat.get("composite_recommendation_score", stat.get("jobspy_demand_percentage", 0))
                    
                    enriched_tech.append({
                        "id": sid,
                        "name": all_skills[sid]["normalized_name"],
                        "category": all_skills[sid]["category"] or "Concept",
                        "demand_score": score,
                        "is_root": False
                    })
        
    # Filter out noise (only keep tech that has a reasonable demand score)
    # A score of 2.0 roughly translates to ~5% of JDs mentioning it.
    enriched_tech = [t for t in enriched_tech if t["demand_score"] >= 2.0 or t.get("is_root")]

    # Sort by demand score so highest recommended are first
    enriched_tech.sort(key=lambda x: x["demand_score"], reverse=True)
    
    # --- KNOWLEDGE FUSION: DYNAMIC BLUEPRINT GENERATION ---
    # We no longer rely on a hallucinated or hardcoded skeleton.
    # We retrieve the skeleton from the coupled blueprints database (which dynamically crawls university roadmaps if missing).
    from services.blueprint_engine import get_career_blueprint
    blueprint_stages = get_career_blueprint(career_name)
    
    # --- FETCH TOP MNCS HIRING FROM LIVE INGESTED JDS ---
    from collections import Counter
    mncs_found = []
    total_jds = 0
    try:
        jds_res = supabase.table("raw_job_postings").select("company_name").ilike("role_name", f"%{career_name}%").execute()
        if jds_res.data:
            total_jds = len(jds_res.data)
            companies = [row["company_name"] for row in jds_res.data if row.get("company_name") and row["company_name"] not in ("Unknown", "Aggregator")]
            counts = Counter(companies)
            mncs_found = [c[0] for c in counts.most_common(5)]
    except Exception as e:
        print(f"Error querying raw_job_postings for role {career_name}: {e}")

    # If specific role has fewer than 4 companies, supplement with top hiring companies across our 1000 JDs
    if len(mncs_found) < 4:
        try:
            top_res = supabase.table("raw_job_postings").select("company_name").limit(500).execute()
            if top_res.data:
                all_comps = [row["company_name"] for row in top_res.data if row.get("company_name") and row["company_name"] not in ("Unknown", "Aggregator")]
                counts = Counter(all_comps)
                for c, _ in counts.most_common(8):
                    if c not in mncs_found:
                        mncs_found.append(c)
                    if len(mncs_found) >= 5:
                        break
        except Exception:
            pass
            
    if not mncs_found:
        mncs_found = ["Google", "Amazon", "Microsoft", "Meta", "Netflix"]
    
    return {
        "career": career_name,
        "ecosystem": ecosystem_root_name,
        "blueprint_stages": blueprint_stages,
        "available_technologies": enriched_tech,
        "mncs_found": mncs_found,
        "total_jds": total_jds,
        "is_draft": is_draft
    }

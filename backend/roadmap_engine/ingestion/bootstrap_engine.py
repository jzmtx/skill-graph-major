import difflib
from typing import Dict, List, Any, Tuple
from database import supabase

# Known primary occupations for matching fallback
KNOWN_OCCUPATIONS = [
    "Data Scientist",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Cybersecurity Analyst"
]

def resolve_nearest_occupation(career_name: str) -> str:
    """
    Resolves an unknown career role to its nearest known ESCO/O*NET occupation.
    """
    matches = difflib.get_close_matches(career_name, KNOWN_OCCUPATIONS, n=1, cutoff=0.2)
    if matches:
        return matches[0]
    
    # Fallback search by keyword overlap
    c_lower = career_name.lower()
    if "web" in c_lower or "front" in c_lower or "react" in c_lower:
        return "Frontend Developer"
    if "data" in c_lower or "machine" in c_lower or "ai" in c_lower or "analyst" in c_lower:
        return "Data Scientist"
    if "security" in c_lower or "cyber" in c_lower or "network" in c_lower:
        return "Cybersecurity Analyst"
    if "full" in c_lower or "stack" in c_lower:
        return "Full Stack Developer"
        
    return "Backend Developer" # Ultimate fallback

def bootstrap_unknown_role(career_name: str) -> Tuple[List[str], Dict[str, float], float]:
    """
    V1.1 Dynamic Bootstrap Pipeline for unknown roles.
    1. Resolves nearest occupation.
    2. Inherits its stable base structure.
    3. Fuses new technologies as provisional/trusted nodes based on confidence metrics.
    Returns:
        List of target technology IDs.
        Dict of technology demand scores.
        Overall generation confidence level.
    """
    nearest_role = resolve_nearest_occupation(career_name)
    print(f"Unknown role '{career_name}' resolved to nearest occupation: '{nearest_role}'")
    
    # 1. Fetch nearest occupation's technologies from DB
    occ_res = supabase.table("occupations").select("id").eq("title", nearest_role).execute()
    target_techs = []
    demand_scores = {}
    
    if occ_res.data:
        oid = occ_res.data[0]["id"]
        # Fetch occupation skills
        skills_res = supabase.table("occupation_skills").select("skill_id").eq("occupation_id", oid).execute()
        for row in skills_res.data:
            target_techs.append(row["skill_id"])
            demand_scores[row["skill_id"]] = 0.85 # High baseline score for parent skills
            
    # Fetch all technologies to assist in dynamic ID resolution during stack pruning
    techs_data = supabase.table("technologies").select("id, normalized_name").execute().data
    t_id_map = {t["normalized_name"].lower().strip(): t["id"] for t in techs_data}
            
    # 2. Simulate Evidence-Grounded technology extraction for the new niche role
    niche_specs = []
    c_lower = career_name.lower()
    
    # Specific Stack Resolution Filter for Full Stack Developer requests
    if "full stack" in c_lower or "fullstack" in c_lower:
        # Stack Option A: Java Spring Full Stack
        if "java" in c_lower or "spring" in c_lower:
            # Filter out Python and FastAPI technologies from target list
            prune_names = ["python", "fastapi", "django"]
            prune_ids = [t_id_map[p] for p in prune_names if p in t_id_map]
            target_techs = [tid for tid in target_techs if tid not in prune_ids]
            
            niche_specs = [
                {"name": "Java", "confidence": 0.95, "demand": 0.90, "prereq": "JavaScript Fundamentals"},
                {"name": "Spring Boot", "confidence": 0.92, "demand": 0.85, "prereq": "Java"}
            ]
        # Stack Option B: Node/Express/MERN Full Stack
        elif "node" in c_lower or "express" in c_lower or "mern" in c_lower or "mongodb" in c_lower:
            # Filter out Python and FastAPI technologies from target list
            prune_names = ["python", "fastapi", "django"]
            prune_ids = [t_id_map[p] for p in prune_names if p in t_id_map]
            target_techs = [tid for tid in target_techs if tid not in prune_ids]
            
            niche_specs = [
                {"name": "Node.js", "confidence": 0.95, "demand": 0.92, "prereq": "JavaScript Fundamentals"},
                {"name": "Express", "confidence": 0.90, "demand": 0.88, "prereq": "Node.js"},
                {"name": "MongoDB", "confidence": 0.88, "demand": 0.85, "prereq": "Express"}
            ]
    
    elif "blockchain" in c_lower or "solidity" in c_lower:
        niche_specs = [
            {"name": "Solidity", "confidence": 0.94, "demand": 0.90, "prereq": "JavaScript Fundamentals"},
            {"name": "Ethers.js", "confidence": 0.88, "demand": 0.78, "prereq": "Solidity"},
            {"name": "Hardhat", "confidence": 0.75, "demand": 0.70, "prereq": "Solidity"}
        ]
    elif "cloud" in c_lower or "architect" in c_lower:
        niche_specs = [
            {"name": "AWS", "confidence": 0.95, "demand": 0.92, "prereq": "Python Programming"},
            {"name": "Terraform", "confidence": 0.90, "demand": 0.84, "prereq": "AWS"},
            {"name": "Kubernetes", "confidence": 0.88, "demand": 0.80, "prereq": "Docker Containerization"}
        ]
        
    # If no target techs inherited from occupation backbone, apply core software fallback
    if not target_techs:
        fallback_names = ["Python", "SQL", "Version Control (Git)", "Docker"]
        techs_res = supabase.table("technologies").select("id").in_("normalized_name", fallback_names).execute()
        for t in techs_res.data:
            target_techs.append(t["id"])
            demand_scores[t["id"]] = 0.80
        
    # Ingest and save niche nodes dynamically
    for spec in niche_specs:
        # Check if technology exists in DB
        tech_res = supabase.table("technologies").select("id").eq("normalized_name", spec["name"]).execute()
        if tech_res.data:
            tid = tech_res.data[0]["id"]
        else:
            new_tech = supabase.table("technologies").insert({
                "normalized_name": spec["name"],
                "category": "Tool"
            }).execute()
            tid = new_tech.data[0]["id"] if new_tech.data else None
            
        if tid:
            target_techs.append(tid)
            demand_scores[tid] = spec["demand"]
            
            # Auto-inject prerequisite technologies to target_techs to maintain full graph connectivity
            if spec.get("prereq"):
                p_node = supabase.table("learning_nodes").select("technology_id").eq("concept_name", spec["prereq"]).execute()
                if p_node.data and p_node.data[0].get("technology_id"):
                    target_techs.append(p_node.data[0]["technology_id"])
                    
            # Create dynamic learning nodes and prerequisites on-the-fly
            node_res = supabase.table("learning_nodes").select("id").eq("concept_name", spec["name"]).execute()
            if not node_res.data:
                # Insert provisional learning node
                ins_res = supabase.table("learning_nodes").insert({
                    "technology_id": tid,
                    "concept_name": spec["name"],
                    "difficulty_level": "advanced" if spec["confidence"] < 0.90 else "core"
                }).execute()
                new_node_id = ins_res.data[0]["id"] if ins_res.data else None
                
                # Dynamic prerequisite linking
                if new_node_id and spec.get("prereq"):
                    p_node = supabase.table("learning_nodes").select("id").eq("concept_name", spec["prereq"]).execute()
                    if p_node.data:
                        try:
                            supabase.table("learning_prerequisites").insert({
                                "node_id": new_node_id,
                                "prerequisite_node_id": p_node.data[0]["id"]
                            }).execute()
                        except Exception:
                            pass
            
    # Calculate overall roadmap generation confidence
    if niche_specs:
        avg_confidence = sum(s["confidence"] for s in niche_specs) / len(niche_specs)
    else:
        avg_confidence = 0.95
        
    return target_techs, list(set(target_techs)), demand_scores, round(avg_confidence, 2)

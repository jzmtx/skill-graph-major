import os
import json
from groq import Groq
from dotenv import load_dotenv

from dotenv import dotenv_values

import random

def get_career_foundations(career_name: str) -> list:
    """
    Returns a list of fundamental prerequisite skill records based on the career domain
    to guarantee that learners study base concepts before jumping into complex frameworks.
    """
    career_lower = career_name.lower()
    
    cs_basics = [
        {"name": "Computer Science Basics", "demand_score": 100.0, "category": "Fundamentals"},
        {"name": "Operating Systems", "demand_score": 95.0, "category": "Fundamentals"},
        {"name": "Networking & Protocols", "demand_score": 90.0, "category": "Fundamentals"}
    ]
    
    programming_basics = [
        {"name": "Programming Fundamentals", "demand_score": 98.0, "category": "Fundamentals"},
        {"name": "Version Control (Git)", "demand_score": 85.0, "category": "Tools"}
    ]
    
    if "cyber" in career_lower or "security" in career_lower:
        return cs_basics + [
            {"name": "Linux Fundamentals", "demand_score": 90.0, "category": "Fundamentals"},
            {"name": "Cybersecurity Fundamentals", "demand_score": 88.0, "category": "Fundamentals"}
        ]
    elif "data" in career_lower or "analyst" in career_lower or "machine" in career_lower or "ai" in career_lower:
        return programming_basics + [
            {"name": "SQL Basics", "demand_score": 92.0, "category": "Databases"},
            {"name": "Mathematics & Statistics", "demand_score": 85.0, "category": "Fundamentals"}
        ]
    elif "developer" in career_lower or "engineer" in career_lower or "web" in career_lower:
        return programming_basics + [
            {"name": "Web Fundamentals (HTML/CSS)", "demand_score": 95.0, "category": "Frontend"},
            {"name": "JavaScript Basics", "demand_score": 90.0, "category": "Programming Language"}
        ]
        
    return cs_basics + programming_basics

def generate_roadmap_from_ecosystem(ecosystem_data: dict, weekly_hours: int = 20) -> dict:
    env_vars = dotenv_values(".env")
    keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
    key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
    
    """
    Takes the structured blueprint and technology list from the Ecosystem Engine,
    uses NetworkX to sort them topologically, and overlays the LLM to design custom projects.
    """
    career = ecosystem_data.get("career", "Role")
    ecosystem = ecosystem_data.get("ecosystem", "Tech Stack")
    stages = ecosystem_data.get("blueprint_stages", [])
    
    # Pre-filter noisy/ambiguous keywords from technologies list
    blacklist = {
        "analysis", "science", "general", "applications", "management", 
        "system", "systems", "project", "development", "engineering", 
        "information", "solutions", "services", "technologies", "technology", 
        "support", "operations", "data", "requirements", "design",
        "comprehensive benefits", "401(k)", "401k", "benefits", "innovation", 
        "infrastructure", "architecture", "communication", "it", "ai", 
        "skills", "experience", "degree", "bachelor", "master", "phd", 
        "education", "teamwork", "leadership", "equal opportunity", "diversity"
    }
    raw_technologies = ecosystem_data.get("available_technologies", [])
    filtered_technologies = [
        t for t in raw_technologies
        if t.get("name", "").lower().strip() not in blacklist
    ]
    technologies = filtered_technologies[:30] # Limit to 30 to stay under 6000 TPM
    
    from database import supabase
    
    # Inject Base Career Foundations
    foundations = get_career_foundations(career)
    db_foundations = []
    
    for f in foundations:
        try:
            existing = supabase.table("skill_knowledge_graph").select("id").ilike("normalized_name", f["name"]).execute()
            if existing.data:
                fid = existing.data[0]["id"]
            else:
                ins = supabase.table("skill_knowledge_graph").insert({
                    "normalized_name": f["name"],
                    "category": f["category"],
                    "official_docs_url": f"https://www.google.com/search?q={f['name'].replace(' ', '+')}+documentation",
                    "aliases": [f["name"].lower()]
                }).execute()
                fid = ins.data[0]["id"]
                
            db_foundations.append({
                "id": fid,
                "name": f["name"],
                "category": f["category"],
                "demand_score": f["demand_score"]
            })
        except Exception as e:
            print(f"Failed to seed foundation {f['name']}: {e}")
            
    # Prepend foundations to technologies list
    technologies = db_foundations + [t for t in technologies if t.get("name") not in {fn["name"] for fn in db_foundations}]
    
    mncs = ecosystem_data.get("mncs_found", [])
    known_skills = ecosystem_data.get("student_known_skills", [])
    
    # Check if this student is an experienced developer who knows most of the core stack
    known_set = {k.lower().strip() for k in known_skills}
    tech_set = {t.get("name", "").lower().strip() for t in technologies if t.get("name")}
    
    # If student knows > 75% of core technologies, switch to Specialization & Mastery Mode
    intersection = known_set.intersection(tech_set)
    is_specialization_mode = len(tech_set) > 0 and (len(intersection) / len(tech_set)) > 0.75
    
    # 1. Topological Sort using NetworkX
    import networkx as nx
    from database import supabase
    
    # Fetch dependencies from db
    edges_res = supabase.table("skill_dependencies").select("skill_id, prerequisite_id").execute()
    
    tech_ids = {t["id"] for t in technologies if "id" in t}
    tech_by_id = {t["id"]: t for t in technologies if "id" in t}
    
    # Track foundation IDs
    foundation_ids = {fn["id"] for fn in db_foundations}
    
    G = nx.DiGraph()
    for tid in tech_ids:
        G.add_node(tid)
        
    for edge in edges_res.data:
        u, v = edge["skill_id"], edge["prerequisite_id"]
        if u in tech_ids and v in tech_ids:
            G.add_edge(v, u) # prerequisite -> skill
            
    # Auto-link foundations as prerequisites of advanced skills
    non_foundation_ids = tech_ids - foundation_ids
    for fid in foundation_ids:
        for nfid in non_foundation_ids:
            G.add_edge(fid, nfid)
            
    # Check for cycles
    if not nx.is_directed_acyclic_graph(G):
        cycles = list(nx.simple_cycles(G))
        for cycle in cycles:
            if len(cycle) > 1:
                G.remove_edge(cycle[0], cycle[1])
                
    # Re-sort topologically
    sorted_ids = list(nx.topological_sort(G))
    
    # Personalization Delta: Subtract known skills (if not in specialization mode)
    if not is_specialization_mode:
        sorted_ids = [tid for tid in sorted_ids if tech_by_id[tid]["name"].lower().strip() not in known_set]
        
    # Force include active foundations, and fill rest with highest demand non-foundations
    active_foundations = [fid for fid in sorted_ids if fid in foundation_ids]
    non_foundations_sorted = [tid for tid in sorted_ids if tid not in foundation_ids]
    non_foundations_sorted = sorted(non_foundations_sorted, key=lambda tid: tech_by_id[tid].get("demand_score", 0), reverse=True)
    
    allowed_non_foundations = max(0, 15 - len(active_foundations))
    sorted_ids = active_foundations + non_foundations_sorted[:allowed_non_foundations]
    
    # Re-sort the top 15 skills topologically to maintain prerequisite order
    subG = G.subgraph(sorted_ids)
    sorted_ids = list(nx.topological_sort(subG))
    
    all_nodes = []
    for tid in sorted_ids:
        node = tech_by_id[tid]
        
        res_cat = supabase.table("resource_catalog").select("title, url").eq("skill_id", tid).execute()
        topics = [{"name": "Getting Started", "resource_url": res_cat.data[0]["url"]} if res_cat.data else {"name": "Introduction"}]
        
        node_payload = {
            "id": f"node_{node['id']}",
            "type": "SINGLE",
            "skill": node["name"],
            "demand_score": node["demand_score"],
            "why": f"Essential skill for {career}.",
            "docs": f"https://www.google.com/search?q={node['name']}+official+docs",
            "video": f"https://www.youtube.com/results?search_query={node['name']}+tutorial",
            "prerequisites": [f"node_{p}" for p in subG.predecessors(tid)],
            "topics": topics
        }
        all_nodes.append(node_payload)
        
    # Balanced Sequential Partitioning:
    # Since all_nodes is topologically sorted, chunking them sequentially preserves prerequisite order perfectly!
    n = len(all_nodes)
    if n >= 3:
        q, r = divmod(n, 3)
        # Distribute remainder to earlier phases
        idx1 = q + (1 if r > 0 else 0)
        idx2 = idx1 + q + (1 if r > 1 else 0)
        beginner_nodes = all_nodes[:idx1]
        intermediate_nodes = all_nodes[idx1:idx2]
        advanced_nodes = all_nodes[idx2:]
    else:
        beginner_nodes = all_nodes
        intermediate_nodes = []
        advanced_nodes = []
            
    stages_json = json.dumps(stages, indent=2)
    mncs_str = ", ".join(mncs) if mncs else "Top Tech Companies"
    known_str = ", ".join(known_skills) if known_skills else "None"
    
    # 2. Dynamic LLM Overlay prompt
    specialization_directives = ""
    if is_specialization_mode:
        specialization_directives = "NOTE: Student has high starting expertise. Focus phase descriptions and projects on architecture and scaling."
        
    prompt = f"""
    You are an expert career architect and senior engineering leader.
    We have structured a learning roadmap of sorted technology nodes for a {career} focusing on {ecosystem}.
    
    {specialization_directives}
    
    The user commits to study {weekly_hours} hours per week.
    Here are the top companies hiring for this role: {mncs_str}.
    Here is the sequential structure of nodes:
    - Phase 1 (Beginner): {json.dumps(beginner_nodes, indent=2)}
    - Phase 2 (Intermediate): {json.dumps(intermediate_nodes, indent=2)}
    - Phase 3 (Advanced): {json.dumps(advanced_nodes, indent=2)}
    
    Your task is to enrich this structure by completing the dynamic descriptions, projects, and node subskills:
    1. Write a phase `description`.
    2. Design a creative, hands-on `milestone_project` with a `title`, `description`, and `requirements` array that tests all the skills in that phase.
    3. For EVERY node inside the phases, enrich the structure by populating these properties:
       - `why`: specific reason why this tool/skill is critical for {career} at {mncs_str}.
       - `estimated_days` (Integer): number of days required to learn this skill, scaled realistically based on the user's {weekly_hours} hours/week commitment.
       - `subskills` (Array of Strings): 4-6 specific sub-topics/subskills representing this node (e.g. for Azure: Portal, Azure AD, Virtual Machines; for Python: Syntax, Dicts, Generators).
       - `labs` (Array of Strings): 3-4 specific hands-on tasks or practical exercises (e.g. for Git: "Configure remote origin", "Resolve a merge conflict").
       - `mini_project` (Object): A small individual project challenge with a `title` and `description` string.
       
    Return the fully completed roadmap exactly in this JSON format:
    {{
        "title": "The {ecosystem} {career} Path",
        "description": "General introduction to this path...",
        "detailed_analysis": "A 2-paragraph overview of why this path fits the market...",
        "estimated_months": 6,
        "phases": [
            {{
                "phase_title": "Phase 1: Beginner Foundations",
                "description": "...",
                "milestone_project": {{
                    "title": "Project Title",
                    "description": "Description...",
                    "requirements": ["Req 1", "Req 2"]
                }},
                "nodes": [
                    {{
                        "id": "node_uuid",
                        "type": "SINGLE",
                        "skill": "Skill Name",
                        "demand_score": 90.0,
                        "why": "Specific explanation...",
                        "docs": "https://...",
                        "video": "https://...",
                        "prerequisites": [],
                        "topics": [],
                        "estimated_days": 10,
                        "subskills": ["Subskill 1", "Subskill 2"],
                        "labs": ["Lab 1", "Lab 2"],
                        "mini_project": {{
                            "title": "Mini Project Title",
                            "description": "Challenge description..."
                        }}
                    }}
                ]
            }},
            {{
                "phase_title": "Phase 2: Intermediate Frameworks",
                "description": "...",
                "milestone_project": {{
                    "title": "Project Title",
                    "description": "Description...",
                    "requirements": ["Req 1", "Req 2"]
                }},
                "nodes": [ ... ]
            }},
            {{
                "phase_title": "Phase 3: Advanced Specializations",
                "description": "...",
                "milestone_project": {{
                    "title": "Project Title",
                    "description": "Description...",
                    "requirements": ["Req 1", "Req 2"]
                }},
                "nodes": [ ... ]
            }}
        ]
    }}
    Return raw JSON. Do not output markdown code blocks.
    """
    
    groq_client = Groq(api_key=random.choice(key_list))
    
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.2,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.endswith("```"):
            raw = raw[:-3]
            
        roadmap_data = json.loads(raw.strip())
        
        # Safeguard: Verify and map LLM enriched nodes back to our original verified DB nodes list
        original_phases = {
            "Phase 1: Beginner Foundations": beginner_nodes,
            "Phase 2: Intermediate Frameworks": intermediate_nodes,
            "Phase 3: Advanced Specializations": advanced_nodes
        }
        
        # Build maps of LLM responses to quickly look up custom explanations and details
        llm_nodes_enriched = {}
        for phase in (roadmap_data.get("phases") or []):
            for node in (phase.get("nodes") or []):
                skill_name = node.get("skill", "").lower().strip()
                if skill_name:
                    llm_nodes_enriched[skill_name] = {
                        "why": node.get("why", ""),
                        "estimated_days": node.get("estimated_days", 10),
                        "subskills": node.get("subskills", []),
                        "labs": node.get("labs", []),
                        "mini_project": node.get("mini_project", {"title": "Practice", "description": "Hands-on coding challenge"})
                    }
                    
        # Re-map original nodes with LLM explanations, discarding LLM hallucinations
        sanitized_phases = []
        for phase in (roadmap_data.get("phases") or []):
            title = phase.get("phase_title", "")
            orig_nodes = original_phases.get(title)
            if orig_nodes is not None:
                verified_nodes = []
                for onode in orig_nodes:
                    vnode = dict(onode)
                    lower_skill = vnode["skill"].lower().strip()
                    if lower_skill in llm_nodes_enriched:
                        enrichments = llm_nodes_enriched[lower_skill]
                        vnode["why"] = enrichments["why"]
                        vnode["estimated_days"] = enrichments["estimated_days"]
                        vnode["subskills"] = enrichments["subskills"]
                        vnode["labs"] = enrichments["labs"]
                        vnode["mini_project"] = enrichments["mini_project"]
                    else:
                        # Safe fallbacks if LLM missed it
                        vnode["estimated_days"] = 10
                        vnode["subskills"] = ["Getting started with base concepts"]
                        vnode["labs"] = ["Configure local workspace environment"]
                        vnode["mini_project"] = {"title": "Topic Exercise", "description": "Build local files and review concepts"}
                    verified_nodes.append(vnode)
                
                phase["nodes"] = verified_nodes
                sanitized_phases.append(phase)
                
        if sanitized_phases:
            roadmap_data["phases"] = sanitized_phases
        
        # Chronological commitment timeline scaling
        hours = float(weekly_hours) if (weekly_hours and float(weekly_hours) > 0) else 20.0
        base_months = int(roadmap_data.get("estimated_months", 6))
        scaled_months = int(base_months * (20.0 / hours))
        scaled_months = max(1, min(24, scaled_months))
        
        roadmap_data["estimated_months"] = scaled_months
        return roadmap_data
    except Exception as e:
        print(f"LLM Enrichment failed: {e}")
        # Return fallback static graph without LLM descriptions if LLM crashes
        return {
            "title": f"The {ecosystem} {career} Path",
            "description": f"Curriculum path for {career}.",
            "detailed_analysis": "Deterministic fallback roadmap.",
            "estimated_months": 6,
            "phases": [
                {"phase_title": "Phase 1: Beginner Foundations", "description": "Fundamentals.", "nodes": beginner_nodes, "milestone_project": {"title": "CLI Tool", "description": "Basic project", "requirements": ["Basic code"]}},
                {"phase_title": "Phase 2: Intermediate Frameworks", "description": "Core frameworks.", "nodes": intermediate_nodes, "milestone_project": {"title": "Web App", "description": "Intermed project", "requirements": ["Backend endpoints"]}},
                {"phase_title": "Phase 3: Advanced Specializations", "description": "Production scale.", "nodes": advanced_nodes, "milestone_project": {"title": "Cloud Scale App", "description": "Prod scale", "requirements": ["CI/CD"]}}
            ]
        }

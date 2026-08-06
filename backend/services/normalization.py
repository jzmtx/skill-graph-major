import json
from database import supabase
from groq import Groq
from dotenv import dotenv_values

env_vars = dotenv_values(".env")
keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
key_list = [k.strip() for k in keys_str.split(",") if k.strip()]

def normalize_skills_batch(raw_skills: list) -> dict:
    """Takes a list of raw skills and returns a dict mapping raw -> normalized"""
    if not raw_skills:
        return {}
        
    # 1. Build local map from DB
    res = supabase.table("skill_knowledge_graph").select("normalized_name, aliases").execute()
    db_map = {}
    for row in res.data:
        norm = row["normalized_name"]
        db_map[norm.lower()] = norm
        for alias in row.get("aliases", []):
            db_map[alias.lower()] = norm
            
    # 2. Find unknown skills
    unique_raw = list(set([s.lower() for s in raw_skills]))
    unknown_skills = [s for s in unique_raw if s not in db_map]
    
    result_map = {}
    for s in unique_raw:
        if s in db_map:
            result_map[s] = db_map[s]
            
    if not unknown_skills:
        return result_map
        
    # 3. LLM batch normalization for unknown skills (chunked to prevent token overflow)
    new_mappings = {}
    chunk_size = 50
    for i in range(0, len(unknown_skills), chunk_size):
        chunk = unknown_skills[i:i + chunk_size]
        prompt = f"""
        Normalize these tech skills to their canonical industry names (e.g., 'reactjs' -> 'React', 'aws ec2' -> 'AWS EC2', 'node' -> 'Node.js').
        If a skill is vague like 'database', keep it as 'Database'.
        Return ONLY a JSON dictionary where the key is the raw skill exactly as provided, and the value is the canonical name.
        Raw skills: {chunk}
        """
        
        try:
            import random
            groq_client = Groq(api_key=random.choice(key_list))
            completion = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
                temperature=0.1
            )
            content = completion.choices[0].message.content.strip()
            import re
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', content, re.DOTALL)
            if match:
                content = match.group(1).strip()
            else:
                start = content.find('{')
                end = content.rfind('}')
                if start != -1 and end != -1:
                    content = content[start:end+1]
                    
            new_mappings.update(json.loads(content))
        except Exception as e:
            print(f"Normalization LLM failed for chunk: {e}")
            for s in chunk:
                new_mappings[s] = s.title()
        
    # 4. Save new mappings to DB (Executed once outside the chunk loop)
    norm_to_aliases = {}
    for raw, norm in new_mappings.items():
        result_map[raw.lower()] = norm
        if norm not in norm_to_aliases:
            norm_to_aliases[norm] = []
        norm_to_aliases[norm].append(raw.lower())
        
    for norm, aliases in norm_to_aliases.items():
        # Check if norm exists
        existing = supabase.table("skill_knowledge_graph").select("id, aliases").eq("normalized_name", norm).execute()
        if existing.data:
            db_aliases = set(existing.data[0].get("aliases", []))
            db_aliases.update(aliases)
            supabase.table("skill_knowledge_graph").update({"aliases": list(db_aliases)}).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("skill_knowledge_graph").insert({
                "normalized_name": norm,
                "aliases": aliases
            }).execute()
            
    # Trigger dynamic dependency mapping for the newly created skills
    new_norms = [norm for norm in new_mappings.values()]
    if new_norms:
        try:
            infer_and_save_dependencies(new_norms)
        except Exception as e:
            print(f"Dynamic dependency inference failed: {e}")
                
    return result_map


def infer_and_save_dependencies(new_skills: list):
    """
    Asks the LLM to identify prerequisites for new skills and saves them to skill_dependencies.
    Guarantees cycle-free DAG structures using NetworkX.
    """
    if not new_skills:
        return
        
    import networkx as nx
    import random
    from database import supabase
    
    # 1. Fetch all skills
    res = supabase.table("skill_knowledge_graph").select("id, normalized_name").execute()
    skills_map = {s["normalized_name"]: s["id"] for s in res.data}
    skills_map_lower = {s["normalized_name"].lower().strip(): s for s in res.data}
    all_names = list(skills_map.keys())
    
    # 2. Build local Graph from DB edges
    edges_res = supabase.table("skill_dependencies").select("skill_id, prerequisite_id").execute()
    G = nx.DiGraph()
    for item in res.data:
        G.add_node(item["id"])
    for edge in edges_res.data:
        G.add_edge(edge["skill_id"], edge["prerequisite_id"])
        
    # 3. Prompt LLM to find direct prerequisites
    prompt = f"""
    For the following newly added tech skills:
    {new_skills}
    
    Choose their direct prerequisite skills from the database:
    {all_names[:150]}
    
    Return a JSON dictionary mapping each new skill to a list of its direct prerequisites.
    Format exactly as:
    {{
        "SkillName": ["Prerequisite1", "Prerequisite2"]
    }}
    Return raw JSON.
    """
    
    try:
        import random
        groq_client = Groq(api_key=random.choice(key_list))
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        content = completion.choices[0].message.content.strip()
        inferred = json.loads(content)
    except Exception as e:
        print(f"LLM dependency inference failed: {e}")
        return
        
    # 4. Validate and Insert
    insert_payload = []
    for skill_name, prereqs in inferred.items():
        skill_id = skills_map.get(skill_name) or skills_map_lower.get(skill_name.lower().strip(), {}).get("id")
        if not skill_id: continue
        
        for prereq in prereqs:
            prereq_id = skills_map.get(prereq) or skills_map_lower.get(prereq.lower().strip(), {}).get("id")
            if not prereq_id: continue
            if skill_id == prereq_id: continue
            
            # Temporary addition to detect cycles
            G.add_edge(skill_id, prereq_id)
            if nx.is_directed_acyclic_graph(G):
                insert_payload.append({
                    "skill_id": skill_id,
                    "prerequisite_id": prereq_id,
                    "dependency_type": "strict"
                })
                print(f"Adding validated edge: {skill_name} -> {prereq}")
            else:
                # Cycle detected! Remove edge
                G.remove_edge(skill_id, prereq_id)
                print(f"WARNING: Cycle detected. Discarding dependency edge: {skill_name} -> {prereq}")
                
    if insert_payload:
        try:
            supabase.table("skill_dependencies").upsert(insert_payload, on_conflict="skill_id,prerequisite_id").execute()
            print("Successfully inserted inferred dependencies.")
        except Exception as e:
            print("Failed to upsert dependencies:", e)


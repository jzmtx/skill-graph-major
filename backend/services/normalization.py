import json
from database import supabase
from groq import Groq
import os

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
        
    # 3. LLM batch normalization for unknown skills
    prompt = f"""
    Normalize these tech skills to their canonical industry names (e.g., 'reactjs' -> 'React', 'aws ec2' -> 'AWS EC2', 'node' -> 'Node.js').
    If a skill is vague like 'database', keep it as 'Database'.
    Return ONLY a JSON dictionary where the key is the raw skill exactly as provided, and the value is the canonical name.
    Raw skills: {unknown_skills}
    """
    
    try:
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
                
        new_mappings = json.loads(content)
        
        # 4. Save new mappings to DB
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
                
    except Exception as e:
        print(f"Normalization LLM failed: {e}")
        # Fallback: just map to title case
        for s in unknown_skills:
            result_map[s] = s.title()
            
    return result_map

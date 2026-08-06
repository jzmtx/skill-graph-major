import os
import json
import requests
from groq import Groq
from database import supabase
from dotenv import dotenv_values
import random
env_vars = dotenv_values(".env")
keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
groq_client = Groq(api_key=random.choice(key_list) if key_list else None)

# ---------------------------------------------------------
# 1. External Knowledge Fetchers (PyPI, NPM, GitHub)
# ---------------------------------------------------------
def fetch_pypi_metadata(package_name: str) -> dict:
    """Fetch package metadata from PyPI."""
    try:
        url = f"https://pypi.org/pypi/{package_name}/json"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            info = data.get("info", {})
            return {
                "description": info.get("summary", ""),
                "requires_dist": info.get("requires_dist", []),
                "project_urls": info.get("project_urls", {})
            }
    except Exception as e:
        print(f"PyPI Fetch Error for {package_name}: {e}")
    return {}

def fetch_npm_metadata(package_name: str) -> dict:
    """Fetch package metadata from NPM."""
    try:
        url = f"https://registry.npmjs.org/{package_name}/latest"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            return {
                "description": data.get("description", ""),
                "dependencies": list(data.get("dependencies", {}).keys()),
                "peerDependencies": list(data.get("peerDependencies", {}).keys())
            }
    except Exception as e:
        print(f"NPM Fetch Error for {package_name}: {e}")
    return {}

# ---------------------------------------------------------
# 2. LLM Validation Layer (Knowledge Fusion)
# ---------------------------------------------------------
def classify_and_extract_relationships(tech_name: str, pypi_data: dict, npm_data: dict) -> dict:
    """Use Llama-3-8B to fuse API data and extract conceptual relationships."""
    
    # We use a fast, cheap model for classification tasks
    model_name = "llama-3.1-8b-instant"
    
    prompt = f"""
    You are a Knowledge Graph extraction agent.
    Analyze the technology: "{tech_name}"
    
    External API Context:
    PyPI Data: {json.dumps(pypi_data)}
    NPM Data: {json.dumps(npm_data)}
    
    Determine the most accurate category for this technology and its high-level prerequisites/dependencies.
    Only include HIGH-LEVEL conceptual dependencies (e.g. if FastAPI depends on pydantic and typing_extensions, ONLY return Pydantic. Do not return low-level utility libraries).
    If it requires a conceptual skill (like "JavaScript" for React, or "Linear Algebra" for PyTorch), include it.
    
    Return EXACTLY in this JSON format:
    {{
        "category": "Backend Framework", 
        "description": "Short summary",
        "relationships": [
            {{ "target": "Python", "type": "DEPENDS_ON", "context": "Core programming language required" }},
            {{ "target": "Pydantic", "type": "DEPENDS_ON", "context": "Used for data validation" }}
        ]
    }}
    """
    
    try:
        response = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=model_name,
            temperature=0.1,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        print(f"LLM Classification Error for {tech_name}: {e}")
        return {}

# ---------------------------------------------------------
# 3. Graph Upsertion (Saving to Supabase)
# ---------------------------------------------------------
def upsert_knowledge_graph_node(tech_name: str) -> bool:
    """End-to-end pipeline to acquire, fuse, and insert a node into the Graph DB."""
    
    # Step 1: Check if already exists in graph
    res = supabase.table("skill_knowledge_graph").select("id").ilike("normalized_name", tech_name).execute()
    if res.data:
        print(f"[{tech_name}] already exists in Graph Database.")
        return True
        
    print(f"[{tech_name}] is unknown. Starting Knowledge Fusion pipeline...")
    
    # Step 2: Fetch raw data
    pypi_data = fetch_pypi_metadata(tech_name)
    npm_data = fetch_npm_metadata(tech_name)
    
    # Step 3: LLM Fusion & Extraction
    fusion_result = classify_and_extract_relationships(tech_name, pypi_data, npm_data)
    if not fusion_result:
        print("Failed to classify.")
        return False
        
    category = fusion_result.get("category", "Concept")
    relationships = fusion_result.get("relationships", [])
    
    # Step 4: Insert the core Node
    res = supabase.table("skill_knowledge_graph").insert({
        "normalized_name": tech_name,
        "category": category,
        "aliases": [tech_name.lower()]
    }).execute()
    source_id = res.data[0]["id"]
    
    # Step 5: Insert the Edges
    for rel in relationships:
        target_name = rel["target"]
        rel_type = rel["type"]
        context = rel.get("context", "")
        
        # Ensure target exists
        target_res = supabase.table("skill_knowledge_graph").select("id").ilike("normalized_name", target_name).execute()
        
        if not target_res.data:
            # We recursively create the target node if it doesn't exist!
            # To avoid infinite loops, we just insert a basic stub node for now
            stub_res = supabase.table("skill_knowledge_graph").insert({
                "normalized_name": target_name,
                "category": "Concept",
                "aliases": [target_name.lower()]
            }).execute()
            target_id = stub_res.data[0]["id"]
        else:
            target_id = target_res.data[0]["id"]
            
        # Insert Edge
        try:
            supabase.table("skill_edges").insert({
                "source_skill_id": source_id,
                "target_skill_id": target_id,
                "relationship_type": rel_type,
                "context_metadata": {"reasoning": context},
                "confidence_score": 95.0 # High confidence since LLM validated API data
            }).execute()
            print(f"  -> Added Edge: ({tech_name}) -[{rel_type}]-> ({target_name})")
        except Exception as e:
            print(f"  -> Edge error: {e}")
            
    print(f"Successfully fused and inserted [{tech_name}] into the Graph Database.")
    return True

if __name__ == "__main__":
    # Test the pipeline
    upsert_knowledge_graph_node("Zustand")

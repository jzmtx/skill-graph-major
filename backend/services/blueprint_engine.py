from groq_models import GROQ_PRIMARY, GROQ_FAST
import json
from database import supabase
from typing import List, Optional

def fetch_single_tavily(query: str, api_key: str) -> str:
    """Helper to fetch a single search query result from Tavily."""
    import requests
    url = "https://api.tavily.com/search"
    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "advanced",
        "max_results": 2
    }
    try:
        resp = requests.post(url, json=payload, timeout=8)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        return "\n".join([f"- {r.get('content')}" for r in results])
    except Exception as e:
        return f"Search failed: {e}"

def generate_dynamic_blueprint(career_name: str) -> List[str]:
    """Uses Tavily to concurrently crawl 5 university syllabi / roadmap.sh structures and LLM to synthesize a consensus path."""
    import random
    import os
    import concurrent.futures
    from groq import Groq
    from dotenv import dotenv_values
    
    tavily_key = os.getenv("TAVILY_API_KEY")
    search_context = ""
    
    if tavily_key and "your_" not in tavily_key.lower():
        print(f"Querying Tavily concurrently for 5 sources for: {career_name}...")
        queries = [
            f"{career_name} roadmap.sh path syllabus",
            f"{career_name} MIT course syllabus curriculum",
            f"{career_name} Stanford Berkeley course syllabus topics",
            f"{career_name} CMU curriculum syllabus core modules",
            f"{career_name} OSSU curriculum learning path"
        ]
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_query = {executor.submit(fetch_single_tavily, q, tavily_key): q for q in queries}
            results = []
            for future in concurrent.futures.as_completed(future_to_query):
                query_str = future_to_query[future]
                try:
                    data = future.result()
                    results.append(f"Source Queries: {query_str}\n{data}")
                except Exception as e:
                    results.append(f"Source Queries: {query_str}\nFailed: {e}")
            search_context = "\n\n".join(results)
            
    prompt = f"""
    You are an academic dean and senior technical curriculum architect.
    We need to build a structured, chronological learning path for a new career: "{career_name}".
    
    Here is raw scraped curriculum and roadmap data from university syllabi (MIT, Stanford, CMU, OSSU) and industry roadmaps:
    {search_context}
    
    Compare these 5 sources, identify the overlapping/consensus stages (topics taught across at least 3 of these sources), and synthesize them into 6 to 10 sequential conceptual milestones.
    Organize them chronologically (foundations first, then tools/frameworks, then advanced/deployment).
    
    Return EXACTLY in this JSON format:
    {{
        "conceptual_stages": ["Stage 1", "Stage 2", "Stage 3"]
    }}
    
    Do not include markdown codeblocks or introduction text. Return raw JSON.
    """
    
    try:
        env_vars = dotenv_values(".env")
        keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
        key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
        groq_client = Groq(api_key=random.choice(key_list))
        
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=GROQ_FAST,
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        content = completion.choices[0].message.content.strip()
        data = json.loads(content)
        stages = data.get("conceptual_stages", [])
        
        # Save to database to cache it
        if stages:
            supabase.table("career_blueprints").insert({
                "career_name": career_name,
                "conceptual_stages": stages
            }).execute()
            print(f"Successfully cached dynamic blueprint for {career_name}: {stages}")
            return stages
    except Exception as e:
        print(f"Failed to generate dynamic blueprint for {career_name}: {e}")
        
    return ["Foundation", "Language", "Core Framework", "Database", "Ecosystem Tools", "Deployment"]

def get_career_blueprint(career_name: str) -> Optional[List[str]]:
    """
    Retrieves the conceptual stages for a given career from the blueprint database.
    If not found, dynamically generates it using an LLM and caches it.
    """
    res = supabase.table("career_blueprints") \
        .select("conceptual_stages") \
        .ilike("career_name", career_name) \
        .execute()
        
    if not res.data:
        print(f"Blueprint not found for {career_name}. Generating dynamically...")
        return generate_dynamic_blueprint(career_name)
        
    return res.data[0]["conceptual_stages"]

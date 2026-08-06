import os
import requests
import json
from groq import Groq
from dotenv import dotenv_values
from database import supabase

def search_youtube(query: str) -> list:
    env = dotenv_values(".env")
    api_key = env.get("YOUTUBE_API_KEY")
    if not api_key: 
        print("Missing YOUTUBE_API_KEY")
        return []
    
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={query}&type=video&maxResults=3&order=relevance&key={api_key}"
    try:
        res = requests.get(url).json()
        if "error" in res:
            print("YouTube API error:", res["error"]["message"])
            return []
            
        items = res.get("items", [])
        videos = []
        for item in items:
            vid_id = item["id"]["videoId"]
            title = item["snippet"]["title"]
            channel = item["snippet"]["channelTitle"]
            published = item["snippet"]["publishedAt"]
            
            # Get video statistics
            stat_url = f"https://www.googleapis.com/youtube/v3/videos?part=statistics&id={vid_id}&key={api_key}"
            stat_res = requests.get(stat_url).json()
            stats = stat_res.get("items", [{}])[0].get("statistics", {})
            views = stats.get("viewCount", "0")
            likes = stats.get("likeCount", "0")
            
            videos.append({
                "title": title,
                "url": f"https://www.youtube.com/watch?v={vid_id}",
                "channel": channel,
                "published_at": published,
                "views": views,
                "likes": likes
            })
        return videos
    except Exception as e:
        print("YouTube API error:", e)
        return []

def search_docs(skill_name: str) -> list:
    env = dotenv_values(".env")
    api_key = env.get("SERPER_API_KEY")
    if not api_key: return []
    
    url = "https://google.serper.dev/search"
    payload = json.dumps({"q": f"{skill_name} official documentation OR official github"})
    headers = {'X-API-KEY': api_key, 'Content-Type': 'application/json'}
    try:
        res = requests.post(url, headers=headers, data=payload).json()
        results = res.get("organic", [])[:2]
        return [{"title": r.get("title"), "url": r.get("link")} for r in results]
    except Exception as e:
        print("Serper API error:", e)
        return []

def generate_resource_pack(skill_name: str, role_name: str = "Software Engineering"):
    # Check cache
    existing = supabase.table("skill_resources").select("*").eq("skill_name", skill_name).execute()
    if existing.data:
        return existing.data[0]
        
    print(f"Building Concept Tree for {skill_name}...")
    
    env = dotenv_values(".env")
    keys_str = env.get("GROQ_API_KEYS", env.get("GROQ_API_KEY", ""))
    key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
    
    import random
    import time
    from concurrent.futures import ThreadPoolExecutor

    # Step 1: Generate the concepts
    topics_prompt = f"""You are an expert curriculum designer for a {role_name}. Break down the technology/skill '{skill_name}' into exactly 4 critical micro-concepts to learn it completely from beginner to advanced in the context of {role_name}. 
    Return ONLY a JSON array of strings. Example: ["Syntax & Variables", "Object Oriented Programming", "File I/O", "Asynchronous Python"]"""
    
    concepts = []
    try:
        groq_client = Groq(api_key=random.choice(key_list))
        res = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": topics_prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.2
        )
        content = res.choices[0].message.content.strip()
        if content.startswith("```json"): content = content[7:-3]
        elif content.startswith("```"): content = content[3:-3]
        concepts = json.loads(content.strip())
    except Exception as e:
        print(f"Failed to generate concepts for {skill_name}: {e}")
        # fallback
        concepts = [f"Introduction to {skill_name}", f"Advanced {skill_name}"]

    # Step 2: Fetch raw search results for the main skill AND the concepts
    queries = [{"type": "main", "query": skill_name}]
    for c in concepts:
        queries.append({"type": "sub", "query": f"{skill_name} {c}"})
        
    search_results = {}
    
    def fetch_for_query(q):
        v = search_youtube(f"{q['query']} tutorial")
        d = search_docs(q['query'])
        search_results[q['query']] = {"videos": v, "docs": d}
        
    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(fetch_for_query, queries)
        
    # Step 3: Curate the final pack
    curation_prompt = f"""
    You are an expert Senior {role_name} curating the absolute best learning resources for the technology/skill: '{skill_name}'.
    
    We have broken it down into the main skill and {len(concepts)} micro-concepts: {', '.join(concepts)}.
    Here are the top Search Results (Docs and YouTube) for each:
    
    {json.dumps(search_results, indent=2)}
    
    Your task:
    1. For the MAIN skill '{skill_name}': Select the absolute best official docs URL and best video tutorial URL from its search results. Generate a 1-sentence "Mini Project".
    2. Additionally, provide the URL to a highly-rated Open Source repository on GitHub (e.g. an "Awesome" list, or a high-quality example project) for {skill_name}.
    3. Additionally, provide the URL to a popular Practice Platform (like LeetCode, Frontend Mentor, Exercism, etc.) that is highly relevant for practicing {skill_name}.
    4. For EACH of the {len(concepts)} micro-concepts: Select the absolute best docs URL and best video URL from its respective search results. Generate a 1-sentence "Mini Project" for that micro-concept.
    
    Return EXACTLY in this JSON format:
    {{
        "official_docs_url": "...",
        "best_video_url": "...",
        "best_video_title": "...",
        "practice_project": "...",
        "open_source_repo_url": "...",
        "practice_platform_url": "...",
        "sub_topics": [
            {{
                "name": "Micro-Concept Name",
                "official_docs_url": "...",
                "best_video_url": "...",
                "practice_project": "..."
            }}
        ]
    }}
    """
    
    final_data = {}
    for attempt in range(3):
        groq_client = Groq(api_key=random.choice(key_list))
        try:
            completion = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": curation_prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            raw = completion.choices[0].message.content.strip()
            final_data = json.loads(raw)
            break
        except Exception as e:
            if attempt == 2:
                print(f"Failed to curate resource pack for {skill_name}:", e)
                return None
            time.sleep(2)
            
    if not final_data:
        return None
        
    # Save to DB
    payload = {
        "skill_name": skill_name,
        "official_docs_url": final_data.get("official_docs_url"),
        "best_video_url": final_data.get("best_video_url"),
        "best_video_title": final_data.get("best_video_title"),
        "practice_project": final_data.get("practice_project"),
        "open_source_repo_url": final_data.get("open_source_repo_url"),
        "practice_platform_url": final_data.get("practice_platform_url"),
        "sub_topics": final_data.get("sub_topics", []),
        "confidence_score": 0.95
    }
    
    try:
        supabase.table("skill_resources").insert(payload).execute()
    except Exception as e:
        print(f"Warning: Could not cache {skill_name} in Supabase (probably schema cache PGRST204). Returning payload anyway.")
        
    return payload

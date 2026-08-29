from groq_models import GROQ_PRIMARY, GROQ_FAST
import os
import requests
import json
from groq import Groq
from dotenv import dotenv_values
from database import supabase
import random
import time
from concurrent.futures import ThreadPoolExecutor

OFFICIAL_DOCS_MAP = {
    "react": "react.dev",
    "python": "docs.python.org",
    "django": "docs.djangoproject.com",
    "docker": "docs.docker.com",
    "postgresql": "postgresql.org/docs",
    "aws": "docs.aws.amazon.com",
    "git": "git-scm.com/doc",
    "nodejs": "nodejs.org/docs",
    "vue": "vuejs.org/guide",
    "typescript": "typescriptlang.org/docs"
}

def search_youtube(query: str) -> list:
    env = dotenv_values(".env")
    api_key = env.get("YOUTUBE_API_KEY")
    if not api_key: return []
    
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={query}&type=video&maxResults=5&order=relevance&key={api_key}"
    try:
        res = requests.get(url).json()
        if "error" in res: return []
            
        items = res.get("items", [])
        videos = []
        for item in items:
            vid_id = item["id"]["videoId"]
            title = item["snippet"]["title"]
            channel = item["snippet"]["channelTitle"]
            published = item["snippet"]["publishedAt"]
            
            # Get video statistics for scoring
            stat_url = f"https://www.googleapis.com/youtube/v3/videos?part=statistics&id={vid_id}&key={api_key}"
            stat_res = requests.get(stat_url).json()
            stats = stat_res.get("items", [{}])[0].get("statistics", {})
            views = int(stats.get("viewCount", "0"))
            
            # Deterministic Score: Base view points + Recency boost
            score = (views / 50000)
            if "2025" in published or "2026" in published: score += 10
            elif "2024" in published: score += 5
            
            videos.append({
                "title": title,
                "url": f"https://www.youtube.com/watch?v={vid_id}",
                "channel": channel,
                "published_at": published,
                "views": views,
                "score": score
            })
            
        # Sort by deterministic score and return top 3
        videos.sort(key=lambda x: x["score"], reverse=True)
        return videos[:3]
    except Exception as e:
        print("YouTube API error:", e)
        return []

def search_github(query: str) -> list:
    url = f"https://api.github.com/search/repositories?q={query}+tutorial+OR+example&sort=stars&order=desc&per_page=3"
    env = dotenv_values(".env")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if "GITHUB_TOKEN" in env:
        headers["Authorization"] = f"token {env['GITHUB_TOKEN']}"
        
    try:
        res = requests.get(url, headers=headers).json()
        repos = res.get("items", [])
        return [{"name": r["full_name"], "url": r["html_url"], "stars": r["stargazers_count"], "description": r.get("description", "")} for r in repos]
    except Exception as e:
        print("GitHub API error:", e)
        return []

def search_docs(skill_name: str, slug: str) -> list:
    if slug in OFFICIAL_DOCS_MAP:
        return [{"title": f"{skill_name} Official Docs", "url": f"https://{OFFICIAL_DOCS_MAP[slug]}"}]
        
    env = dotenv_values(".env")
    api_key = env.get("SERPER_API_KEY")
    if not api_key: return []
    
    url = "https://google.serper.dev/search"
    payload = json.dumps({"q": f"{skill_name} official documentation"})
    headers = {'X-API-KEY': api_key, 'Content-Type': 'application/json'}
    try:
        res = requests.post(url, headers=headers, data=payload).json()
        results = res.get("organic", [])[:1]
        return [{"title": r.get("title"), "url": r.get("link")} for r in results]
    except Exception as e:
        print("Serper API error:", e)
        return []

def generate_resource_pack(skill_id: str, role_name: str = "Software Engineering"):
    # Get skill metadata FIRST so we always know the display name
    skill_res = supabase.table("canonical_skills").select("*").eq("id", skill_id).execute()
    if not skill_res.data:
        print(f"Skill ID {skill_id} not found in canonical_skills")
        return None
        
    skill_name = skill_res.data[0]["title"]
    skill_slug = skill_res.data[0].get("slug", "")
    
    # Check cache via Canonical ID
    existing = supabase.table("skill_resources").select("*").eq("skill_id", skill_id).execute()
    if existing.data:
        payload = existing.data[0]
        payload["skill_name"] = skill_name
        return payload
        
    print(f"V2 Pipeline: Generating resources for {skill_name} ({skill_id})...")
    
    env = dotenv_values(".env")
    keys_str = env.get("GROQ_API_KEYS", env.get("GROQ_API_KEY", ""))
    key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
    
    # Step 1: Generate the concepts
    topics_prompt = f"""You are an expert curriculum designer. Break down the technology '{skill_name}' into exactly 4 critical micro-concepts to learn it. 
    Return ONLY a JSON array of strings. Example: ["Hooks", "Context API", "State Management", "Routing"]"""
    
    concepts = []
    try:
        groq_client = Groq(api_key=random.choice(key_list))
        res = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": topics_prompt}],
            model=GROQ_FAST,
            temperature=0.2
        )
        content = res.choices[0].message.content.strip()
        if content.startswith("```json"): content = content[7:-3]
        elif content.startswith("```"): content = content[3:-3]
        concepts = json.loads(content.strip())
    except Exception as e:
        print(f"Failed to generate concepts for {skill_name}: {e}")
        concepts = [f"Introduction to {skill_name}", f"Advanced {skill_name}"]

    # Step 2: Fetch raw search results for Candidate Pool
    queries = [{"type": "main", "query": skill_name}]
    for c in concepts:
        queries.append({"type": "sub", "query": f"{skill_name} {c}"})
        
    search_results = {}
    
    def fetch_for_query(q):
        v = search_youtube(f"{q['query']} tutorial")
        d = search_docs(q['query'], skill_slug) if q['type'] == 'main' else search_youtube(q['query'])
        g = search_github(q['query']) if q['type'] == 'main' else []
        search_results[q['query']] = {"video_candidates": v, "docs_candidates": d, "github_candidates": g}
        
    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(fetch_for_query, queries)
        
    # Step 3: LLM curates from Top Candidates
    curation_prompt = f"""
    You are an expert Senior Developer curating the best learning resources for '{skill_name}'.
    
    We have {len(concepts)} micro-concepts: {', '.join(concepts)}.
    Here are the Top Scored Candidate Resources from YouTube, GitHub, and Official sources:
    
    {json.dumps(search_results, indent=2)}
    
    Your task:
    1. For the MAIN skill '{skill_name}': Select the absolute best official docs URL and best video URL from the candidate pool. Generate a 1-sentence "Mini Practice Project".
    2. Additionally, select the best GitHub repository from the candidate pool (if any) or suggest a relevant Practice Platform (like LeetCode/Frontend Mentor).
    3. For EACH micro-concept: Select the best video URL from its candidates. Generate a 1-sentence "Mini Project" for it.
    
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
                model=GROQ_PRIMARY,
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
            
    if not final_data: return None
        
    # Step 4: Save to DB via Canonical Skill ID
    payload = {
        "skill_id": skill_id,
        "skill_name": skill_name,
        "official_docs_url": final_data.get("official_docs_url"),
        "best_video_url": final_data.get("best_video_url"),
        "best_video_title": final_data.get("best_video_title"),
        "practice_project": final_data.get("practice_project"),
        "open_source_repo_url": final_data.get("open_source_repo_url"),
        "practice_platform_url": final_data.get("practice_platform_url"),
        "sub_topics": final_data.get("sub_topics", []),
        "confidence_score": 0.95,
        "status": "APPROVED",
        "version": "1.0"
    }
    
    try:
        supabase.table("skill_resources").insert(payload).execute()
    except Exception as e:
        print(f"Warning: Could not cache {skill_name} in Supabase: {e}")
        
    return payload

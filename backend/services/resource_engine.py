from groq_models import GROQ_PRIMARY, GROQ_FAST
import os
import requests
import json
from groq import Groq
from dotenv import dotenv_values
from database import supabase
import random
import time
from datetime import datetime, timezone
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
    import uuid
    is_uuid = False
    try:
        uuid.UUID(str(skill_id))
        is_uuid = True
    except ValueError:
        pass

    # Get skill metadata FIRST so we always know the display name
    if is_uuid:
        skill_res = supabase.table("canonical_skills").select("*").eq("id", str(skill_id)).execute()
    else:
        from urllib.parse import unquote
        clean_skill = unquote(str(skill_id)).strip()
        skill_res = supabase.table("canonical_skills").select("*").ilike("title", clean_skill).execute()

    if not skill_res.data:
        from urllib.parse import unquote
        clean_name = unquote(str(skill_id)).strip() if not is_uuid else str(skill_id)
        slug = clean_name.lower().strip().replace(" ", "-").replace(".", "")
        
        # Check by slug
        slug_res = supabase.table("canonical_skills").select("*").eq("slug", slug).execute()
        if slug_res.data:
            skill_name = slug_res.data[0]["title"]
            skill_slug = slug_res.data[0].get("slug", slug)
            canonical_id = slug_res.data[0]["id"]
        else:
            try:
                new_skill = supabase.table("canonical_skills").insert({
                    "title": clean_name,
                    "slug": slug,
                    "esco_uri": f"custom:{slug}-{uuid.uuid4().hex[:8]}"
                }).execute()
                canonical_id = new_skill.data[0]["id"]
                skill_name = clean_name
                skill_slug = slug
            except Exception:
                slug_res = supabase.table("canonical_skills").select("*").eq("slug", slug).execute()
                if slug_res.data:
                    canonical_id = slug_res.data[0]["id"]
                    skill_name = slug_res.data[0]["title"]
                    skill_slug = slug_res.data[0].get("slug", slug)
                else:
                    canonical_id = str(uuid.uuid4())
                    skill_name = clean_name
                    skill_slug = slug
    else:
        skill_name = skill_res.data[0]["title"]
        skill_slug = skill_res.data[0].get("slug", skill_name.lower().replace(" ", "-"))
        canonical_id = skill_res.data[0]["id"]
    
    # Check cache via Canonical ID in skill_resources
    if canonical_id:
        try:
            existing = supabase.table("skill_resources").select("*").eq("skill_id", canonical_id).execute()
            if existing.data:
                payload = existing.data[0]
                payload["skill_name"] = skill_name
                return payload
        except Exception as e:
            print(f"[ResourceEngine] Cache lookup error for {skill_name}: {e}")
        
    print(f"[ResourceEngine] Pipeline: Generating resources for {skill_name} (Canonical ID: {canonical_id})...")
    
    env = dotenv_values(".env")
    keys_str = env.get("GROQ_API_KEYS", env.get("GROQ_API_KEY", os.environ.get("GROQ_API_KEYS", os.environ.get("GROQ_API_KEY", ""))))
    key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
    if not key_list:
        key_list = ["gsk_placeholder"]
    
    # Step 1: Generate the concepts
    topics_prompt = f"""You are an expert curriculum designer. Break down the technology '{skill_name}' into exactly 4 critical micro-concepts to learn it. 
    Return ONLY a JSON array of strings. Example: ["Hooks", "Context API", "State Management", "Routing"]"""
    
    from services.llm import call_groq_with_retries
    concepts = []
    try:
        res = call_groq_with_retries(
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
        concepts = [f"Fundamentals of {skill_name}", f"Core Workflows in {skill_name}", f"Practical Architecture with {skill_name}", f"Production Best Practices in {skill_name}"]

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
        
    # Compact candidates to avoid exceeding model token limits
    compact_candidates = {}
    for q_name, res in search_results.items():
        compact_candidates[q_name] = {
            "top_videos": [{"title": v.get("title"), "url": v.get("url")} for v in res.get("video_candidates", [])[:2]],
            "docs": [{"title": d.get("title"), "url": d.get("url")} for d in res.get("docs_candidates", [])[:1]],
            "github": [{"name": g.get("name"), "url": g.get("url")} for g in res.get("github_candidates", [])[:1]],
        }
        
    # Step 3: LLM curates from Top Candidates
    curation_prompt = f"""
    You are an expert Senior Developer curating the best learning resources for '{skill_name}'.
    
    We have {len(concepts)} micro-concepts: {', '.join(concepts)}.
    Here are the Top Scored Candidate Resources from YouTube, GitHub, and Official sources:
    
    {json.dumps(compact_candidates, indent=1)}
    
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
    try:
        completion = call_groq_with_retries(
            messages=[{"role": "user", "content": curation_prompt}],
            model=GROQ_PRIMARY,
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        raw = completion.choices[0].message.content.strip()
        final_data = json.loads(raw)
    except Exception as e:
        print(f"Failed to curate resource pack for {skill_name}:", e)
            
    # Reliable Fallbacks if LLM or API candidates were empty
    fallback_docs = f"https://{OFFICIAL_DOCS_MAP.get(skill_slug)}" if skill_slug in OFFICIAL_DOCS_MAP else f"https://devdocs.io/{skill_slug}"
    fallback_video = f"https://www.youtube.com/results?search_query={skill_name.replace(' ', '+')}+tutorial+full+course"
    fallback_title = f"{skill_name} Comprehensive Course & Practical Guide"
    fallback_proj = f"Build an end-to-end practical real-world application using {skill_name}."

    official_docs = final_data.get("official_docs_url") or fallback_docs
    best_video = final_data.get("best_video_url") or fallback_video
    best_video_title = final_data.get("best_video_title") or fallback_title
    practice_project = final_data.get("practice_project") or fallback_proj
    
    sub_topics = final_data.get("sub_topics") or []
    if not sub_topics:
        sub_topics = [
            {
                "name": c,
                "best_video_url": f"https://www.youtube.com/results?search_query={skill_name.replace(' ', '+')}+{c.replace(' ', '+')}",
                "practice_project": f"Build a focused implementation exercising {c} in {skill_name}."
            }
            for c in concepts
        ]
        
    # Step 4: Persist in Supabase skill_resources table using Canonical Skill ID
    db_payload = {
        "skill_id": str(canonical_id),
        "official_docs_url": official_docs,
        "best_video_url": best_video,
        "best_video_title": best_video_title,
        "practice_project": practice_project,
        "sub_topics": sub_topics,
        "confidence_score": 0.95,
        "status": "APPROVED",
        "version": "1.0",
        "last_verified": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        supabase.table("skill_resources").upsert(db_payload, on_conflict="skill_id").execute()
        print(f"[ResourceEngine] Successfully cached resources for '{skill_name}' (skill_id: {canonical_id}) globally in Supabase!")
    except Exception as e:
        print(f"[ResourceEngine] Warning: Could not cache {skill_name} in Supabase: {e}")
        
    payload = {
        **db_payload,
        "skill_name": skill_name,
        "open_source_repo_url": final_data.get("open_source_repo_url"),
        "practice_platform_url": final_data.get("practice_platform_url")
    }
    return payload

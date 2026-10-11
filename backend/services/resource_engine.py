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

CURATED_TECH_RESOURCES = {
    "python": {
        "official_docs": "https://docs.python.org/3/",
        "concepts": ["Data Structures & Collections", "Object-Oriented Programming (OOP)", "Modules, Packages & Virtual Environments", "Error Handling & Asynchronous I/O"],
        "practice_project": "Build a command-line expense tracker and CLI tool with local data persistence.",
        "repo": "https://github.com/TheAlgorithms/Python",
        "platform": "https://leetcode.com/problemset/all/"
    },
    "javascript": {
        "official_docs": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
        "concepts": ["Asynchronous JavaScript (Promises & Async/Await)", "DOM Manipulation & Event Loop", "Closures & Prototypes", "Modern ES6+ Syntax & Modules"],
        "practice_project": "Develop an interactive task management dashboard with local storage persistence.",
        "repo": "https://github.com/trekhleb/javascript-algorithms",
        "platform": "https://javascript30.com/"
    },
    "typescript": {
        "official_docs": "https://www.typescriptlang.org/docs/",
        "concepts": ["Basic & Advanced Types (Unions, Intersections)", "Generics & Utility Types", "Interfaces vs Type Aliases", "TypeScript with Build Tools & Node.js"],
        "practice_project": "Build a type-safe API client library with end-to-end generic typing.",
        "repo": "https://github.com/microsoft/TypeScript",
        "platform": "https://typehero.dev/"
    },
    "react": {
        "official_docs": "https://react.dev/",
        "concepts": ["Component Lifecycle & JSX", "State & Props Management (Hooks)", "Context API & State Providers", "Client-Side Routing & Performance Optimization"],
        "practice_project": "Build a real-time collaborative note-taking application with component state.",
        "repo": "https://github.com/facebook/react",
        "platform": "https://www.frontendmentor.io/"
    },
    "docker": {
        "official_docs": "https://docs.docker.com/",
        "concepts": ["Containerization Fundamentals", "Dockerfile Instructions & Multi-Stage Builds", "Docker Compose Multi-Service Architecture", "Volume Persistence & Network Isolation"],
        "practice_project": "Containerize a full-stack web application with Redis caching and PostgreSQL database using Docker Compose.",
        "repo": "https://github.com/docker/awesome-compose",
        "platform": "https://labs.play-with-docker.com/"
    },
    "sql": {
        "official_docs": "https://www.postgresql.org/docs/",
        "concepts": ["Relational Schema Design & Normalization", "Advanced Joins & Aggregations", "Subqueries & Window Functions", "Indexing & Query Optimization"],
        "practice_project": "Design an e-commerce analytical database and write performance-optimized reporting queries.",
        "repo": "https://github.com/dalibo/pgbadger",
        "platform": "https://sqlzoo.net/"
    },
    "postgresql": {
        "official_docs": "https://www.postgresql.org/docs/",
        "concepts": ["ACID Transactions & MVCC", "Complex Joins & CTEs", "Indexing (B-Tree, GIN, GiST)", "Stored Procedures & Triggers"],
        "practice_project": "Implement a transactional ledger system with constraints and atomic bank transfers.",
        "repo": "https://github.com/postgres/postgres",
        "platform": "https://pgexercises.com/"
    },
    "mysql": {
        "official_docs": "https://dev.mysql.com/doc/",
        "concepts": ["Relational Tables & Constraints", "Query Optimization & EXPLAIN", "Transactions & Isolation Levels", "Replication & Backup Strategies"],
        "practice_project": "Build a relational database schema for a content management system.",
        "repo": "https://github.com/mysql/mysql-server",
        "platform": "https://sqlzoo.net/"
    },
    "git": {
        "official_docs": "https://git-scm.com/doc",
        "concepts": ["Version Control Fundamentals (Commits, Tree, Head)", "Branching, Merging & Fast-Forwarding", "Rebase, Cherry-Pick & Conflict Resolution", "Remote Workflows (Fetch, Pull, Pull Requests)"],
        "practice_project": "Simulate an open-source team collaboration workflow with feature branches and pull request merges.",
        "repo": "https://github.com/git/git",
        "platform": "https://learngitbranching.js.org/"
    },
    "linux": {
        "official_docs": "https://ubuntu.com/tutorials/command-line-for-beginners",
        "concepts": ["File System Hierarchy & Permissions", "Process Management & Systemd Services", "Shell Scripting & Pipelines", "Networking Tools & SSH Administration"],
        "practice_project": "Write an automated system monitoring shell script that alerts on high memory usage.",
        "repo": "https://github.com/dylanaraps/pure-bash-bible",
        "platform": "https://overthewire.org/wargames/bandit/"
    },
    "fastapi": {
        "official_docs": "https://fastapi.tiangolo.com/",
        "concepts": ["Path & Query Parameters", "Pydantic Request/Response Validation", "Dependency Injection System", "OAuth2 & JWT Security Integration"],
        "practice_project": "Build a secure RESTful authentication and user profile microservice with OpenAPI documentation.",
        "repo": "https://github.com/tiangolo/fastapi",
        "platform": "https://fastapi.tiangolo.com/tutorial/"
    },
    "node.js": {
        "official_docs": "https://nodejs.org/en/docs/",
        "concepts": ["Event Loop & Asynchronous Non-blocking I/O", "File System (fs) & Buffer Streams", "Modular Architecture & NPM Packaging", "Building HTTP Web Servers"],
        "practice_project": "Build an asynchronous file streaming and transformation microservice.",
        "repo": "https://github.com/nodejs/node",
        "platform": "https://nodeschool.io/"
    },
    "nodejs": {
        "official_docs": "https://nodejs.org/en/docs/",
        "concepts": ["Event Loop & Asynchronous Non-blocking I/O", "File System (fs) & Buffer Streams", "Modular Architecture & NPM Packaging", "Building HTTP Web Servers"],
        "practice_project": "Build an asynchronous file streaming and transformation microservice.",
        "repo": "https://github.com/nodejs/node",
        "platform": "https://nodeschool.io/"
    },
    "java": {
        "official_docs": "https://docs.oracle.com/en/java/",
        "concepts": ["Object-Oriented Design & Polymorphism", "Java Collections Framework", "Generics & Stream API", "Multithreading & Concurrency Utilities"],
        "practice_project": "Build a multi-threaded banking simulation handling simultaneous balance transactions.",
        "repo": "https://github.com/iluwatar/java-design-patterns",
        "platform": "https://leetcode.com/"
    },
    "c++": {
        "official_docs": "https://en.cppreference.com/w/",
        "concepts": ["Pointers, References & Manual Memory Management", "RAII & Smart Pointers (unique_ptr, shared_ptr)", "Standard Template Library (STL Containers & Algorithms)", "Object-Oriented & Template Metaprogramming"],
        "practice_project": "Implement a high-performance custom memory allocator and benchmarking suite.",
        "repo": "https://github.com/TheAlgorithms/C-Plus-Plus",
        "platform": "https://www.hackerrank.com/domains/cpp"
    },
    "kubernetes": {
        "official_docs": "https://kubernetes.io/docs/",
        "concepts": ["Pods, Deployments & ReplicaSets", "Services, Ingress & DNS", "ConfigMaps & Secrets Management", "Storage Classes & PersistentVolumes"],
        "practice_project": "Deploy a multi-tier microservices application on a local Minikube cluster with auto-scaling.",
        "repo": "https://github.com/kubernetes/kubernetes",
        "platform": "https://killercoda.com/playgrounds/scenario/kubernetes"
    },
    "html": {
        "official_docs": "https://developer.mozilla.org/en-US/docs/Web/HTML",
        "concepts": ["Semantic HTML5 Elements", "Forms, Inputs & Validation Attributes", "Accessibility (a11y) & ARIA Roles", "Document Object Model (DOM) Structure"],
        "practice_project": "Construct an accessible, semantic portfolio website complying with WCAG 2.1 standards.",
        "repo": "https://github.com/mdn/learning-area",
        "platform": "https://www.frontendmentor.io/"
    },
    "css": {
        "official_docs": "https://developer.mozilla.org/en-US/docs/Web/CSS",
        "concepts": ["Box Model & Specificity", "Flexbox One-Dimensional Layouts", "CSS Grid Two-Dimensional Grids", "Responsive Design with Media Queries & CSS Variables"],
        "practice_project": "Code a fully responsive, modern e-commerce product card grid with animations.",
        "repo": "https://github.com/animate-css/animate.css",
        "platform": "https://cssbattle.dev/"
    }
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
    
    # 1. Check persistent global cache via Canonical ID in Supabase
    if canonical_id:
        try:
            existing = supabase.table("skill_resources").select("*").eq("skill_id", canonical_id).execute()
            if existing.data:
                payload = existing.data[0]
                payload["skill_name"] = skill_name
                return payload
        except Exception as e:
            print(f"[ResourceEngine] Cache lookup error for {skill_name}: {e}")
            
    # 2. Check Curated Instant Catalogue for Core Tech (0 LLM calls, 0 token usage, <20ms)
    slug_key = (skill_slug or skill_name or "").lower().strip()
    clean_key = (skill_name or "").lower().strip()
    curated = CURATED_TECH_RESOURCES.get(slug_key) or CURATED_TECH_RESOURCES.get(clean_key)
    if curated:
        print(f"[ResourceEngine] Instant Curated Hit for '{skill_name}' (0 LLM tokens used, instant response)")
        sub_topics = [
            {
                "name": c,
                "best_video_url": f"https://www.youtube.com/results?search_query={skill_name.replace(' ', '+')}+{c.replace(' ', '+')}+tutorial",
                "practice_project": f"Build a focused practical task implementing {c} in {skill_name}."
            }
            for c in curated["concepts"]
        ]
        db_payload = {
            "skill_id": str(canonical_id),
            "official_docs_url": curated.get("official_docs") or f"https://devdocs.io/{skill_slug}",
            "best_video_url": f"https://www.youtube.com/results?search_query={skill_name.replace(' ', '+')}+crash+course+full+tutorial",
            "best_video_title": f"{skill_name} Full Course & Practical Bootcamp",
            "practice_project": curated.get("practice_project") or f"Build an end-to-end practical application using {skill_name}.",
            "sub_topics": sub_topics,
            "confidence_score": 0.99,
            "status": "APPROVED",
            "version": "1.0",
            "last_verified": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        try:
            supabase.table("skill_resources").upsert(db_payload, on_conflict="skill_id").execute()
            print(f"[ResourceEngine] Curated pack cached in Supabase for '{skill_name}'")
        except Exception as e:
            print(f"[ResourceEngine] Warning: Could not cache curated {skill_name}: {e}")
            
        return {
            **db_payload,
            "skill_name": skill_name,
            "open_source_repo_url": curated.get("repo"),
            "practice_platform_url": curated.get("platform")
        }
        
    print(f"[ResourceEngine] Pipeline: Generating lightweight resources for custom skill '{skill_name}' (Canonical ID: {canonical_id})...")
    
    # 3. Check for local Ollama Llama model if configured (OLLAMA_MODEL e.g. llama3.2:3b / llama3.1:8b)
    env = dotenv_values(".env")
    ollama_url = env.get("OLLAMA_BASE_URL", os.environ.get("OLLAMA_BASE_URL"))
    ollama_model = env.get("OLLAMA_MODEL", os.environ.get("OLLAMA_MODEL", "llama3.2:3b"))
    
    compact_prompt = f"""You are an expert curriculum designer. For the technical skill '{skill_name}', return a structured learning blueprint JSON.
Return ONLY valid JSON matching this schema:
{{
  "concepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
  "practice_project": "1-sentence real-world practice project title.",
  "official_docs_url": "Official docs or devdocs URL",
  "open_source_repo_url": "Popular open-source GitHub repo URL or null",
  "practice_platform_url": "Relevant practice platform URL or null"
}}"""

    final_data = {}
    
    # Try Ollama first if available (0 cloud rate limits, 100% offline)
    if ollama_url:
        try:
            resp = requests.post(
                f"{ollama_url.rstrip('/')}/api/generate",
                json={
                    "model": ollama_model,
                    "prompt": compact_prompt,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.2}
                },
                timeout=12
            )
            if resp.status_code == 200:
                raw_response = resp.json().get("response", "{}")
                final_data = json.loads(raw_response)
                print(f"[ResourceEngine] Generated using local Ollama model '{ollama_model}' for '{skill_name}'")
        except Exception as oe:
            print(f"[ResourceEngine] Ollama request bypassed ({oe}), falling back to Groq...")

    # Fallback to GROQ_FAST with single compact prompt (~120 output tokens max)
    if not final_data.get("concepts"):
        from services.llm import call_groq_with_retries
        try:
            res = call_groq_with_retries(
                messages=[{"role": "user", "content": compact_prompt}],
                model=GROQ_FAST,
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            content = res.choices[0].message.content.strip()
            if content.startswith("```json"): content = content[7:-3]
            elif content.startswith("```"): content = content[3:-3]
            final_data = json.loads(content.strip())
        except Exception as ge:
            print(f"[ResourceEngine] LLM generation error for {skill_name}: {ge}")

    # Fallback guarantees if LLM was unavailable
    concepts = final_data.get("concepts") or [
        f"Core Principles of {skill_name}",
        f"Key Syntax & Architecture in {skill_name}",
        f"Data Flow & Workflows with {skill_name}",
        f"Production Best Practices for {skill_name}"
    ]
    
    fallback_docs = f"https://{OFFICIAL_DOCS_MAP.get(skill_slug)}" if skill_slug in OFFICIAL_DOCS_MAP else f"https://devdocs.io/{skill_slug}"
    fallback_video = f"https://www.youtube.com/results?search_query={skill_name.replace(' ', '+')}+crash+course+full+tutorial"
    fallback_title = f"{skill_name} Comprehensive Course & Practical Guide"
    fallback_proj = final_data.get("practice_project") or f"Build an end-to-end practical application implementing {skill_name}."

    official_docs = final_data.get("official_docs_url") or fallback_docs
    best_video = fallback_video
    best_video_title = fallback_title
    practice_project = fallback_proj
    
    sub_topics = [
        {
            "name": c,
            "best_video_url": f"https://www.youtube.com/results?search_query={skill_name.replace(' ', '+')}+{c.replace(' ', '+')}+tutorial",
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

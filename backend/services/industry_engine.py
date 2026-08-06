import urllib.parse
import re
import os
from typing import List, Tuple
from database import supabase
from services.normalization import normalize_skills_batch

TOP_MNCS = ["google", "amazon", "microsoft", "meta", "apple", "netflix", "jpmorgan", "goldman", "uber", "airbnb", "stripe"]

def get_apify_key() -> str:
    import os
    import random
    keys_str = os.getenv("APIFY_API_KEYS", os.getenv("APIFY_API_KEY", ""))
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    if not keys:
        return ""
    return random.choice(keys)

def search_jobspy(search_terms: list, count_per_term: int = 100, synonyms: list = None) -> Tuple[List[dict], List[str]]:
    try:
        from jobspy import scrape_jobs
        import pandas as pd
        import concurrent.futures
        
        def scrape_for_term(term):
            try:
                print(f"Scraping JobSpy (India) for term: {term}")
                jobs = scrape_jobs(
                    site_name=["indeed", "linkedin", "glassdoor"],
                    search_term=term,
                    results_wanted=count_per_term,
                    country_everyone_else="India"
                )
                num_scraped = len(jobs) if (jobs is not None and not jobs.empty) else 0
                from utils.scraper_logger import log_scraper_run
                log_scraper_run("JobSpy (Indeed/LinkedIn/Glassdoor)", term, "Success" if num_scraped > 0 else "No Results", num_scraped)
                return jobs
            except Exception as e:
                print(f"Failed to scrape {term}: {e}")
                from utils.scraper_logger import log_scraper_run
                log_scraper_run("JobSpy (Indeed/LinkedIn/Glassdoor)", term, "Failed", 0, str(e))
                return None

        all_jobs = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            # Map returns results in the order of search_terms
            results = executor.map(scrape_for_term, search_terms[:6])
            
        for jobs in results:
            if jobs is not None and not jobs.empty:
                all_jobs.append(jobs)
                
        if not all_jobs:
            return [], []
            
        jobs = pd.concat(all_jobs).drop_duplicates(subset=["job_url"])
        
        jd_list = []
        urls = []
        for index, job in jobs.iterrows():
            title = job.get("title", "")
            if str(title) == "nan" or not title: continue
            
            # Semantic filtering: Only keep jobs if their title matches one of the LLM-generated synonyms
            if synonyms:
                title_lower = str(title).lower()
                matched = False
                for syn in synonyms:
                    if syn.lower() in title_lower:
                        matched = True
                        break
                
                # If the primary role requested itself is in the title, keep it as well
                if search_terms[0].lower() in title_lower:
                    matched = True
                    
                if not matched:
                    continue
            
            emp = job.get("company", "Unknown")
            if str(emp) == "nan": emp = "Unknown"
            
            desc = job.get("description", "")
            if desc and str(desc) != "nan":
                desc_clean = re.sub(r'<[^>]+>', ' ', str(desc))
                desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()
                jd_list.append({
                    "company_name": emp,
                    "jd_text": desc_clean,
                    "source_url": str(job.get("job_url", ""))
                })
            
            url = job.get("job_url")
            if url and str(url) != "nan":
                parsed = urllib.parse.urlparse(str(url)).netloc.replace("www.", "")
                if parsed: urls.append(parsed)
                
        return jd_list, list(set(urls))
    except Exception as e:
        print(f"JobSpy failed: {e}")
        return [], []

def search_apify_linkedin(search_term: str, count_per_term: int = 50, location: str = "India") -> Tuple[List[dict], List[str]]:
    import requests
    
    api_key = get_apify_key()
    if not api_key or "your_" in api_key.lower():
        return [], []
        
    print(f"Scraping Apify (LinkedIn) for term: {search_term} in {location} using rotated key")
    url = f"https://api.apify.com/v2/acts/cryptosignals~linkedin-jobs-scraper/run-sync-get-dataset-items?token={api_key}"
    payload = {
        "searchQuery": search_term,
        "location": location
    }
    
    try:
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        items = response.json()
        
        num_scraped = len(items) if isinstance(items, list) else 0
        from utils.scraper_logger import log_scraper_run
        
        jd_list = []
        urls = []
        
        # Concurrently fetch descriptions from public guest pages
        import concurrent.futures
        
        def fetch_linkedin_desc(job):
            url_str = job.get("jobUrl", job.get("url", job.get("link", "")))
            if not url_str:
                return None
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                resp = requests.get(url_str, headers=headers, timeout=8)
                if resp.status_code == 200:
                    html = resp.text
                    match = re.search(r'class="show-more-less-html__markup show-more-less-html__markup--clamp-after-5[^"]*">(.*?)</div>', html, re.DOTALL)
                    if match:
                        return match.group(1)
                    match2 = re.search(r'<section class="description">(.*?)</section>', html, re.DOTALL)
                    if match2:
                        return match2.group(1)
            except Exception as e:
                print(f"Failed to fetch description for {url_str}: {e}")
            return None

        # Fetch descriptions in parallel for the first 10 jobs to save time and API quota
        if isinstance(items, list) and items:
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as desc_executor:
                futures = {desc_executor.submit(fetch_linkedin_desc, job): job for job in items[:10]}
                
            for fut in concurrent.futures.as_completed(futures):
                job = futures[fut]
                desc = fut.result()
                if desc:
                    desc_clean = re.sub(r'<[^>]+>', ' ', str(desc))
                    desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()
                    emp = job.get("company", job.get("companyName", "Unknown"))
                    url_str = job.get("jobUrl", job.get("url", job.get("link", "")))
                    
                    jd_list.append({
                        "company_name": emp,
                        "jd_text": desc_clean,
                        "source_url": url_str
                    })
                    if url_str:
                        parsed = urllib.parse.urlparse(str(url_str)).netloc.replace("www.", "")
                        if parsed: urls.append(parsed)
                        
        log_scraper_run("Apify (LinkedIn)", search_term, "Success" if len(jd_list) > 0 else "No Results", len(jd_list))
        return jd_list, list(set(urls))
    except Exception as e:
        print(f"Apify failed for {search_term}: {e}")
        from utils.scraper_logger import log_scraper_run
        log_scraper_run("Apify (LinkedIn)", search_term, "Failed", 0, str(e))
        return [], []

def search_tavily_careers(career_name: str, company: str) -> Tuple[List[dict], List[str]]:
    import requests
    import os
    from utils.scraper_logger import log_scraper_run
    
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key or "your_" in api_key.lower():
        return [], []
        
    print(f"Searching Tavily for career page jobs: {career_name} at {company}")
    url = "https://api.tavily.com/search"
    payload = {
        "api_key": api_key,
        "query": f"{career_name} jobs hiring at {company} India career page",
        "search_depth": "advanced",
        "max_results": 3
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        
        jd_list = []
        urls = []
        for res in results:
            snippet = res.get("content", "")
            source_url = res.get("url", "")
            # Basic validation to ensure the URL belongs to the targeted company
            if company.lower().replace(" ", "") in source_url.lower():
                desc_clean = re.sub(r'<[^>]+>', ' ', str(snippet))
                desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()
                jd_list.append({
                    "company_name": company,
                    "jd_text": desc_clean,
                    "source_url": source_url
                })
                parsed = urllib.parse.urlparse(str(source_url)).netloc.replace("www.", "")
                if parsed: urls.append(parsed)
                
        log_scraper_run(f"Tavily ({company} Careers)", f"{career_name} career page", "Success" if len(jd_list) > 0 else "No Results", len(jd_list))
        return jd_list, list(set(urls))
    except Exception as e:
        print(f"Tavily search failed for {company}: {e}")
        log_scraper_run(f"Tavily ({company} Careers)", f"{career_name} career page", "Failed", 0, str(e))
        return [], []

from groq import Groq
from dotenv import dotenv_values
from services.normalization import normalize_skills_batch

def generate_role_synonyms(career_name: str) -> list:
    """Uses LLM to generate 5-8 synonymous job titles for semantic filtering."""
    prompt = f"""
    You are an expert technical recruiter. We are searching for jobs related to the role: "{career_name}".
    Generate a list of 5 to 8 synonymous or closely related job titles that would be highly relevant to someone searching for this role. 
    Keep the titles realistic and standard to the industry.
    Return ONLY a comma-separated list of the job titles. No introductory text, no bullet points.
    """
    
    try:
        env_vars = dotenv_values(".env")
        keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
        key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
        import random
        groq_client = Groq(api_key=random.choice(key_list))
        
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.3
        )
        content = completion.choices[0].message.content.strip()
        
        # Parse comma separated list
        synonyms = [s.strip() for s in content.split(",") if s.strip()]
        return synonyms
    except Exception as e:
        print(f"LLM Synonym Generation Failed: {e}")
        return []

def generate_india_hiring_companies(career_name: str) -> list:
    """Uses LLM to generate 4-5 top companies hiring for this role in India."""
    prompt = f"""
    You are an expert technical recruiter in India. We are searching for jobs related to the role: "{career_name}".
    Identify 4 to 5 major companies, MNCs, or prominent startups that actively hire for this role in India.
    Return ONLY a comma-separated list of the company names (e.g. TCS, Infosys, Wipro, Amazon, Flipkart).
    Do not return any other text, numbers, or bullet points.
    """
    try:
        env_vars = dotenv_values(".env")
        keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
        key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
        import random
        groq_client = Groq(api_key=random.choice(key_list))
        
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.3
        )
        content = completion.choices[0].message.content.strip()
        companies = [c.strip() for c in content.split(",") if c.strip()]
        return companies
    except Exception as e:
        print(f"LLM Company Generation Failed: {e}")
        return ["TCS", "Infosys", "Wipro", "Cognizant"]

def extract_new_skills_from_jds(jds: list, career_name: str) -> list:
    """Uses LLM to extract potential new skills from the top JDs."""
    top_jds = sorted(jds, key=lambda x: len(x["jd_text"]), reverse=True)[:3]
    combined_text = "\n\n---\n\n".join([jd["jd_text"][:800] for jd in top_jds]) # limit to 800 chars per JD to save context
    
    prompt = f"""
    You are an expert technical recruiter analyzing Job Descriptions for a {career_name}.
    Extract a comprehensive list of SPECIFIC technical skills, programming languages, databases, libraries, frameworks, cloud services, and developer tools mentioned in these JDs.
    
    CRITICAL RULES:
    1. DO NOT extract soft skills (e.g. communication, presentation, leadership, teamwork, passion, fast learner).
    2. DO NOT extract company benefits, compensation or culture items (e.g. 401(k), health insurance, comprehensive benefits, dental, innovation, hybrid work, equal opportunity).
    3. DO NOT extract generic words (e.g. infrastructure, architecture, technology, software, services, solutions, design, development, applications).
    4. DO NOT extract degrees, locations, or experience metrics (e.g. bachelor, master, PhD, India, years of experience).
    5. Return ONLY a comma-separated list of the specific canonical technical tools/skills (e.g. AWS, React, Python, Docker, PostgreSQL, Kubernetes). No introductory text, no bullet points.
    
    Job Descriptions:
    {combined_text}
    """
    
    try:
        env_vars = dotenv_values(".env")
        keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
        key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
        import random
        groq_client = Groq(api_key=random.choice(key_list))
        
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.1
        )
        content = completion.choices[0].message.content.strip()
        
        # Parse comma separated list
        skills = [s.strip() for s in content.split(",") if s.strip()]
        return skills
    except Exception as e:
        print(f"LLM Skill Extraction Failed: {e}")
        return []

def update_industry_statistics(career_name: str, force_refresh: bool = False):
    """
    Runs JobSpy to gather JDs for a career, computes demand %, and upserts to industry_statistics.
    Returns the mapped skill percentages.
    """
    # 1. Generate Semantic Synonyms via LLM
    print(f"Generating semantic synonyms for {career_name} to filter noise...")
    synonyms = generate_role_synonyms(career_name)
    if synonyms:
        print(f"Filtering scraped JDs using synonyms: {', '.join(synonyms)}")
        
    # 1.5 Generate Top Indian Hiring Companies
    print(f"Identifying top companies hiring for {career_name} in India...")
    companies = generate_india_hiring_companies(career_name)
    print(f"Targeting companies: {', '.join(companies)}")
    
    # 2. Fetch JDs using semantic filtering fan-out + targeted companies
    # Jobspy search terms: synonyms + company targeted queries
    jobspy_terms = [career_name] + synonyms
    for company in companies:
        jobspy_terms.append(f"{career_name} {company}")
        
    jds = []
    urls = []
    
    import concurrent.futures
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        # Jobspy runs in parallel for terms
        future_jobspy = executor.submit(search_jobspy, jobspy_terms, 50, synonyms)
        
        # Apify targets LinkedIn for India. We spawn concurrent scrapes for target companies using rotated keys
        futures_apify = []
        apify_key = get_apify_key()
        if apify_key and "your_" not in apify_key.lower():
            # Add a general search for India
            futures_apify.append(executor.submit(search_apify_linkedin, career_name, 20, "India"))
            # Target specific companies
            for company in companies[:3]: # Target top 3 companies to balance credits
                futures_apify.append(executor.submit(search_apify_linkedin, f"{career_name} {company}", 15, "India"))
            
        # Tavily career page scrapes for Indian companies
        futures_tavily = []
        tavily_key = os.getenv("TAVILY_API_KEY")
        if tavily_key and "your_" not in tavily_key.lower():
            for company in companies[:3]: # Target top 3 Indian companies
                futures_tavily.append(executor.submit(search_tavily_careers, career_name, company))
                
        jobspy_jds, jobspy_urls = future_jobspy.result()
        jds.extend(jobspy_jds)
        urls.extend(jobspy_urls)
        
        for fut in futures_apify:
            try:
                apify_jds, apify_urls = fut.result()
                jds.extend(apify_jds)
                urls.extend(apify_urls)
            except Exception as e:
                print("Concurrent Apify task failed:", e)
                
        for fut in futures_tavily:
            try:
                tavily_jds, tavily_urls = fut.result()
                jds.extend(tavily_jds)
                urls.extend(tavily_urls)
            except Exception as e:
                print("Concurrent Tavily task failed:", e)
    
    if not jds:
        print(f"No JDs found for {career_name}. Running Tavily niche role search fallback...")
        tavily_key = os.getenv("TAVILY_API_KEY")
        fallback_skills = []
        if tavily_key and "your_" not in tavily_key.lower():
            import requests
            import json
            import random
            from groq import Groq
            from dotenv import dotenv_values
            
            url = "https://api.tavily.com/search"
            payload = {
                "api_key": tavily_key,
                "query": f"top technologies libraries core skills tools for {career_name}",
                "search_depth": "advanced",
                "max_results": 2
            }
            try:
                resp = requests.post(url, json=payload, timeout=8)
                resp.raise_for_status()
                results = resp.json().get("results", [])
                text_content = "\n".join([r.get("content") for r in results])
                
                env_vars = dotenv_values(".env")
                keys_str = env_vars.get("GROQ_API_KEYS", env_vars.get("GROQ_API_KEY", ""))
                key_list = [k.strip() for k in keys_str.split(",") if k.strip()]
                groq_client = Groq(api_key=random.choice(key_list))
                
                prompt = f"""
                Analyze this text description of the core tools and skills for "{career_name}":
                {text_content}
                
                Extract a JSON array of the top 8 to 15 core technologies, programming languages, libraries, and frameworks mentioned.
                Return exactly in this JSON format:
                {{
                    "skills": ["Skill 1", "Skill 2"]
                }}
                Return raw JSON.
                """
                completion = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.1-8b-instant",
                    temperature=0.2,
                    response_format={"type": "json_object"}
                )
                data = json.loads(completion.choices[0].message.content.strip())
                fallback_skills = data.get("skills", [])
            except Exception as e:
                print("Niche fallback failed:", e)
                
        if not fallback_skills:
            return
            
        print(f"Fallback discovered skills: {fallback_skills}. Normalizing and inserting into DB...")
        normalize_skills_batch(fallback_skills)
        
        # Pull from db to get IDs
        res = supabase.table("skill_knowledge_graph").select("id, normalized_name").execute()
        skills_map = {s["normalized_name"].lower().strip(): s["id"] for s in res.data}
        
        for fs in fallback_skills:
            sid = skills_map.get(fs.lower().strip())
            if sid:
                # Check if already exists in stats
                existing = supabase.table("industry_statistics").select("*").eq("career_name", career_name).eq("skill_id", sid).execute()
                if not existing.data:
                    supabase.table("industry_statistics").insert({
                        "career_name": career_name,
                        "skill_id": sid,
                        "jobspy_demand_percentage": 50.0,
                        "composite_recommendation_score": 50.0
                    }).execute()
        return
        
    # 2. LLM Discovery Phase: Extract raw skills and normalize them to insert into DB
    raw_extracted_skills = extract_new_skills_from_jds(jds, career_name)
    if raw_extracted_skills:
        print(f"Discovered {len(raw_extracted_skills)} potential skills. Normalizing and adding to graph...")
        normalize_skills_batch(raw_extracted_skills)
        
    # 3. Get all skills from knowledge graph (now including newly discovered ones)
    # 2. Get all skills from knowledge graph
    res = supabase.table("skill_knowledge_graph").select("id, normalized_name, aliases, category, parent_skill_id").execute()
    skill_dict = res.data
    skill_by_id = {s["id"]: s for s in skill_dict}
    
    skill_counts = {}
    total_jds = len(jds)
    jd_payloads = []
    
    for jd in jds:
        text = jd["jd_text"].lower()
        found_ids = set()
        found_names = set()
        
        for skill in skill_dict:
            norm_name = skill["normalized_name"]
            aliases = skill["aliases"] or []
            aliases.append(norm_name.lower())
            
            for alias in set(aliases):
                if not alias.strip(): continue
                escaped_alias = re.escape(alias.lower().strip())
                pattern = r'(?:^|\W)' + escaped_alias + r'(?:$|\W)'
                if re.search(pattern, text):
                    found_ids.add(skill["id"])
                    found_names.add(norm_name)
                    break
                    
        # Roll up to parents (e.g. if React is found, Javascript is implied)
        parents_to_add = set()
        for sid in found_ids:
            curr = sid
            while curr in skill_by_id:
                pid = skill_by_id[curr].get("parent_skill_id")
                if pid:
                    parents_to_add.add(pid)
                curr = pid
        
        found_ids.update(parents_to_add)
        
        for sid in found_ids:
            skill_counts[sid] = skill_counts.get(sid, 0) + 1
            
        jd_payloads.append({
            "role_name": career_name,
            "ecosystem": "General",
            "company_name": jd["company_name"],
            "source_url": jd["source_url"],
            "raw_text": jd["jd_text"],
            "extracted_skills": list(found_names)
        })

    # Upsert JDs to DB
    if jd_payloads:
        try:
            supabase.table("industry_intelligence").delete().eq("role_name", career_name).execute()
            for i in range(0, len(jd_payloads), 50):
                supabase.table("industry_intelligence").insert(jd_payloads[i:i+50]).execute()
        except Exception as e:
            print("Failed to save raw JDs:", e)

    # 3. Upsert into industry_statistics
    for sid, count in skill_counts.items():
        percentage = round((count / total_jds) * 100, 2)
        
        # Upsert constraint requires UNIQUE(career_name, skill_id)
        # Note: We must handle updating only jobspy_demand_percentage without destroying github/pypi scores if they exist
        existing = supabase.table("industry_statistics") \
            .select("*").eq("career_name", career_name).eq("skill_id", sid).execute()
            
        if existing.data:
            supabase.table("industry_statistics").update({
                "jobspy_demand_percentage": percentage,
                "composite_recommendation_score": (percentage * 0.4) + (existing.data[0].get("github_popularity_score", 0) * 0.2) + (existing.data[0].get("registry_downloads_score", 0) * 0.2)
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("industry_statistics").insert({
                "career_name": career_name,
                "skill_id": sid,
                "jobspy_demand_percentage": percentage,
                "composite_recommendation_score": (percentage * 0.4)
            }).execute()

    print(f"Updated industry stats for {career_name} based on {total_jds} JDs.")
    return skill_counts

import os
import json
import requests
import urllib.parse
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY")

TOP_MNCS = ["google", "amazon", "microsoft", "meta", "apple", "netflix", "jpmorgan", "goldman", "uber", "airbnb", "stripe"]

def search_tavily(role: str, ecosystem: str, custom_query: str = None):
    if not TAVILY_API_KEY:
        return [], []
    
    if custom_query:
        query = custom_query
    else:
        query = f'"{role}" "{ecosystem}" "requirements" OR "skills" (site:greenhouse.io OR site:jobs.lever.co)'
        
    headers = {"Content-Type": "application/json"}
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "search_depth": "advanced",
        "include_answer": False,
        "max_results": 10
    }
    
    try:
        response = requests.post("https://api.tavily.com/search", json=payload, headers=headers)
        if response.status_code != 200:
            return [], []
            
        results = response.json().get("results", [])
        
        # Log API usage for Tavily
        try:
            from database import supabase
            supabase.table("api_usage_logs").insert({
                "provider": "Tavily",
                "endpoint": "search",
                "tokens_used": len(results), # Number of search results fetched
                "cost_usd": 0.005 # Approximated cost per search
            }).execute()
        except Exception as e:
            print(f"Failed to log Tavily usage: {e}")

        jd_list = []
        urls = []
        for r in results:
            url = r.get("url", "")
            content = r.get("content", "")
            if content:
                jd_list.append({
                    "company_name": "Unknown (Tavily)",
                    "jd_text": content,
                    "source_url": url
                })
            if url:
                parsed = urllib.parse.urlparse(url).netloc.replace("www.", "")
                if parsed: urls.append(parsed)
                
        return jd_list, list(set(urls))
    except Exception as e:
        print(f"Tavily failed: {e}")
        return [], []

def search_jobspy(role: str, count: int = 50):
    try:
        from jobspy import scrape_jobs
        import re
        
        jobs = scrape_jobs(
            site_name=["indeed", "linkedin", "glassdoor"],
            search_term=role,
            results_wanted=count,
            country_everyone_else="USA"
        )
        
        def is_relevant_title(title: str, query_role: str) -> bool:
            title_lower = str(title).lower()
            role_lower = str(query_role).lower()
            if role_lower in title_lower: return True
            
            if "full stack" in role_lower or "fullstack" in role_lower:
                return "full" in title_lower or "stack" in title_lower
            if "frontend" in role_lower or "front-end" in role_lower or "front end" in role_lower:
                return "front" in title_lower or "ui" in title_lower or "react" in title_lower or "angular" in title_lower
            if "backend" in role_lower or "back-end" in role_lower or "back end" in role_lower:
                return "back" in title_lower or "api" in title_lower or "server" in title_lower or "java" in title_lower or "python" in title_lower or "node" in title_lower
            if "data" in role_lower:
                return "data" in title_lower or "machine learning" in title_lower or "ml" in title_lower or "ai" in title_lower
                
            generic = {"developer", "engineer", "programmer", "senior", "junior", "lead", "manager", "software", "staff", "principal", "analyst", "specialist", "consultant", "architect", "administrator", "admin", "associate"}
            role_keywords = set(re.findall(r'\w+', role_lower)) - generic
            title_keywords = set(re.findall(r'\w+', title_lower))
            
            if not role_keywords:
                return True
                
            return len(role_keywords.intersection(title_keywords)) > 0

        jd_list = []
        urls = []
        for index, job in jobs.iterrows():
            title = job.get("title", "")
            if str(title) == "nan" or not title: continue
            
            if not is_relevant_title(title, role):
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
        import traceback
        with open("jobspy_error.log", "w") as f:
            f.write(f"JobSpy failed: {e}\n{traceback.format_exc()}")
        print(f"JobSpy failed: {e}")
        return [], []

def search_job_market(role: str, ecosystem: str):
    # Only use Tavily for 10 high-quality FAANG JDs (as requested by user)
    faang_query = f'"{role}" "{ecosystem}" (site:amazon.jobs OR site:careers.google.com OR site:metacareers.com OR site:jobs.apple.com OR site:netflix.com/jobs) "qualifications"'
    faang_jds, faang_urls = search_tavily(role, ecosystem, custom_query=faang_query)
    
    # Use JobSpy to heavily target FAANG companies (50 results)
    jobspy_faang_jds, jobspy_faang_urls = search_jobspy(f"{role} Google OR Amazon OR Meta OR Apple OR Netflix", 50)
    
    # Use JobSpy for the huge bulk of generic company JDs (150 results)
    jobspy_jds, jobspy_urls = search_jobspy(role, 150)
        
    combined_jds = jobspy_jds + jobspy_faang_jds + faang_jds
    all_urls = list(set(jobspy_urls + jobspy_faang_urls + faang_urls))
    
    return combined_jds, all_urls

def nlp_extract_skills(jd_list: list):
    from database import supabase
    import re
    
    res = supabase.table("skill_knowledge_graph").select("id, normalized_name, aliases, category, parent_skill_id").execute()
    skill_dict = res.data
    skill_by_id = {s["id"]: s for s in skill_dict}
    
    skill_counts = {}
    total_jds = len(jd_list)
    if total_jds == 0: total_jds = 1
    
    for jd in jd_list:
        text = jd["jd_text"].lower()
        found_in_this_jd = set()
        found_ids = set()
        
        for skill in skill_dict:
            norm_name = skill["normalized_name"]
            aliases = skill["aliases"] or []
            aliases.append(norm_name.lower())
            
            for alias in set(aliases):
                if not alias.strip(): continue
                escaped_alias = re.escape(alias.lower().strip())
                pattern = r'(?<!\w)' + escaped_alias + r'(?!\w)'
                if re.search(pattern, text):
                    found_in_this_jd.add(norm_name)
                    found_ids.add(skill["id"])
                    break
                    
        # Roll up to parents
        parents_to_add = set()
        for sid in found_ids:
            curr = sid
            while curr in skill_by_id:
                pid = skill_by_id[curr].get("parent_skill_id")
                if pid:
                    parents_to_add.add(pid)
                curr = pid
        
        found_ids.update(parents_to_add)
        
        jd["skills"] = list(found_in_this_jd)
        for sid in found_ids:
            s_name = skill_by_id[sid]["normalized_name"]
            skill_counts[s_name] = skill_counts.get(s_name, 0) + 1
            
    core_skills = []
    recommended_skills = []
    
    for skill, count in skill_counts.items():
        percentage = round((count / total_jds) * 100)
        # Lower core threshold slightly for smaller sample sizes
        if percentage >= 40:
            core_skills.append({"skill": skill, "percentage": percentage})
        elif percentage >= 5:
            recommended_skills.append({"skill": skill, "percentage": percentage})
            
    core_skills.sort(key=lambda x: x["percentage"], reverse=True)
    recommended_skills.sort(key=lambda x: x["percentage"], reverse=True)
    
    # Cap recommended skills so we don't overwhelm the LLM
    recommended_skills = recommended_skills[:15]
    
    # If no core skills are found above 40%, promote the highest recommended skills if they exist
    if not core_skills and recommended_skills:
        core_skills = recommended_skills[:5]
        recommended_skills = recommended_skills[5:]
    
    companies = list(set([jd["company_name"] for jd in jd_list if jd.get("company_name") and jd["company_name"] != "Unknown (Tavily)"]))
    companies_lower = [c.lower() for c in companies]
    mncs_found = [c for c in companies_lower if any(mnc in c for mnc in TOP_MNCS)]
    
    # Calculate co-occurrences
    co_matrix = {}
    for jd in jd_list:
        skills_in_jd = jd.get("skills", [])
        for i in range(len(skills_in_jd)):
            for j in range(i + 1, len(skills_in_jd)):
                s1, s2 = skills_in_jd[i], skills_in_jd[j]
                if s1 not in co_matrix: co_matrix[s1] = {}
                if s2 not in co_matrix: co_matrix[s2] = {}
                co_matrix[s1][s2] = co_matrix[s1].get(s2, 0) + 1
                co_matrix[s2][s1] = co_matrix[s2].get(s1, 0) + 1

    inferred_relationships = []
    target_skills = [s['skill'] for s in core_skills + recommended_skills]
    
    for i in range(len(target_skills)):
        for j in range(i + 1, len(target_skills)):
            s1 = target_skills[i]
            s2 = target_skills[j]
            
            count_s1 = skill_counts.get(s1, 0)
            count_s2 = skill_counts.get(s2, 0)
            intersection = co_matrix.get(s1, {}).get(s2, 0)
            
            if count_s1 == 0 or count_s2 == 0: continue
            
            p_s1 = count_s1 / total_jds
            p_s2 = count_s2 / total_jds
            
            p_s2_given_s1 = intersection / count_s1
            p_s1_given_s2 = intersection / count_s2
            
            # Alternatives: both appear decently often but rarely together
            if p_s1 > 0.1 and p_s2 > 0.1 and (intersection / max(count_s1, count_s2)) < 0.2:
                inferred_relationships.append(f"{s1} and {s2} are ALTERNATIVES")
                continue
                
            # Complements: very high mutual occurrence
            if p_s2_given_s1 > 0.75 and p_s1_given_s2 > 0.75:
                inferred_relationships.append(f"{s1} and {s2} are COMPLEMENTS")
                continue
                
            # Requires: one strongly implies the other
            if p_s1_given_s2 > 0.85 and p_s2_given_s1 < 0.6:
                inferred_relationships.append(f"{s2} REQUIRES {s1}")
            elif p_s2_given_s1 > 0.85 and p_s1_given_s2 < 0.6:
                inferred_relationships.append(f"{s1} REQUIRES {s2}")
    
    # Build cluster mapping directly from the full ontology
    cluster_map = {}
    
    for s_name in target_skills:
        s_obj = next((s for s in skill_dict if s["normalized_name"] == s_name), None)
        if s_obj:
            # 1. If the detected skill is a Parent, find ALL its children from the entire DB ontology
            children = []
            for s in skill_dict:
                if s.get("parent_skill_id") == s_obj["id"]:
                    c_name = s["normalized_name"]
                    c_count = skill_counts.get(c_name, 0)
                    pct = round((c_count / total_jds) * 100) if total_jds else 0
                    children.append({"skill": c_name, "demand_score": pct})
            
            if children:
                # filter out 0 demand if desired, but let's keep all and let LLM decide based on score
                cluster_map[s_name] = children
                
            # 2. If the detected skill is a Child, find its Parent, and include ALL siblings
            if s_obj.get("parent_skill_id"):
                pid = s_obj["parent_skill_id"]
                if pid in skill_by_id:
                    p_name = skill_by_id[pid]["normalized_name"]
                    siblings = []
                    for s in skill_dict:
                        if s.get("parent_skill_id") == pid:
                            sib_name = s["normalized_name"]
                            c_count = skill_counts.get(sib_name, 0)
                            pct = round((c_count / total_jds) * 100) if total_jds else 0
                            siblings.append({"skill": sib_name, "demand_score": pct})
                    
                    cluster_map[p_name] = siblings
    
    return {
        "core_skills": core_skills,
        "recommended_skills": recommended_skills,
        "cluster_map": cluster_map,
        "inferred_relationships": inferred_relationships,
        "companies_analyzed": companies,
        "mncs_found": list(set(mncs_found))
    }

def generate_final_roadmap(role: str, ecosystem: str, scored_data: dict):
    cluster_map = scored_data.get("cluster_map", {})
    inferred_rels = scored_data.get("inferred_relationships", [])
    
    import json
    cluster_json = json.dumps(cluster_map, indent=2)
    core_json = json.dumps(scored_data["core_skills"], indent=2)
    rec_json = json.dumps(scored_data["recommended_skills"], indent=2)
    
    prompt = f"""
    You are an expert career architect. Build an optimal, chronological learning roadmap for a {ecosystem} {role}.
    
    You MUST strictly focus on teaching these exact high-demand Core Skills extracted from live market data (with their demand percentages): 
    {core_json}
    
    You MAY also include these Recommended Skills if they fit logically into the learning path: 
    {rec_json}
    
    Here is the Hierarchical Cluster Mapping of Parent Technologies to Specific Child Frameworks extracted from the market:
    {cluster_json}
    
    Here is the Statistical Relationship Inferences extracted from a Co-occurrence Matrix of the Job Descriptions:
    {', '.join(inferred_rels)}
    
    If you generate a node for a Parent Technology (e.g., Python or JavaScript), you MUST heavily incorporate its clustered Child Frameworks (e.g., Django, React) into the `children` array for that alternative.
    If the Inferences declare two skills as "ALTERNATIVES", you MUST output them inside a single "CHOICE" node. If they are "REQUIRES", they should be separate sequential nodes in the roadmap.
    
    {'If the ecosystem is "General", and the role implies distinct technology stacks (like Full Stack Developer or Backend Engineer), you MUST create a primary "CHOICE" node early in the roadmap for "Programming Languages" (e.g. Python vs Java). However, for roles where one language is dominant (like Python for Data Science), do NOT force a language choice. Whenever you do present a language alternative, include its specific Child Frameworks (from the cluster map) in its `children` array ONLY IF those frameworks are highly relevant to the role.' if ecosystem == 'General' else f'The user specifically requested the "{ecosystem}" ecosystem. You MUST strictly exclude any competing backend languages or frameworks that belong to different ecosystems (e.g., do NOT include Java or Python if they asked for MERN, do NOT include .NET if they asked for Django). Additionally, if the requested ecosystem is an acronym (like MERN, MEAN, LAMP, etc.), you MUST explicitly include all the core technologies that make up that stack (e.g. MongoDB, Express, React, Node.js for MERN) as nodes in the roadmap, even if they do not have the highest demand scores in the provided market data.'}
    
    CRITICAL RULES:
    1. The 'skill' field MUST be either one of the Core/Recommended skills listed above OR a Child Framework from the Hierarchical Cluster Mapping. When you include a Parent Technology (like Python or JS), you SHOULD inject its clustered Child Frameworks as nested `children` ONLY IF those frameworks are actually relevant to the target role (e.g. do not inject frontend web frameworks for a Data Science role).
    2. The 'skill' field MUST be a specific, actionable technology or concept (e.g. "React.js", "Docker").
    3. For every alternative in a CHOICE node, you MUST include a `demand_score` field, which is the percentage from the market data provided above.
    4. SEQUENCE THE ROADMAP LOGICALLY: The nodes array MUST be ordered in a proper chronological learning sequence (e.g. Foundations/Languages -> Frameworks/Libraries -> Databases -> Cloud/DevOps -> Advanced Tools). Do NOT just list them randomly.
    
    For each node, provide a `type` field which is either "SINGLE", "CHOICE", or "PARALLEL".
    - If `type` is "SINGLE", provide a `skill` string, and standard `why`, `docs`, `video`, and `topics` fields.
    - If `type` is "CHOICE", it means the user must pick ONLY ONE of the options (e.g. MySQL vs PostgreSQL). Provide a `group_name` string and an `alternatives` array. 
    - If `type` is "PARALLEL", it means the user must learn ALL of the options concurrently (e.g. HTML, CSS, JavaScript, or Pandas and NumPy). Provide a `group_name` string and an `alternatives` array (representing the parallel items).
    - Each item in `alternatives` must have its own `skill`, `why`, `docs`, `video`, `topics`, and `demand_score`. 
    - If an alternative has dependent frameworks from the cluster mapping, include a `children` array inside the alternative containing nested CHOICE, PARALLEL, or SINGLE nodes for those frameworks.
    
    Return EXACTLY in this JSON format:
    {{
        "title": "The {ecosystem} {role} Path",
        "description": "...",
        "detailed_analysis": "Write a 2-3 paragraph detailed markdown report justifying your technology choices. Explain WHY you selected specific frameworks over others based on the demand scores, and provide a high-level architectural view of how these skills fit together for this role.",
        "estimated_months": 6,
        "nodes": [
            {{
                "id": "node_1",
                "type": "SINGLE",
                "skill": "Python",
                "tier": 1,
                "why": "Explanation...",
                "docs": "https://...",
                "video": "https://www.youtube.com/results?search_query=...",
                "topics": [
                    {{"name": "Data Structures", "resource_url": "https://..."}}
                ]
            }},
            {{
                "id": "node_2",
                "type": "CHOICE",
                "group_name": "Programming Languages",
                "tier": 2,
                "alternatives": [
                    {{
                        "skill": "Python",
                        "demand_score": 42,
                        "why": "Explanation...",
                        "docs": "https://...",
                        "video": "https://...",
                        "topics": [ {{"name": "Syntax", "resource_url": "https://..."}} ],
                        "children": [
                            {{
                                "id": "node_2_1",
                                "type": "CHOICE",
                                "group_name": "Python Frameworks",
                                "alternatives": [
                                    {{
                                        "skill": "FastAPI",
                                        "demand_score": 30,
                                        "why": "High performance...",
                                        "docs": "https://...",
                                        "video": "https://...",
                                        "topics": [ {{"name": "Pydantic", "resource_url": "https://..."}} ]
                                    }},
                                    {{
                                        "skill": "Django",
                                        "demand_score": 15,
                                        "why": "Batteries included...",
                                        "docs": "https://...",
                                        "video": "https://...",
                                        "topics": [ {{"name": "ORM", "resource_url": "https://..."}} ]
                                    }}
                                ]
                            }}
                        ]
                    }}
                ]
            }}
        ]
    }}
    
    Do not output any markdown formatting, just the raw JSON.
    """
    
    completion = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.3
    )
    
    try:
        content = completion.choices[0].message.content.strip()
        
        # Log API usage for Groq
        try:
            usage = completion.usage
            total_tokens = usage.total_tokens
            # LLaMa-3 70B cost approx $0.00059 per 1k input, $0.00079 per 1k output
            cost = (usage.prompt_tokens / 1000 * 0.00059) + (usage.completion_tokens / 1000 * 0.00079)
            from database import supabase
            supabase.table("api_usage_logs").insert({
                "provider": "Groq",
                "endpoint": "llama-3.3-70b-versatile",
                "tokens_used": total_tokens,
                "cost_usd": cost
            }).execute()
        except Exception as e:
            print(f"Failed to log Groq usage: {e}")

        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        return json.loads(content)
    except Exception as e:
        print(f"Roadmap JSON parsing failed: {e}")
        raise e

def create_roadmap_pipeline(role: str, ecosystem: str):
    print(f"Starting NLP JD generation pipeline for {ecosystem} {role}")
    
    # 1. Search Web & Fetch JDs
    jds, urls = search_job_market(role, ecosystem)
    
    # 2. Extract Skills and Score via fast NLP matching
    scored_data = nlp_extract_skills(jds)
    
    # 3. Store JDs in database
    from database import supabase
    for jd in jds:
        try:
            supabase.table("industry_intelligence").insert({
                "role_name": role,
                "ecosystem": ecosystem,
                "company_name": jd.get("company_name", "Unknown"),
                "source_url": jd.get("source_url", ""),
                "raw_text": jd.get("jd_text", ""),
                "extracted_skills": jd.get("skills", [])
            }).execute()
        except Exception as e:
            print(f"Failed to insert JD: {e}")
            
    # 4. Generate Roadmap
    roadmap_json = generate_final_roadmap(role, ecosystem, scored_data)
    
    scored_data["sources"] = urls
    
    return {
        "roadmap_json": roadmap_json,
        "analytics": scored_data
    }

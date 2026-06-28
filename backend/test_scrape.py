import os, sys
from dotenv import load_dotenv
sys.path.append('d:/skillgraph/backend/services')
from roadmap_service import search_job_market, nlp_extract_skills

load_dotenv()
jds, urls = search_job_market('Full Stack Developer', 'Python')
print(f"Scraped {len(jds)} JDs")
if jds:
    extracted = nlp_extract_skills(jds)
    for s in extracted["core_skills"]:
        print(f"CORE: {s['skill']} ({s['percentage']}%)")
    for s in extracted["recommended_skills"]:
        print(f"REC: {s['skill']} ({s['percentage']}%)")

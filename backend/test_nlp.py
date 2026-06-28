import os, sys
from dotenv import load_dotenv
from supabase import create_client

sys.path.append('d:/skillgraph/backend/services')
from roadmap_service import nlp_extract_skills

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

res = supabase.table('industry_intelligence').select('*').order('created_at', desc=True).limit(50).execute()
jds = res.data

# We need to map raw_text back to 'jd_text' because nlp_extract_skills expects it
for jd in jds:
    jd['jd_text'] = jd['raw_text']

extracted = nlp_extract_skills(jds)
print("--- CORE SKILLS ---")
for s in extracted["core_skills"]:
    print(f"{s['skill']}: {s['percentage']}%")

print("\n--- RECOMMENDED SKILLS ---")
for s in extracted["recommended_skills"]:
    print(f"{s['skill']}: {s['percentage']}%")

print("\n--- CLUSTER MAP ---")
print(extracted["cluster_map"])

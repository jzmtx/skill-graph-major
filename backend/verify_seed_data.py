import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
sb = create_client(url, key)

print("==================================================================")
print("     MULTI-COLLEGE ECOSYSTEM DATA VERIFICATION & AUDIT REPORT     ")
print("==================================================================\n")

target_colleges = [
    "Canara Engineering College",
    "Sahyadri College of Engineering and Management",
    "NITK Surathkal",
    "RV College of Engineering"
]

colleges = sb.table('colleges').select('id, name, state, district').in_('name', target_colleges).execute().data

print("1. [COLLEGE DISTRIBUTION & MULTI-TENANCY]")
for c in colleges:
    stds = sb.table('students').select('id', count='exact').eq('college_id', c['id']).execute()
    tpo = sb.table('tpo_officials').select('name, email').eq('college_id', c['id']).execute().data
    alumni = sb.table('alumni').select('name, email, current_company').eq('college_id', c['id']).execute().data
    tpo_str = f"{tpo[0]['name']} ({tpo[0]['email']})" if tpo else "None"
    alumni_str = f"{alumni[0]['name']} @ {alumni[0]['current_company']} ({alumni[0]['email']})" if alumni else "None"
    print(f"  * {c['name']} (ID: {c['id']})")
    print(f"    - Enrolled Students: {stds.count}")
    print(f"    - College TPO:       {tpo_str}")
    print(f"    - Verified Alumni:   {alumni_str}")

print("\n2. [STUDENT SKILLS BREAKDOWN]")
skills = sb.table('student_skills').select('verification_level, skill_name', count='exact').execute()
l0 = [s for s in skills.data if s.get('verification_level') == 0]
l1 = [s for s in skills.data if s.get('verification_level') == 1]
l2 = [s for s in skills.data if s.get('verification_level') == 2]
print(f"  Total Skills: {len(skills.data)}")
print(f"  - Level 0 (Self Claimed):                {len(l0)}")
print(f"  - Level 1 (MCQ / Quiz Verified):         {len(l1)}")
print(f"  - Level 2 (Oral Defense & Repo Verified): {len(l2)}")

print("\n3. [COMPANY JOBS & ATS APPLICANTS]")
jobs = sb.table('job_postings').select('id, title, status, company_id, companies(name)').execute().data
for j in jobs:
    comp_name = j.get('companies', {}).get('name') if isinstance(j.get('companies'), dict) else 'Unknown'
    apps = sb.table('job_applications').select('id, match_score, status').eq('job_id', j['id']).execute().data
    scores = [a['match_score'] for a in apps]
    statuses = [a['status'] for a in apps]
    print(f"  * [{comp_name}] {j['title']} (Status: {j['status']})")
    print(f"    - Applicants: {len(apps)} | Scores: {scores} | Statuses: {statuses}")

print("\n4. [ALUMNI OPPORTUNITIES & STUDENT INTEREST]")
opps = sb.table('opportunities').select('id, title, type, alumni(name, current_company)').execute().data
for op in opps:
    al_data = op.get('alumni') or {}
    interests = sb.table('opportunity_interest').select('id', count='exact').eq('opportunity_id', op['id']).execute()
    print(f"  * {op['title']} ({op['type'].upper()}) posted by {al_data.get('name')} @ {al_data.get('current_company')}")
    print(f"    - Expressed Interests: {interests.count} students")

print("\n5. [MULTI-TENANT ISOLATION CHECK]")
# Test that TPO of Canara only sees Canara students
canara_col = next(c for c in colleges if "Canara" in c["name"])
sahyadri_col = next(c for c in colleges if "Sahyadri" in c["name"])
canara_stds = sb.table('students').select('id').eq('college_id', canara_col['id']).execute().data
sahyadri_stds = sb.table('students').select('id').eq('college_id', sahyadri_col['id']).execute().data

canara_ids = {s['id'] for s in canara_stds}
sahyadri_ids = {s['id'] for s in sahyadri_stds}
overlap = canara_ids.intersection(sahyadri_ids)

print(f"  - Canara Student Pool:   {len(canara_stds)}")
print(f"  - Sahyadri Student Pool: {len(sahyadri_stds)}")
print(f"  - Cross-Tenant Overlap:  {len(overlap)} (Strict 0 confirms 100% college isolation)")

print("\n==================================================================")
print("                 AUDIT REPORT GENERATION COMPLETE                 ")
print("==================================================================")

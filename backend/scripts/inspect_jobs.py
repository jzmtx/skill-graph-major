import requests

BASE = 'http://localhost:8000/api'
res_rec = requests.post(f'{BASE}/company/login', json={'email': 'recruiter.google@skillgraph-demo.com', 'password': 'Recruiter.google@123'}).json()
auth_id = res_rec['auth_id']
jobs = requests.get(f'{BASE}/company/jobs/{auth_id}').json().get('jobs', [])
for j in jobs:
    app_res = requests.get(f'{BASE}/company/jobs/{auth_id}/{j["id"]}/applicants').json()
    apps = app_res.get('applicants', [])
    print(f"ID: {j['id']} | Title: {j['title']} | Apps: {len(apps)} | Vacancies: {j.get('vacancies')} | Quota: {j.get('max_shortlist_count')} | Closed: {j.get('is_deadline_passed')}")
    for i, a in enumerate(apps):
        st = a.get('students') or {}
        print(f"   Candidate #{i+1}: {st.get('name')} ({st.get('email')}) | Score: {a.get('match_score')}% | Status: {a.get('status')}")

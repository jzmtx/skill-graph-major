import requests

BASE = 'http://localhost:8000/api'

# 1. Login Eligible Student
res_el = requests.post(f'{BASE}/auth/login', json={'email': 'student.eligible@skillgraph-demo.com', 'password': 'Student.eligible@123'})
print('1. Eligible student login status:', res_el.status_code)
el_id = res_el.json().get('user', {}).get('id')

# 2. Check Job Eligibility for Eligible Student
jobs_el = requests.get(f'{BASE}/company/student/jobs/all?student_id={el_id}').json().get('jobs', [])
for j in jobs_el[:2]:
    print(f"   [Eligible View] {j['title']}: is_eligible={j.get('is_eligible')}, match_score={j.get('match_score')}%")

# 3. Login Ineligible Student
res_inel = requests.post(f'{BASE}/auth/login', json={'email': 'student.ineligible@skillgraph-demo.com', 'password': 'Student.ineligible@123'})
print('\n2. Ineligible student login status:', res_inel.status_code)
inel_id = res_inel.json().get('user', {}).get('id')

# 4. Check Job Eligibility for Ineligible Student
jobs_inel = requests.get(f'{BASE}/company/student/jobs/all?student_id={inel_id}').json().get('jobs', [])
for j in jobs_inel[:2]:
    print(f"   [Ineligible View] {j['title']}: is_eligible={j.get('is_eligible')}, match_score={j.get('match_score')}%")
    print(f"      Missing Requirements: {j.get('missing_requirements')}")

# 5. Login Recruiter
res_rec = requests.post(f'{BASE}/company/login', json={'email': 'recruiter.google@skillgraph-demo.com', 'password': 'Recruiter.google@123'})
print('\n3. Recruiter login status:', res_rec.status_code)
rec_auth_id = res_rec.json().get('auth_id')

# 6. Recruiter view applicants for Job 1
rec_jobs = requests.get(f'{BASE}/company/jobs/{rec_auth_id}').json().get('jobs', [])
if rec_jobs:
    j1 = rec_jobs[0]
    app_res = requests.get(f'{BASE}/company/jobs/{rec_auth_id}/{j1["id"]}/applicants').json()
    apps = app_res.get('applicants', [])
    print(f"   [Recruiter Job] {j1['title']}: vacancies={j1.get('vacancies')}, quota={j1.get('max_shortlist_count')}, deadline_passed={j1.get('is_deadline_passed')}")
    print(f"   Total Applicants: {len(apps)}")
    for i, a in enumerate(apps):
        st = a.get('students', {})
        print(f"     Rank #{i+1}: {st.get('name')} | Score: {a.get('match_score')}% | Status: {a.get('status')}")

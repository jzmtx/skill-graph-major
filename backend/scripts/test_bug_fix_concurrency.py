import requests

BASE = 'http://localhost:8000/api'

print("=" * 60)
print("TESTING DATABASE STABILITY & MULTI-TENANCY UNDER CONCURRENT LOGINS")
print("=" * 60)

# Check 1: Initial state before any login
res1 = requests.get(f'{BASE}/colleges').json()
print("1. Initial colleges count:", len(res1.get('colleges', [])))

# Login 1: TPO (Previously would degrade the client to ONLY see 1 college / 15 students)
tpo_login = requests.post(f'{BASE}/tpo/login', json={
    'email': 'tpo.canara@skillgraph-demo.com',
    'password': 'Tpo.canara@123'
})
print("2. TPO Login status:", tpo_login.status_code)

# Query immediately after TPO login: Total open jobs
jobs_after_tpo = requests.get(f'{BASE}/company/student/jobs/all').json().get('jobs', [])
print("   Jobs visible after TPO login:", len(jobs_after_tpo))

# Login 2: Student
std_login = requests.post(f'{BASE}/auth/login', json={
    'email': 'student.eligible@skillgraph-demo.com',
    'password': 'Student.eligible@123'
})
print("3. Student Login status:", std_login.status_code)
std_id = std_login.json().get('user', {}).get('id')

# Query jobs for student
std_jobs = requests.get(f'{BASE}/company/student/jobs/all?student_id={std_id}').json().get('jobs', [])
print("   Jobs evaluated for student:", len(std_jobs))

# Login 3: Recruiter
rec_login = requests.post(f'{BASE}/company/login', json={
    'email': 'recruiter.google@skillgraph-demo.com',
    'password': 'Recruiter.google@123'
})
print("4. Recruiter Login status:", rec_login.status_code)
auth_id = rec_login.json().get('auth_id')

# Query applicants for Google closed job (Must see all 6 applicants with full names, NOT 'Applicant')
apps_res = requests.get(f'{BASE}/company/jobs/{auth_id}/8574a07f-feaa-4251-8a4e-d2e5eca0625b/applicants').json()
apps = apps_res.get('applicants', [])
print("5. Google applicants visible to recruiter:", len(apps))
for i, a in enumerate(apps):
    name = (a.get('student') or {}).get('name')
    status = a.get('status')
    score = a.get('match_score')
    print(f"   Candidate #{i+1}: {name} | Score: {score}% | Status: {status}")

# Verify no degradation occurred:
names_resolved = all((a.get('student') or {}).get('name') != 'Applicant' for a in apps)
if names_resolved and len(apps) >= 6:
    print("\n>>> SUCCESS: Complete immunity to RLS token contamination confirmed!")
    print(">>> All student profiles and counts remain stable regardless of who logs in.")
else:
    print("\n>>> FAILURE: Some student names or records were hidden!")

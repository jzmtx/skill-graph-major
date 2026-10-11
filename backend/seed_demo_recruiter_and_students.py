import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
supabase = create_client(url, key)

def get_or_create_auth_user(email: str, password: str = None) -> str:
    if not password:
        prefix = email.split('@')[0]
        password = f"{prefix.capitalize()}@123"
        
    try:
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        if res.user:
            return res.user.id
    except Exception:
        pass

    try:
        users_resp = supabase.auth.admin.list_users()
        user_list = users_resp if isinstance(users_resp, list) else getattr(users_resp, 'users', [])
        for u in user_list:
            u_email = getattr(u, 'email', None) or (u.get('email') if isinstance(u, dict) else '')
            u_id = getattr(u, 'id', None) or (u.get('id') if isinstance(u, dict) else '')
            if u_email.lower() == email.lower():
                try:
                    supabase.auth.admin.update_user_by_id(u_id, {"password": password})
                except Exception:
                    pass
                return u_id
    except Exception as e:
        print(f"Warning finding auth user for {email}: {e}")

    return None

def seed_demo_accounts():
    print("=" * 65)
    print(" SEEDING DEMO RECRUITER & STUDENT ACCOUNTS FOR EVALUATION/VIVA")
    print("=" * 65)

    # 1. Fetch Colleges
    colleges_res = supabase.table("colleges").select("*").execute()
    colleges = colleges_res.data or []
    if not colleges:
        print("Error: No colleges found. Please run seed_all_ecosystem_data.py first.")
        return
    
    canara_col = next((c for c in colleges if "Canara" in c["name"]), colleges[0])
    sahyadri_col = next((c for c in colleges if "Sahyadri" in c["name"]), colleges[1] if len(colleges) > 1 else colleges[0])

    print(f"\n1. Using College: {canara_col['name']} (ID: {canara_col['id']})")

    # 2. SEED DEMO STUDENTS
    # -------------------------------------------------------------
    # Student A: ELIGIBLE STUDENT (Can apply to active jobs, already applied and shortlisted in closed job)
    # -------------------------------------------------------------
    eligible_email = "student.eligible@skillgraph-demo.com"
    eligible_pwd = "Student.eligible@123"
    eligible_auth_id = get_or_create_auth_user(eligible_email, eligible_pwd)
    
    st_exist = supabase.table("students").select("*").eq("email", eligible_email).execute()
    if st_exist.data:
        st_eligible = st_exist.data[0]
        supabase.table("students").update({
            "auth_id": eligible_auth_id,
            "college_id": canara_col["id"],
            "name": "Arjun Sharma (Eligible Candidate)",
            "branch": "Computer Science and Engineering",
            "year": 2025,
            "usn": "4CB21CS001",
            "is_verified": True
        }).eq("id", st_eligible["id"]).execute()
        print(f"  [Student] Updated Eligible Student: {eligible_email} | Password: {eligible_pwd}")
    else:
        st_ins = supabase.table("students").insert({
            "auth_id": eligible_auth_id,
            "college_id": canara_col["id"],
            "name": "Arjun Sharma (Eligible Candidate)",
            "email": eligible_email,
            "branch": "Computer Science and Engineering",
            "year": 2025,
            "usn": "4CB21CS001",
            "phone": "+91 9845112233",
            "github_url": "https://github.com/arjun-sharma-dev",
            "linkedin_url": "https://linkedin.com/in/arjun-sharma-dev",
            "is_verified": True
        }).execute()
        st_eligible = st_ins.data[0]
        print(f"  [Student] Created Eligible Student: {eligible_email} | Password: {eligible_pwd}")

    # Seed top skills for Eligible Student
    supabase.table("student_skills").delete().eq("student_id", st_eligible["id"]).execute()
    eligible_skills = [
        {"skill_name": "Docker", "verification_level": 2, "skill_score": 95},
        {"skill_name": "Python", "verification_level": 2, "skill_score": 92},
        {"skill_name": "FastAPI", "verification_level": 1, "skill_score": 88},
        {"skill_name": "React", "verification_level": 2, "skill_score": 90},
        {"skill_name": "TypeScript", "verification_level": 1, "skill_score": 85},
        {"skill_name": "PostgreSQL", "verification_level": 1, "skill_score": 86}
    ]
    for s in eligible_skills:
        supabase.table("student_skills").insert({
            "student_id": st_eligible["id"],
            "skill_name": s["skill_name"],
            "verification_level": s["verification_level"],
            "skill_score": s["skill_score"],
            "created_at": datetime.now().isoformat()
        }).execute()
    print(f"    -> Seeded {len(eligible_skills)} verified Level 1/2 skills for Eligible Student")

    # -------------------------------------------------------------
    # Student B: INELIGIBLE STUDENT (Has only low self-claimed skills, cannot pass 50% threshold)
    # -------------------------------------------------------------
    ineligible_email = "student.ineligible@skillgraph-demo.com"
    ineligible_pwd = "Student.ineligible@123"
    ineligible_auth_id = get_or_create_auth_user(ineligible_email, ineligible_pwd)

    st_in_exist = supabase.table("students").select("*").eq("email", ineligible_email).execute()
    if st_in_exist.data:
        st_ineligible = st_in_exist.data[0]
        supabase.table("students").update({
            "auth_id": ineligible_auth_id,
            "college_id": canara_col["id"],
            "name": "Rohan Verma (Ineligible Student)",
            "branch": "Mechanical Engineering",
            "year": 2026,
            "usn": "4CB22ME099",
            "is_verified": True
        }).eq("id", st_ineligible["id"]).execute()
        print(f"  [Student] Updated Ineligible Student: {ineligible_email} | Password: {ineligible_pwd}")
    else:
        st_ins2 = supabase.table("students").insert({
            "auth_id": ineligible_auth_id,
            "college_id": canara_col["id"],
            "name": "Rohan Verma (Ineligible Student)",
            "email": ineligible_email,
            "branch": "Mechanical Engineering",
            "year": 2026,
            "usn": "4CB22ME099",
            "phone": "+91 9845998877",
            "github_url": "https://github.com/rohan-verma-student",
            "linkedin_url": "https://linkedin.com/in/rohan-verma-student",
            "is_verified": True
        }).execute()
        st_ineligible = st_ins2.data[0]
        print(f"  [Student] Created Ineligible Student: {ineligible_email} | Password: {ineligible_pwd}")

    # Seed only basic level 0 unrelated skills for Ineligible Student
    supabase.table("student_skills").delete().eq("student_id", st_ineligible["id"]).execute()
    ineligible_skills = [
        {"skill_name": "MongoDB", "verification_level": 0, "skill_score": 30},
        {"skill_name": "HTML", "verification_level": 0, "skill_score": 25}
    ]
    for s in ineligible_skills:
        supabase.table("student_skills").insert({
            "student_id": st_ineligible["id"],
            "skill_name": s["skill_name"],
            "verification_level": s["verification_level"],
            "skill_score": s["skill_score"],
            "created_at": datetime.now().isoformat()
        }).execute()
    print(f"    -> Seeded {len(ineligible_skills)} Level 0 basic skills for Ineligible Student")

    # -------------------------------------------------------------
    # 3. SEED 5 MORE DIVERSE APPLICANTS FOR SHORTLISTING SHOWCASE
    # -------------------------------------------------------------
    print("\n2. Seeding Pool of Applicants for ATS Pipeline...")
    applicant_configs = [
        {
            "name": "Priya Rao",
            "email": "priya.rao@skillgraph-demo.com",
            "usn": "4CB21CS042",
            "branch": "Computer Science and Engineering",
            "skills": [
                {"skill_name": "Docker", "level": 2, "score": 90},
                {"skill_name": "Python", "level": 2, "score": 88},
                {"skill_name": "FastAPI", "level": 1, "score": 85}
            ],
            "app_score": 89,
            "status": "shortlisted"
        },
        {
            "name": "Rahul Shetty",
            "email": "rahul.shetty@skillgraph-demo.com",
            "usn": "4CB21CS056",
            "branch": "Information Science and Engineering",
            "skills": [
                {"skill_name": "Docker", "level": 2, "score": 85},
                {"skill_name": "Python", "level": 2, "score": 84},
                {"skill_name": "FastAPI", "level": 1, "score": 80}
            ],
            "app_score": 84,
            "status": "shortlisted"
        },
        {
            "name": "Ananya Hegde",
            "email": "ananya.hegde@skillgraph-demo.com",
            "usn": "4CB21CS012",
            "branch": "Artificial Intelligence and Machine Learning",
            "skills": [
                {"skill_name": "Docker", "level": 1, "score": 78},
                {"skill_name": "Python", "level": 2, "score": 82},
                {"skill_name": "FastAPI", "level": 1, "score": 75}
            ],
            "app_score": 76,
            "status": "shortlisted"
        },
        {
            "name": "Bhuvan Nayak",
            "email": "bhuvan.nayak@skillgraph-demo.com",
            "usn": "4CB21CS028",
            "branch": "Computer Science and Engineering",
            "skills": [
                {"skill_name": "Docker", "level": 1, "score": 62},
                {"skill_name": "Python", "level": 1, "score": 65},
                {"skill_name": "FastAPI", "level": 0, "score": 40}
            ],
            "app_score": 60,
            "status": "applied"
        },
        {
            "name": "Divya Bhat",
            "email": "divya.bhat@skillgraph-demo.com",
            "usn": "4CB21CS035",
            "branch": "Electronics and Communication Engineering",
            "skills": [
                {"skill_name": "Docker", "level": 0, "score": 35},
                {"skill_name": "Python", "level": 1, "score": 55},
                {"skill_name": "FastAPI", "level": 1, "score": 52}
            ],
            "app_score": 52,
            "status": "applied"
        }
    ]

    applicant_records = [
        {"student": st_eligible, "app_score": 94, "status": "shortlisted"}
    ]

    for conf in applicant_configs:
        auth_id = get_or_create_auth_user(conf["email"])
        s_ex = supabase.table("students").select("*").eq("email", conf["email"]).execute()
        if s_ex.data:
            cand = s_ex.data[0]
            supabase.table("students").update({
                "auth_id": auth_id,
                "college_id": canara_col["id"],
                "name": conf["name"],
                "branch": conf["branch"],
                "year": 2025,
                "usn": conf["usn"],
                "is_verified": True
            }).eq("id", cand["id"]).execute()
        else:
            cand_ins = supabase.table("students").insert({
                "auth_id": auth_id,
                "college_id": canara_col["id"],
                "name": conf["name"],
                "email": conf["email"],
                "branch": conf["branch"],
                "year": 2025,
                "usn": conf["usn"],
                "phone": "+91 9845000000",
                "is_verified": True
            }).execute()
            cand = cand_ins.data[0]

        # skills
        supabase.table("student_skills").delete().eq("student_id", cand["id"]).execute()
        for sk in conf["skills"]:
            supabase.table("student_skills").insert({
                "student_id": cand["id"],
                "skill_name": sk["skill_name"],
                "verification_level": sk["level"],
                "skill_score": sk["score"],
                "created_at": datetime.now().isoformat()
            }).execute()

        applicant_records.append({
            "student": cand,
            "app_score": conf["app_score"],
            "status": conf["status"]
        })
        print(f"  [Applicant] Ready: {conf['name']} ({conf['email']}) - Score: {conf['app_score']}%")

    # -------------------------------------------------------------
    # 4. COMPANY & JOBS SETUP
    # -------------------------------------------------------------
    print("\n3. Setting Up Company & Gated Job Postings...")
    
    # 4A. Google India (Registration Closed, AI ATS Shortlisting Showcase)
    google_comp = supabase.table("companies").select("*").eq("name", "Google India").execute()
    if not google_comp.data:
        g_ins = supabase.table("companies").insert({
            "name": "Google India",
            "industry": "Cloud & AI",
            "website": "https://careers.google.com",
            "is_verified": True
        }).execute()
        google_rec = g_ins.data[0]
    else:
        google_rec = google_comp.data[0]

    # Recruiter
    recruiter_email = "recruiter.google@skillgraph-demo.com"
    recruiter_pwd = "Recruiter.google@123"
    r_auth_id = get_or_create_auth_user(recruiter_email, recruiter_pwd)
    r_exist = supabase.table("recruiters").select("*").eq("email", recruiter_email).execute()
    if r_exist.data:
        supabase.table("recruiters").update({
            "auth_id": r_auth_id,
            "company_id": google_rec["id"],
            "name": "Pooja Varma"
        }).eq("id", r_exist.data[0]["id"]).execute()
        rec_rec = r_exist.data[0]
    else:
        r_ins = supabase.table("recruiters").insert({
            "auth_id": r_auth_id,
            "company_id": google_rec["id"],
            "name": "Pooja Varma",
            "email": recruiter_email
        }).execute()
        rec_rec = r_ins.data[0]
    print(f"  [Recruiter] Google India: {recruiter_email} | Password: {recruiter_pwd}")

    # Job 1: Cloud Backend Systems Engineer
    # Vacancies: 2, Screening Quota: 4 (double vacancies), Deadline: Passed (2026-10-09)
    two_days_ago = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
    google_job_skills = [
        {"skill_name": "Docker", "level": 2},
        {"skill_name": "Python", "level": 2},
        {"skill_name": "FastAPI", "level": 1},
        {
            "_meta": {
                "vacancies": 2,
                "max_shortlist_count": 4,
                "deadline": two_days_ago
            }
        }
    ]

    job1_exist = supabase.table("job_postings").select("*").eq("company_id", google_rec["id"]).eq("title", "Cloud Backend Systems Engineer").execute()
    if job1_exist.data:
        job1 = job1_exist.data[0]
        supabase.table("job_postings").update({
            "description": "Build high-throughput containerized cloud services. Requires verified Docker containerization and Python backend microservices experience.",
            "required_skills": google_job_skills,
            "status": "open"
        }).eq("id", job1["id"]).execute()
        print(f"  [Job 1] Updated Google Job (Vacancies: 2, Quota: 4, Deadline: {two_days_ago} [CLOSED])")
    else:
        j_ins = supabase.table("job_postings").insert({
            "company_id": google_rec["id"],
            "title": "Cloud Backend Systems Engineer",
            "description": "Build high-throughput containerized cloud services. Requires verified Docker containerization and Python backend microservices experience.",
            "required_skills": google_job_skills,
            "status": "open"
        }).execute()
        job1 = j_ins.data[0]
        print(f"  [Job 1] Created Google Job (Vacancies: 2, Quota: 4, Deadline: {two_days_ago} [CLOSED])")

    # Seed Applications for Job 1
    # 6 applicants total: Top 4 are shortlisted, remaining 2 are applied
    supabase.table("job_applications").delete().eq("job_id", job1["id"]).execute()
    for app in applicant_records:
        cand = app["student"]
        score = app["app_score"]
        status = app["status"]
        supabase.table("job_applications").insert({
            "job_id": job1["id"],
            "student_id": cand["id"],
            "resume_url": f"https://skillgraph.storage/resumes/{cand['id']}.pdf",
            "cover_letter": f"Passionate backend developer with verified Docker and Python microservices experience. Overall Score: {score}%.",
            "match_score": score,
            "status": status
        }).execute()
    print(f"    -> Seeded {len(applicant_records)} applications for Job 1 (4 Shortlisted, 2 Applied)")

    # 4B. Microsoft IDC (Registration OPEN, Active Apply for Eligible Student)
    # Vacancies: 3, Screening Quota: 6, Deadline: Next month (2026-11-15)
    ms_comp = supabase.table("companies").select("*").eq("name", "Microsoft IDC").execute()
    if not ms_comp.data:
        m_ins = supabase.table("companies").insert({
            "name": "Microsoft IDC",
            "industry": "Enterprise Cloud",
            "website": "https://careers.microsoft.com",
            "is_verified": True
        }).execute()
        ms_rec = m_ins.data[0]
    else:
        ms_rec = ms_comp.data[0]

    # Recruiter Microsoft
    ms_recruiter_email = "recruiter.microsoft@skillgraph-demo.com"
    ms_recruiter_pwd = "Recruiter.microsoft@123"
    ms_r_auth = get_or_create_auth_user(ms_recruiter_email, ms_recruiter_pwd)
    ms_r_exist = supabase.table("recruiters").select("*").eq("email", ms_recruiter_email).execute()
    if ms_r_exist.data:
        supabase.table("recruiters").update({
            "auth_id": ms_r_auth,
            "company_id": ms_rec["id"],
            "name": "Rahul Nair"
        }).eq("id", ms_r_exist.data[0]["id"]).execute()
    else:
        supabase.table("recruiters").insert({
            "auth_id": ms_r_auth,
            "company_id": ms_rec["id"],
            "name": "Rahul Nair",
            "email": ms_recruiter_email
        }).execute()

    next_month = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    ms_job_skills = [
        {"skill_name": "React", "level": 2},
        {"skill_name": "TypeScript", "level": 1},
        {"skill_name": "PostgreSQL", "level": 1},
        {
            "_meta": {
                "vacancies": 3,
                "max_shortlist_count": 6,
                "deadline": next_month
            }
        }
    ]

    job2_exist = supabase.table("job_postings").select("*").eq("company_id", ms_rec["id"]).eq("title", "Fullstack Cloud Platform Engineer").execute()
    if job2_exist.data:
        job2 = job2_exist.data[0]
        supabase.table("job_postings").update({
            "description": "Develop mission-critical cloud web applications with React, TypeScript, and modern relational databases.",
            "required_skills": ms_job_skills,
            "status": "open"
        }).eq("id", job2["id"]).execute()
        print(f"  [Job 2] Updated Microsoft Job (Vacancies: 3, Quota: 6, Deadline: {next_month} [OPEN])")
    else:
        j2_ins = supabase.table("job_postings").insert({
            "company_id": ms_rec["id"],
            "title": "Fullstack Cloud Platform Engineer",
            "description": "Develop mission-critical cloud web applications with React, TypeScript, and modern relational databases.",
            "required_skills": ms_job_skills,
            "status": "open"
        }).execute()
        job2 = j2_ins.data[0]
        print(f"  [Job 2] Created Microsoft Job (Vacancies: 3, Quota: 6, Deadline: {next_month} [OPEN])")

    # Make sure Eligible Student has NOT applied to Job 2 yet (so the user can click 'Apply Now' live in the demo!)
    supabase.table("job_applications").delete().eq("job_id", job2["id"]).eq("student_id", st_eligible["id"]).execute()
    print("    -> Cleared Eligible student from Job 2 so 'Apply Now' is ready to test live!")

    print("\n" + "=" * 65)
    print(" DEMO SEEDING COMPLETE! CREDENTIALS READY FOR LIVE PRESENTATION")
    print("=" * 65)
    print("\n[1] RECRUITER ACCOUNT (Google India):")
    print(f"    Email:    {recruiter_email}")
    print(f"    Password: {recruiter_pwd}")
    print("    Role:     Recruiter (Company)")
    print("    Demo:     View 'Cloud Backend Systems Engineer' -> Registration is Closed.")
    print("              Top 4 candidates auto-shortlisted (out of 6) with Shortlisted Rank badges!")

    print("\n[2] ELIGIBLE STUDENT ACCOUNT:")
    print(f"    Email:    {eligible_email}")
    print(f"    Password: {eligible_pwd}")
    print("    Role:     Student")
    print("    Demo:     View Job Board -> 'Fullstack Cloud Platform Engineer' has ~90% match.")
    print("              Apply button is active -> Student can submit application!")

    print("\n[3] INELIGIBLE STUDENT ACCOUNT:")
    print(f"    Email:    {ineligible_email}")
    print(f"    Password: {ineligible_pwd}")
    print("    Role:     Student")
    print("    Demo:     View Job Board -> Sees full JD, but Apply button is DISABLED ('Ineligible to Apply').")
    print("              Shows missing skill tags (Requires React L2, TypeScript L1).")
    print("              Switch to 'Alumni Referrals' tab -> Anyone can apply!")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    seed_demo_accounts()

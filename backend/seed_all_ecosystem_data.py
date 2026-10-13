import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
supabase = create_client(url, key)

def get_default_password(email: str) -> str:
    """Password rule: if email is prefix@domain, password is Prefix@123"""
    prefix = email.split('@')[0]
    return f"{prefix.capitalize()}@123"

def get_or_create_auth_user(email: str) -> str:
    password = get_default_password(email)
    try:
        # Check if already exists in auth
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        if res.user:
            return res.user.id
    except Exception as e:
        # User may already exist, let's look them up via list_users
        err_str = str(e)
        pass
    
    # Try finding in auth user list
    try:
        users = supabase.auth.admin.list_users()
        for u in users:
            if u.email.lower() == email.lower():
                # update password to ensure it matches the formula
                try:
                    supabase.auth.admin.update_user_by_id(u.id, {"password": password})
                except Exception:
                    pass
                return u.id
    except Exception as e:
        print(f"Warning searching users for {email}: {e}")
        
    return None

COLLEGES_DATA = [
    {"name": "Canara Engineering College", "state": "Karnataka", "district": "Dakshina Kannada", "code": "CB"},
    {"name": "Sahyadri College of Engineering and Management", "state": "Karnataka", "district": "Dakshina Kannada", "code": "SF"},
    {"name": "NITK Surathkal", "state": "Karnataka", "district": "Dakshina Kannada", "code": "NITK"},
    {"name": "RV College of Engineering", "state": "Karnataka", "district": "Bengaluru", "code": "RV"}
]

BRANCHES = [
    "Computer Science and Engineering",
    "Information Science and Engineering",
    "Artificial Intelligence and Machine Learning",
    "Electronics and Communication Engineering"
]

SKILLS_POOL = [
    "React", "Nodejs", "Python", "Docker", "PostgreSQL", 
    "AWS", "FastAPI", "MongoDB", "TypeScript", "Next.js", "Java", "Kubernetes"
]

FIRST_NAMES = [
    "Aarav", "Aditya", "Akash", "Ananya", "Arjun", "Bhuvan", "Chetan", "Deepak",
    "Divya", "Ganesh", "Kavya", "Manish", "Neha", "Nikhil", "Pooja", "Priya",
    "Rahul", "Rakesh", "Rohan", "Sneha", "Suman", "Varun", "Vikas", "Yash"
]

LAST_NAMES = [
    "Sharma", "Shetty", "Rao", "Patil", "Gowda", "Bhat", "Hegde", "Pai",
    "Kumar", "Deshmukh", "Nayak", "Kamat", "Prabhu", "Kulkarni", "Verma"
]

def generate_random_date(days_back=30):
    random_days = random.randint(0, days_back)
    random_hours = random.randint(0, 23)
    random_date = datetime.now() - timedelta(days=random_days, hours=random_hours)
    return random_date.isoformat() + "Z"

def seed_all_ecosystem():
    print("=================================================================")
    print(" STARTING COMPREHENSIVE MULTI-COLLEGE ECOSYSTEM SEEDING")
    print("=================================================================\n")

    # -------------------------------------------------------------
    # 1. COLLEGES
    # -------------------------------------------------------------
    print(" [Step 1/7] Ensuring 4 Distinct Colleges...")
    college_map = {} # name -> college record
    for c_info in COLLEGES_DATA:
        existing = supabase.table("colleges").select("*").eq("name", c_info["name"]).execute()
        if existing.data:
            c_rec = existing.data[0]
            # Ensure it is approved
            if not c_rec.get("is_approved"):
                supabase.table("colleges").update({"is_approved": True}).eq("id", c_rec["id"]).execute()
            college_map[c_info["name"]] = c_rec
            print(f"   Found College: {c_info['name']} (ID: {c_rec['id']})")
        else:
            inserted = supabase.table("colleges").insert({
                "name": c_info["name"],
                "state": c_info["state"],
                "district": c_info["district"],
                "is_approved": True
            }).execute()
            c_rec = inserted.data[0]
            college_map[c_info["name"]] = c_rec
            print(f"  + Created College: {c_info['name']} (ID: {c_rec['id']})")

    # -------------------------------------------------------------
    # 2. TPO OFFICIALS (1 per College, Verified)
    # -------------------------------------------------------------
    print("\n [Step 2/7] Seeding Verified TPO Officials (1 per college)...")
    tpo_seed_info = [
        {
            "college_name": "Canara Engineering College",
            "name": "Prof. Amar Sharma",
            "email": "tpo.canara@skillgraph-demo.com",
            "designation": "Head of Training & Placement"
        },
        {
            "college_name": "Sahyadri College of Engineering and Management",
            "name": "Dr. Rajesh Shetty",
            "email": "tpo.sahyadri@skillgraph-demo.com",
            "designation": "Chief Placement Officer"
        },
        {
            "college_name": "NITK Surathkal",
            "name": "Dr. K. V. Rao",
            "email": "tpo.nitk@skillgraph-demo.com",
            "designation": "Dean of Career Development"
        },
        {
            "college_name": "RV College of Engineering",
            "name": "Prof. Ananya Hegde",
            "email": "tpo.rvce@skillgraph-demo.com",
            "designation": "Director of Industry Relations & TPO"
        }
    ]

    tpo_map = {}
    for t_data in tpo_seed_info:
        c_rec = college_map[t_data["college_name"]]
        auth_id = get_or_create_auth_user(t_data["email"])
        
        # Check if tpo record exists
        existing = supabase.table("tpo_officials").select("*").eq("email", t_data["email"]).execute()
        if existing.data:
            supabase.table("tpo_officials").update({
                "auth_id": auth_id,
                "college_id": c_rec["id"],
                "name": t_data["name"],
                "designation": t_data["designation"],
                "is_verified": True
            }).eq("id", existing.data[0]["id"]).execute()
            tpo_rec = existing.data[0]
            print(f"   Updated TPO: {t_data['name']} ({t_data['email']}) for {t_data['college_name']}")
        else:
            inserted = supabase.table("tpo_officials").insert({
                "auth_id": auth_id,
                "college_id": c_rec["id"],
                "name": t_data["name"],
                "email": t_data["email"],
                "designation": t_data["designation"],
                "is_verified": True
            }).execute()
            tpo_rec = inserted.data[0]
            print(f"  + Created TPO: {t_data['name']} ({t_data['email']}) for {t_data['college_name']}")
        tpo_map[t_data["college_name"]] = tpo_rec

    # -------------------------------------------------------------
    # 3. ALUMNI (1 per College, Verified, with Company & Roles)
    # -------------------------------------------------------------
    print("\n [Step 3/7] Seeding Verified Alumni (1 per college)...")
    alumni_seed_info = [
        {
            "college_name": "Canara Engineering College",
            "name": "Thejas Rao",
            "email": "alumni.canara@skillgraph-demo.com",
            "company": "Microsoft",
            "role": "Software Development Engineer II",
            "passout_year": 2022,
            "linkedin": "https://linkedin.com/in/thejas-rao",
            "opp_title": "Microsoft Azure Cloud Team - SDE Referral",
            "opp_desc": "Looking for strong backend engineers with Docker & Python/FastAPI knowledge for our Azure Core team.",
            "opp_type": "referral"
        },
        {
            "college_name": "Sahyadri College of Engineering and Management",
            "name": "Kavya Patil",
            "email": "alumni.sahyadri@skillgraph-demo.com",
            "company": "Razorpay",
            "role": "Senior Frontend Engineer",
            "passout_year": 2023,
            "linkedin": "https://linkedin.com/in/kavya-patil",
            "opp_title": "Razorpay Frontend Engineering Internship",
            "opp_desc": "Summer internship opening for React, TypeScript, and Next.js developers interested in high-scale payment dashboards.",
            "opp_type": "internship"
        },
        {
            "college_name": "NITK Surathkal",
            "name": "Rohan Deshmukh",
            "email": "alumni.nitk@skillgraph-demo.com",
            "company": "Amazon AWS",
            "role": "Cloud Solutions Architect",
            "passout_year": 2021,
            "linkedin": "https://linkedin.com/in/rohan-deshmukh",
            "opp_title": "AWS Cloud Architecture Mentorship & Referral",
            "opp_desc": "Offering 1-on-1 mentorship on distributed systems and container orchestration (Docker/K8s) with referral for AWS SDE-1.",
            "opp_type": "mentorship"
        },
        {
            "college_name": "RV College of Engineering",
            "name": "Aditya Bhatt",
            "email": "alumni.rvce@skillgraph-demo.com",
            "company": "Google",
            "role": "Machine Learning Engineer",
            "passout_year": 2022,
            "linkedin": "https://linkedin.com/in/aditya-bhatt",
            "opp_title": "Google AI Systems Internship Referral",
            "opp_desc": "Open referral for pre-final and final year students with verified Python, FastAPI, and data pipeline skills.",
            "opp_type": "referral"
        }
    ]

    alumni_map = {}
    opportunities_list = []
    for a_data in alumni_seed_info:
        c_rec = college_map[a_data["college_name"]]
        auth_id = get_or_create_auth_user(a_data["email"])
        
        existing = supabase.table("alumni").select("*").eq("email", a_data["email"]).execute()
        if existing.data:
            supabase.table("alumni").update({
                "auth_id": auth_id,
                "college_id": c_rec["id"],
                "name": a_data["name"],
                "passout_year": a_data["passout_year"],
                "current_company": a_data["company"],
                "current_job_role": a_data["role"],
                "linkedin_url": a_data["linkedin"],
                "is_verified": True
            }).eq("id", existing.data[0]["id"]).execute()
            alumni_rec = existing.data[0]
            print(f"   Updated Alumni: {a_data['name']} ({a_data['email']}) - {a_data['company']}")
        else:
            inserted = supabase.table("alumni").insert({
                "auth_id": auth_id,
                "college_id": c_rec["id"],
                "name": a_data["name"],
                "email": a_data["email"],
                "passout_year": a_data["passout_year"],
                "current_company": a_data["company"],
                "current_job_role": a_data["role"],
                "linkedin_url": a_data["linkedin"],
                "is_verified": True
            }).execute()
            alumni_rec = inserted.data[0]
            print(f"  + Created Alumni: {a_data['name']} ({a_data['email']}) - {a_data['company']}")
        
        alumni_map[a_data["college_name"]] = alumni_rec

        # Seed Alumni Opportunity
        opp_existing = supabase.table("opportunities").select("*").eq("alumni_id", alumni_rec["id"]).eq("title", a_data["opp_title"]).execute()
        if not opp_existing.data:
            opp_ins = supabase.table("opportunities").insert({
                "alumni_id": alumni_rec["id"],
                "title": a_data["opp_title"],
                "description": a_data["opp_desc"],
                "type": a_data["opp_type"],
                "is_active": True
            }).execute()
            opportunities_list.append(opp_ins.data[0])
            print(f"     Posted Opportunity: {a_data['opp_title']}")
        else:
            opportunities_list.append(opp_existing.data[0])

    # -------------------------------------------------------------
    # 4. COMPANIES & RECRUITERS
    # -------------------------------------------------------------
    print("\n [Step 4/7] Seeding Verified Companies, Recruiters & Job Postings...")
    companies_data = [
        {
            "name": "Google India",
            "industry": "Cloud & AI",
            "website": "https://careers.google.com",
            "recruiter_name": "Pooja Varma",
            "recruiter_email": "recruiter.google@skillgraph-demo.com",
            "job": {
                "title": "Cloud Backend Systems Engineer",
                "description": "Build high-throughput containerized cloud services. Requires verified Docker containerization and Python backend microservices experience.",
                "required_skills": [
                    {"skill_name": "Docker", "level": 2},
                    {"skill_name": "Python", "level": 2},
                    {"skill_name": "FastAPI", "level": 1}
                ]
            }
        },
        {
            "name": "Microsoft IDC",
            "industry": "Enterprise Cloud",
            "website": "https://careers.microsoft.com",
            "recruiter_name": "Rahul Nair",
            "recruiter_email": "recruiter.microsoft@skillgraph-demo.com",
            "job": {
                "title": "Fullstack Cloud Platform Engineer",
                "description": "Develop mission-critical web applications with React, TypeScript, and modern relational databases.",
                "required_skills": [
                    {"skill_name": "React", "level": 2},
                    {"skill_name": "TypeScript", "level": 1},
                    {"skill_name": "PostgreSQL", "level": 1}
                ]
            }
        },
        {
            "name": "Amazon AWS",
            "industry": "Cloud Infrastructure",
            "website": "https://amazon.jobs",
            "recruiter_name": "Sneha Menon",
            "recruiter_email": "recruiter.amazon@skillgraph-demo.com",
            "job": {
                "title": "Cloud DevOps & Infrastructure Engineer",
                "description": "Design resilient CI/CD pipelines, containerized environments, and cloud infrastructure.",
                "required_skills": [
                    {"skill_name": "Docker", "level": 2},
                    {"skill_name": "AWS", "level": 1},
                    {"skill_name": "Python", "level": 1}
                ]
            }
        },
        {
            "name": "Razorpay",
            "industry": "FinTech",
            "website": "https://razorpay.com/jobs",
            "recruiter_name": "Vikram Sengupta",
            "recruiter_email": "recruiter.razorpay@skillgraph-demo.com",
            "job": {
                "title": "Frontend UI Architect",
                "description": "Craft lightning-fast payment flows and dashboard experiences with React, Next.js, and TypeScript.",
                "required_skills": [
                    {"skill_name": "React", "level": 2},
                    {"skill_name": "Next.js", "level": 2},
                    {"skill_name": "TypeScript", "level": 1}
                ]
            }
        }
    ]

    job_postings_map = {} # company_name -> job record
    for comp_info in companies_data:
        # Check company
        c_exist = supabase.table("companies").select("*").eq("name", comp_info["name"]).execute()
        if c_exist.data:
            comp_rec = c_exist.data[0]
            print(f"   Found Company: {comp_info['name']}")
        else:
            c_ins = supabase.table("companies").insert({
                "name": comp_info["name"],
                "industry": comp_info["industry"],
                "website": comp_info["website"],
                "is_verified": True
            }).execute()
            comp_rec = c_ins.data[0]
            print(f"  + Created Company: {comp_info['name']}")

        # Recruiter
        r_auth = get_or_create_auth_user(comp_info["recruiter_email"])
        r_exist = supabase.table("recruiters").select("*").eq("email", comp_info["recruiter_email"]).execute()
        if r_exist.data:
            supabase.table("recruiters").update({
                "auth_id": r_auth,
                "company_id": comp_rec["id"],
                "name": comp_info["recruiter_name"]
            }).eq("id", r_exist.data[0]["id"]).execute()
            rec_rec = r_exist.data[0]
            print(f"   Updated Recruiter: {comp_info['recruiter_name']} ({comp_info['recruiter_email']})")
        else:
            r_ins = supabase.table("recruiters").insert({
                "auth_id": r_auth,
                "company_id": comp_rec["id"],
                "name": comp_info["recruiter_name"],
                "email": comp_info["recruiter_email"]
            }).execute()
            rec_rec = r_ins.data[0]
            print(f"  + Created Recruiter: {comp_info['recruiter_name']} ({comp_info['recruiter_email']})")

        # Job posting
        job_exist = supabase.table("job_postings").select("*").eq("company_id", comp_rec["id"]).eq("title", comp_info["job"]["title"]).execute()
        if job_exist.data:
            job_rec = job_exist.data[0]
            print(f"   Found Job: {comp_info['job']['title']}")
        else:
            j_ins = supabase.table("job_postings").insert({
                "company_id": comp_rec["id"],
                "title": comp_info["job"]["title"],
                "description": comp_info["job"]["description"],
                "required_skills": comp_info["job"]["required_skills"],
                "status": "open"
            }).execute()
            job_rec = j_ins.data[0]
            print(f"  + Created Job: {comp_info['job']['title']}")
            
        job_postings_map[comp_info["name"]] = job_rec

    # -------------------------------------------------------------
    # 5. STUDENTS CLUSTER (15 Students per college = 60 students total)
    # -------------------------------------------------------------
    print("\n [Step 5/7] Seeding Students Clustered by College (15 students per college)...")
    
    # We will track created students by college
    students_by_college = {c_name: [] for c_name in college_map.keys()}
    all_seeded_students = []

    for c_info in COLLEGES_DATA:
        c_name = c_info["name"]
        c_rec = college_map[c_name]
        c_code = c_info["code"]
        
        # 1 Primary demo student with known login for each college
        demo_prefix = f"student.{c_code.lower()}"
        demo_email = f"{demo_prefix}@skillgraph-demo.com"
        demo_auth_id = get_or_create_auth_user(demo_email)

        demo_fname = random.choice(FIRST_NAMES)
        demo_lname = random.choice(LAST_NAMES)
        demo_usn = f"4{c_code}21CS001" if c_code != "NITK" else "21NITKCS001"
        
        # Check if demo student exists
        s_exist = supabase.table("students").select("*").eq("email", demo_email).execute()
        if s_exist.data:
            s_rec = s_exist.data[0]
            supabase.table("students").update({
                "auth_id": demo_auth_id,
                "college_id": c_rec["id"],
                "branch": "Computer Science and Engineering",
                "year": 2025,
                "is_verified": True
            }).eq("id", s_rec["id"]).execute()
        else:
            s_ins = supabase.table("students").insert({
                "auth_id": demo_auth_id,
                "college_id": c_rec["id"],
                "name": f"{demo_fname} {demo_lname} (Lead)",
                "email": demo_email,
                "branch": "Computer Science and Engineering",
                "year": 2025,
                "usn": demo_usn,
                "phone": f"+91 9845{random.randint(100000, 999999)}",
                "github_url": f"https://github.com/{demo_fname.lower()}-dev",
                "linkedin_url": f"https://linkedin.com/in/{demo_fname.lower()}-{demo_lname.lower()}",
                "is_verified": True
            }).execute()
            s_rec = s_ins.data[0]
            
        students_by_college[c_name].append(s_rec)
        all_seeded_students.append(s_rec)
        print(f"   Seeded Lead Demo Student for {c_name}: {s_rec['name']} ({demo_email})")

        # 14 more students per college
        for idx in range(2, 16):
            fname = random.choice(FIRST_NAMES)
            lname = random.choice(LAST_NAMES)
            std_email = f"{fname.lower()}.{lname.lower()}_{c_code.lower()}{idx}@skillgraph-demo.com"
            branch = random.choice(BRANCHES)
            year = random.choice([2024, 2025, 2026])
            
            # Format USN
            branch_code = "CS" if "Computer" in branch else ("IS" if "Information" in branch else ("AI" if "Artificial" in branch else "EC"))
            usn = f"4{c_code}{year-2000}{branch_code}{str(idx).zfill(3)}" if c_code != "NITK" else f"{year-2000}NITK{branch_code}{str(idx).zfill(3)}"

            exist = supabase.table("students").select("*").eq("email", std_email).execute()
            if exist.data:
                std_rec = exist.data[0]
            else:
                std_ins = supabase.table("students").insert({
                    "college_id": c_rec["id"],
                    "name": f"{fname} {lname}",
                    "email": std_email,
                    "branch": branch,
                    "year": year,
                    "usn": usn,
                    "phone": f"+91 9845{random.randint(100000, 999999)}",
                    "github_url": f"https://github.com/{fname.lower()}{idx}",
                    "linkedin_url": f"https://linkedin.com/in/{fname.lower()}-{lname.lower()}-{idx}",
                    "is_verified": True
                }).execute()
                std_rec = std_ins.data[0]
                
            students_by_college[c_name].append(std_rec)
            all_seeded_students.append(std_rec)

        print(f"   {c_name}: Total {len(students_by_college[c_name])} students ready.")

    # -------------------------------------------------------------
    # 6. STUDENT SKILLS (Multi-level verification)
    # -------------------------------------------------------------
    print("\n [Step 6/7] Seeding Verified Skills (L0, L1, L2) for students...")
    skills_inserted = 0
    for student in all_seeded_students:
        sid = student["id"]
        # Check existing skills
        sk_exist = supabase.table("student_skills").select("skill_name").eq("student_id", sid).execute()
        existing_names = {s["skill_name"] for s in sk_exist.data}

        # Select 3 to 5 skills
        num_skills = random.randint(3, 5)
        # Ensure lead demo students get top verified skills in Docker and React
        if "Lead" in student["name"]:
            chosen_skills = ["Docker", "Python", "React", "PostgreSQL", "FastAPI"]
        else:
            chosen_skills = random.sample(SKILLS_POOL, num_skills)

        for s_name in chosen_skills:
            if s_name in existing_names:
                continue

            if "Lead" in student["name"]:
                ver_level = 2
                score = random.randint(88, 98)
            else:
                ver_level = random.choices([0, 1, 2], weights=[35, 45, 20], k=1)[0]
                if ver_level == 0:
                    score = random.randint(25, 45)
                elif ver_level == 1:
                    score = random.randint(62, 79)
                else:
                    score = random.randint(82, 96)

            created_date = generate_random_date(45)
            supabase.table("student_skills").insert({
                "student_id": sid,
                "skill_name": s_name,
                "verification_level": ver_level,
                "skill_score": score,
                "created_at": created_date
            }).execute()
            skills_inserted += 1

    print(f"   Inserted {skills_inserted} new skills across students.")

    # -------------------------------------------------------------
    # 7. JOB APPLICATIONS & OPPORTUNITY INTERESTS
    # -------------------------------------------------------------
    print("\n [Step 7/7] Seeding Job Applications & Alumni Opportunity Interests...")
    apps_seeded = 0
    for comp_name, job_rec in job_postings_map.items():
        job_id = job_rec["id"]
        # Pick 4 random students across colleges to apply
        selected_candidates = random.sample(all_seeded_students, 4)
        for cand in selected_candidates:
            app_exist = supabase.table("job_applications").select("id").eq("job_id", job_id).eq("student_id", cand["id"]).execute()
            if not app_exist.data:
                # Calculate match score based on candidate skills
                c_skills = supabase.table("student_skills").select("*").eq("student_id", cand["id"]).execute()
                c_skill_names = {s["skill_name"] for s in c_skills.data}
                
                req_names = {r["skill_name"] for r in (job_rec.get("required_skills") or [])}
                common = c_skill_names.intersection(req_names)
                if common:
                    match_score = min(98, int((len(common) / max(1, len(req_names))) * 100))
                else:
                    match_score = random.randint(35, 55)

                status = "shortlisted" if match_score >= 80 else ("applied" if match_score >= 60 else "rejected")
                
                supabase.table("job_applications").insert({
                    "job_id": job_id,
                    "student_id": cand["id"],
                    "resume_url": f"https://skillgraph.storage/resumes/{cand['id']}.pdf",
                    "cover_letter": f"Excited to apply for {job_rec['title']} at {comp_name}. I have verified skills in {', '.join(list(c_skill_names)[:3])}.",
                    "match_score": match_score,
                    "status": status
                }).execute()
                apps_seeded += 1

    print(f"   Seeded {apps_seeded} Job Applications with match scores & statuses.")

    # Seed Opportunity Interests (students expressing interest in their own college's alumni opportunities)
    opps_interest_seeded = 0
    for c_name, c_students in students_by_college.items():
        # Find opportunity posted by alumni of this college
        c_alumni = alumni_map.get(c_name)
        if not c_alumni:
            continue
        c_opps = supabase.table("opportunities").select("*").eq("alumni_id", c_alumni["id"]).execute()
        if not c_opps.data:
            continue
        target_opp = c_opps.data[0]
        
        # 3 students from this college express interest
        interested_students = c_students[:3]
        for s in interested_students:
            exist = supabase.table("opportunity_interest").select("id").eq("opportunity_id", target_opp["id"]).eq("student_id", s["id"]).execute()
            if not exist.data:
                try:
                    supabase.table("opportunity_interest").insert({
                        "opportunity_id": target_opp["id"],
                        "student_id": s["id"]
                    }).execute()
                    opps_interest_seeded += 1
                except Exception:
                    pass

    print(f"   Seeded {opps_interest_seeded} Opportunity Interests linked to respective College Alumni.")

    print("\n=================================================================")
    print(" ECOSYSTEM SEEDING COMPLETE & VERIFIED!")
    print("=================================================================\n")

if __name__ == "__main__":
    seed_all_ecosystem()

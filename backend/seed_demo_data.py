import os
from dotenv import load_dotenv
from supabase import create_client
import random
from datetime import datetime, timedelta

load_dotenv()

# We need the service role key to bypass RLS for seeding
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
supabase = create_client(url, key)

COLLEGES = [
    {"name": "Canara Engineering College", "state": "Karnataka", "district": "Dakshina Kannada"},
    {"name": "Sahyadri College of Engineering and Management", "state": "Karnataka", "district": "Dakshina Kannada"},
    {"name": "NITK Surathkal", "state": "Karnataka", "district": "Dakshina Kannada"}
]

BRANCHES = ["Computer Science", "Information Science", "Electronics & Communication", "Mechanical Engineering", "Artificial Intelligence"]
SKILLS = ["React", "Nodejs", "Python", "Docker", "PostgreSQL", "AWS", "FastAPI", "MongoDB", "Java", "Spring Boot", "Next.js", "TypeScript"]

# Indian names for realism
FIRST_NAMES = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Rohan", "Rahul", "Karan", "Pooja", "Priya", "Ananya", "Sneha", "Kavya", "Neha", "Divya"]
LAST_NAMES = ["Sharma", "Patil", "Shetty", "Gowda", "Rao", "Nayak", "Bhat", "Desai", "Kumar", "Singh", "Prabhu", "Hegde", "Pai"]

def generate_random_date(days_back=30):
    """Generate a random ISO timestamp within the last `days_back` days"""
    random_days = random.randint(0, days_back)
    random_hours = random.randint(0, 23)
    random_date = datetime.now() - timedelta(days=random_days, hours=random_hours)
    return random_date.isoformat() + "Z"

def seed_data():
    print("Starting data seed...")
    
    # 1. Ensure Colleges Exist
    college_ids = []
    for c in COLLEGES:
        res = supabase.table("colleges").select("id").eq("name", c["name"]).execute()
        if not res.data:
            inserted = supabase.table("colleges").insert({
                "name": c["name"],
                "state": c["state"],
                "district": c["district"],
                "is_approved": True
            }).execute()
            college_ids.append(inserted.data[0]["id"])
            print(f"Inserted college: {c['name']}")
        else:
            college_ids.append(res.data[0]["id"])
            print(f"College exists: {c['name']}")

    # 2. Generate Dummy Students
    student_count = 60
    for i in range(student_count):
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        email = f"{fname.lower()}.{lname.lower()}_{i}@skillgraph-demo.com"
        branch = random.choice(BRANCHES)
        year = random.choice([2024, 2025, 2026])
        college_id = random.choice(college_ids)
        
        # Insert Student
        student_res = supabase.table("students").insert({
            "name": f"{fname} {lname}",
            "email": email,
            "branch": branch,
            "year": year,
            "usn": f"4CB{year - 2000}{branch[:2].upper()}{str(i).zfill(3)}",
            "college_id": college_id,
            "is_verified": True
        }).execute()
        
        student_id = student_res.data[0]["id"]
        
        # 4. Generate Activity Heatmap (MCQ / Coding Questions Seen)
        # Fetch one valid question ID to bypass FK constraints
        q_res = supabase.table("questions").select("id").limit(1).execute()
        valid_q_id = q_res.data[0]["id"] if q_res.data else None
        
        # 3. Generate consistent skills (2 to 5 skills per student)
        num_skills = random.randint(2, 5)
        assigned_skills = random.sample(SKILLS, num_skills)
        
        for skill in assigned_skills:
            # Random verification level (0, 1, or 2)
            # Make L1 and L2 rarer for realism
            ver_level = random.choices([0, 1, 2], weights=[40, 40, 20], k=1)[0]
            
            # If level is 0, score should be low. If level is 1 or 2, score should be high.
            if ver_level == 0:
                score = random.randint(10, 40)
            elif ver_level == 1:
                score = random.randint(50, 80)
            else:
                score = random.randint(75, 100)
                
            skill_created = generate_random_date(30)
            
            supabase.table("student_skills").insert({
                "student_id": student_id,
                "skill_name": skill,
                "verification_level": ver_level,
                "skill_score": score,
                "created_at": skill_created
            }).execute()
            
        # 4. Generate Activity Heatmap
        if valid_q_id:
            num_activities = random.randint(5, 20)
            for _ in range(num_activities):
                activity_date = generate_random_date(30)
                try:
                    supabase.table("student_seen_questions").insert({
                        "student_id": student_id,
                        "skill_name": "Test",
                        "question_id": valid_q_id,
                        "created_at": activity_date
                    }).execute()
                except Exception:
                    pass
            
        print(f"Inserted student {i+1}/{student_count}: {fname} {lname} with {num_skills} skills.")

    print("Data seeding completed successfully!")
    print("Run `DELETE FROM students WHERE email LIKE '%@skillgraph-demo.com';` to cleanup.")

if __name__ == "__main__":
    # First cleanup any previous run to avoid USN/email conflicts
    supabase.table("students").delete().like("email", "%@skillgraph-demo.com").execute()
    seed_data()

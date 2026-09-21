import os
import json
from dotenv import load_dotenv

load_dotenv()
from supabase import create_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

# 1. Mock Scraped JD Data
market_data = [
    {"portal_source": "LinkedIn", "job_role": "Full Stack Developer", "skill_name": "React", "demand_percentage": 92, "average_salary_range": "$90k - $140k"},
    {"portal_source": "LinkedIn", "job_role": "Full Stack Developer", "skill_name": "Node.js", "demand_percentage": 85, "average_salary_range": "$90k - $140k"},
    {"portal_source": "Indeed", "job_role": "Full Stack Developer", "skill_name": "MongoDB", "demand_percentage": 78, "average_salary_range": "$85k - $130k"},
    {"portal_source": "Wellfound", "job_role": "Full Stack Developer", "skill_name": "TypeScript", "demand_percentage": 88, "average_salary_range": "$100k - $150k"},
    {"portal_source": "LinkedIn", "job_role": "Java Enterprise", "skill_name": "Java", "demand_percentage": 95, "average_salary_range": "$110k - $160k"},
    {"portal_source": "LinkedIn", "job_role": "Java Enterprise", "skill_name": "Spring Boot", "demand_percentage": 90, "average_salary_range": "$110k - $160k"},
    {"portal_source": "Indeed", "job_role": "Java Enterprise", "skill_name": "PostgreSQL", "demand_percentage": 82, "average_salary_range": "$100k - $140k"},
]

# 2. Curated JSON Roadmaps
mern_roadmap = {
    "title": "MERN Stack Specialist",
    "description": "The definitive path to becoming a modern Full Stack Developer based on current LinkedIn demand.",
    "nodes": [
        {
            "id": "html_css",
            "skill": "HTML & CSS",
            "tier": 1,
            "why": "The absolute foundation of the web.",
            "docs": "https://developer.mozilla.org/en-US/docs/Web",
            "video": "https://www.youtube.com/watch?v=G3e-cpL7ofc"
        },
        {
            "id": "javascript",
            "skill": "JavaScript",
            "tier": 2,
            "why": "Required by 98% of frontend job descriptions.",
            "docs": "https://javascript.info/",
            "video": "https://www.youtube.com/watch?v=W6NZfCO5SIk",
            "prerequisites": ["html_css"]
        },
        {
            "id": "react",
            "skill": "React",
            "tier": 3,
            "why": "The most dominant frontend library in the industry (92% demand).",
            "docs": "https://react.dev/",
            "video": "https://www.youtube.com/watch?v=bMknfKXIFA8",
            "prerequisites": ["javascript"]
        },
        {
            "id": "node",
            "skill": "Node.js",
            "tier": 4,
            "why": "JavaScript on the backend. Essential for full-stack.",
            "docs": "https://nodejs.org/en/docs/",
            "video": "https://www.youtube.com/watch?v=Oe421EPjeEQ",
            "prerequisites": ["javascript"]
        },
        {
            "id": "mongodb",
            "skill": "MongoDB",
            "tier": 5,
            "why": "The leading NoSQL database for flexible scaling.",
            "docs": "https://www.mongodb.com/docs/",
            "video": "https://www.youtube.com/watch?v=excj0Ya-Neq",
            "prerequisites": ["node"]
        }
    ]
}

java_roadmap = {
    "title": "Java Enterprise Developer",
    "description": "The robust enterprise path for scalable backend architecture.",
    "nodes": [
        {
            "id": "java",
            "skill": "Java",
            "tier": 1,
            "why": "The backbone of enterprise software (95% demand).",
            "docs": "https://docs.oracle.com/en/java/",
            "video": "https://www.youtube.com/watch?v=A74TOX803D0"
        },
        {
            "id": "spring_boot",
            "skill": "Spring Boot",
            "tier": 2,
            "why": "The industry standard framework for Java web applications.",
            "docs": "https://spring.io/projects/spring-boot",
            "video": "https://www.youtube.com/watch?v=9SGDpanrc8U",
            "prerequisites": ["java"]
        },
        {
            "id": "postgresql",
            "skill": "PostgreSQL",
            "tier": 3,
            "why": "The most loved relational database in the world.",
            "docs": "https://www.postgresql.org/docs/",
            "video": "https://www.youtube.com/watch?v=qw--VYLpxG4",
            "prerequisites": ["java"]
        }
    ]
}

roadmaps = [
    {
        "role_name": "Full Stack Developer",
        "ecosystem": "MERN",
        "roadmap_json": mern_roadmap,
        "estimated_months": 6
    },
    {
        "role_name": "Full Stack Developer",
        "ecosystem": "Java",
        "roadmap_json": java_roadmap,
        "estimated_months": 8
    }
]

print("Seeding Market Data...")
for item in market_data:
    try:
        supabase.table("job_market_data").insert(item).execute()
    except Exception as e:
        print(f"Failed to insert market data: {e}")

print("Seeding Roadmaps...")
for item in roadmaps:
    try:
        supabase.table("career_roadmaps").insert(item).execute()
    except Exception as e:
        print(f"Failed to insert roadmap: {e}")

print("✅ Seeding complete!")

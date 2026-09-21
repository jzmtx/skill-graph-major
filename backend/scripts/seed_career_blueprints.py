import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

blueprints = [
    {
        "career_name": "Backend Developer",
        "conceptual_stages": [
            "Programming Language",
            "Backend Framework",
            "Relational Database",
            "NoSQL Database",
            "API Design & Documentation",
            "Authentication & Authorization",
            "Caching",
            "Message Brokers",
            "Containerization",
            "Testing",
            "CI/CD"
        ]
    },
    {
        "career_name": "Frontend Developer",
        "conceptual_stages": [
            "Internet Fundamentals",
            "HTML/CSS",
            "JavaScript/TypeScript",
            "Frontend Framework",
            "State Management",
            "CSS Framework",
            "Build Tools",
            "Testing",
            "SSR/SSG (Meta Frameworks)",
            "Web Security",
            "Performance Optimization"
        ]
    },
    {
        "career_name": "Data Scientist",
        "conceptual_stages": [
            "Programming Language",
            "Mathematics & Statistics",
            "Data Manipulation",
            "Data Visualization",
            "Machine Learning",
            "Deep Learning",
            "Model Deployment",
            "Big Data Tools"
        ]
    },
    {
        "career_name": "Cloud Architect",
        "conceptual_stages": [
            "Networking & Security Foundations",
            "Operating Systems & Linux",
            "Cloud Provider Fundamentals",
            "Compute Services",
            "Storage Solutions",
            "Database Services",
            "Infrastructure as Code (IaC)",
            "Container Orchestration",
            "Monitoring & Logging",
            "Serverless Architecture"
        ]
    },
    {
        "career_name": "Full Stack Developer",
        "conceptual_stages": [
            "Internet & Version Control",
            "HTML, CSS & JavaScript",
            "Frontend Framework",
            "Programming Language (Backend)",
            "Backend Framework",
            "Relational Database",
            "NoSQL Database",
            "API Design & Authentication",
            "Containerization",
            "CI/CD & Deployment"
        ]
    }
]

print("Seeding Career Blueprints...")

for bp in blueprints:
    res = supabase.table("career_blueprints").upsert(
        bp, 
        on_conflict="career_name"
    ).execute()
    print(f"Upserted blueprint for: {bp['career_name']}")

print("Done seeding career blueprints.")

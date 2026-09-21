import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

def seed_graph_dependencies():
    print("Fetching global skills...")
    # Fetch current skills to get their UUIDs
    res = supabase.table("skill_knowledge_graph").select("id, normalized_name").execute()
    if not res.data:
        print("No skills found in skill_knowledge_graph. Run seeders first.")
        return
        
    skills_map = {item["normalized_name"].lower().strip(): item["id"] for item in res.data}
    
    # Standard dependencies mapping (dependent: prerequisite)
    dependencies = [
        ("django", "python"),
        ("fastapi", "python"),
        ("tensorflow", "python"),
        ("pytorch", "python"),
        ("pandas", "python"),
        ("numpy", "python"),
        ("scikit-learn", "python"),
        ("react", "javascript"),
        ("next.js", "react"),
        ("postgresql", "sql"),
        ("mysql", "sql"),
    ]
    
    payload = []
    for dep, prereq in dependencies:
        dep_id = skills_map.get(dep)
        prereq_id = skills_map.get(prereq)
        if dep_id and prereq_id:
            payload.append({
                "skill_id": dep_id,
                "prerequisite_id": prereq_id,
                "dependency_type": "strict"
            })
            print(f"Mapped dependency: {dep} -> {prereq}")
            
    if payload:
        try:
            # Clear old and bulk insert
            supabase.table("skill_dependencies").delete().neq("skill_id", "00000000-0000-0000-0000-000000000000").execute()
            supabase.table("skill_dependencies").insert(payload).execute()
            print("Dependencies successfully seeded in Supabase.")
        except Exception as e:
            print("Failed to seed dependencies:", e)

def seed_official_resources():
    print("Fetching global skills for resources...")
    res = supabase.table("skill_knowledge_graph").select("id, normalized_name").execute()
    if not res.data:
        return
        
    skills_map = {item["normalized_name"].lower().strip(): item["id"] for item in res.data}
    
    # Official resources definition
    resources = [
        ("python", "Official Python Tutorial", "https://docs.python.org/3/tutorial/", "documentation", "beginner"),
        ("javascript", "MDN JavaScript Guide", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", "documentation", "beginner"),
        ("django", "Official Django Getting Started", "https://docs.djangoproject.com/en/stable/intro/", "documentation", "intermediate"),
        ("fastapi", "Official FastAPI Tutorial", "https://fastapi.tiangolo.com/tutorial/", "documentation", "intermediate"),
        ("react", "Official React Documentation", "https://react.dev/reference/react", "documentation", "beginner"),
        ("next.js", "Official Next.js Docs", "https://nextjs.org/docs", "documentation", "intermediate"),
        ("postgresql", "Official PostgreSQL Tutorial", "https://www.postgresql.org/docs/manual/tutorial.html", "documentation", "beginner"),
    ]
    
    payload = []
    for skill, title, url, r_type, diff in resources:
        skill_id = skills_map.get(skill)
        if skill_id:
            payload.append({
                "skill_id": skill_id,
                "title": title,
                "url": url,
                "type": r_type,
                "difficulty": diff,
                "is_official": True
            })
            
    if payload:
        try:
            supabase.table("resource_catalog").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            supabase.table("resource_catalog").insert(payload).execute()
            print("Official resources successfully seeded.")
        except Exception as e:
            print("Failed to seed resources:", e)

if __name__ == "__main__":
    seed_graph_dependencies()
    seed_official_resources()

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

skills = [
    {"normalized_name": "Django", "aliases": ["django"]},
    {"normalized_name": "FastAPI", "aliases": ["fastapi", "fast api"]},
    {"normalized_name": "Flask", "aliases": ["flask"]},
    {"normalized_name": "React", "aliases": ["react", "reactjs", "react.js"]},
    {"normalized_name": "Angular", "aliases": ["angular", "angularjs"]},
    {"normalized_name": "Vue", "aliases": ["vue", "vuejs", "vue.js"]},
    {"normalized_name": "Node.js", "aliases": ["node", "nodejs", "node.js"]},
    {"normalized_name": "Express", "aliases": ["express", "expressjs", "express.js"]},
    {"normalized_name": "Spring Boot", "aliases": ["spring", "spring boot", "springboot"]},
    {"normalized_name": "ASP.NET", "aliases": ["asp.net", "dotnet", ".net", "c#"]},
    {"normalized_name": "Go", "aliases": ["go", "golang"]},
    {"normalized_name": "Ruby on Rails", "aliases": ["ruby", "rails", "ruby on rails", "ror"]},
    {"normalized_name": "GraphQL", "aliases": ["graphql"]},
    {"normalized_name": "REST API", "aliases": ["rest", "restful", "rest api"]},
    {"normalized_name": "MongoDB", "aliases": ["mongo", "mongodb"]},
    {"normalized_name": "Redis", "aliases": ["redis"]},
    {"normalized_name": "PostgreSQL", "aliases": ["postgres", "postgresql"]},
    {"normalized_name": "MySQL", "aliases": ["mysql"]},
    {"normalized_name": "TypeScript", "aliases": ["typescript", "ts"]},
    {"normalized_name": "JavaScript", "aliases": ["javascript", "js"]},
    {"normalized_name": "HTML/CSS", "aliases": ["html", "css", "html5", "css3"]}
]

for s in skills:
    try:
        supabase.table("skill_knowledge_graph").upsert(s, on_conflict="normalized_name").execute()
    except Exception as e:
        pass
print("Seeded more skills!")

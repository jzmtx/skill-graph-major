import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

# Fetch existing skills
res = supabase.table('skill_knowledge_graph').select('id, normalized_name').execute()
skills = {s['normalized_name'].lower(): s['id'] for s in res.data}

def get_or_create_skill(name, category, aliases=None):
    name_lower = name.lower()
    if name_lower in skills:
        print(f"Updating {name}...")
        supabase.table('skill_knowledge_graph').update({
            'category': category,
            'aliases': aliases or [name_lower]
        }).eq('id', skills[name_lower]).execute()
        return skills[name_lower]
    
    print(f"Creating {name}...")
    res = supabase.table('skill_knowledge_graph').insert({
        'normalized_name': name,
        'category': category,
        'aliases': aliases or [name_lower]
    }).execute()
    new_id = res.data[0]['id']
    skills[name_lower] = new_id
    return new_id

def link_child(parent_id, child_name, category, aliases=None):
    child_id = get_or_create_skill(child_name, category, aliases)
    supabase.table('skill_knowledge_graph').update({
        'parent_skill_id': parent_id,
        'category': category
    }).eq('id', child_id).execute()

# --- Languages ---
python_id = get_or_create_skill("Python", "Programming Language")
js_id = get_or_create_skill("JavaScript", "Programming Language", ["javascript", "js"])
java_id = get_or_create_skill("Java", "Programming Language")
csharp_id = get_or_create_skill("C#", "Programming Language", ["c#", "csharp", ".net"])
go_id = get_or_create_skill("Go", "Programming Language", ["go", "golang"])
rust_id = get_or_create_skill("Rust", "Programming Language", ["rust", "rustlang"])

# --- Python Ecosystem ---
link_child(python_id, "FastAPI", "Backend Framework")
link_child(python_id, "Django", "Backend Framework")
link_child(python_id, "Flask", "Backend Framework")
link_child(python_id, "SQLAlchemy", "ORM")
link_child(python_id, "Pandas", "Data Science Library")
link_child(python_id, "NumPy", "Data Science Library")
link_child(python_id, "Scikit-learn", "Machine Learning Library", ["scikit-learn", "sklearn"])
link_child(python_id, "PyTorch", "Machine Learning Library", ["pytorch", "torch"])
link_child(python_id, "TensorFlow", "Machine Learning Library", ["tensorflow", "tf"])

# --- JavaScript/TypeScript Ecosystem ---
link_child(js_id, "Node.js", "Runtime Environment", ["node.js", "nodejs", "node"])
link_child(js_id, "Express.js", "Backend Framework", ["express", "express.js", "expressjs"])
link_child(js_id, "NestJS", "Backend Framework", ["nestjs", "nest"])
link_child(js_id, "Fastify", "Backend Framework")
link_child(js_id, "React", "Frontend Framework", ["react", "reactjs", "react.js"])
link_child(js_id, "Next.js", "Frontend Framework", ["next", "nextjs", "next.js"])
link_child(js_id, "Vue.js", "Frontend Framework", ["vue", "vuejs", "vue.js"])
link_child(js_id, "Angular", "Frontend Framework", ["angular", "angularjs"])
link_child(js_id, "Prisma", "ORM")
link_child(js_id, "TypeORM", "ORM")
link_child(js_id, "Sequelize", "ORM")

# --- Java Ecosystem ---
link_child(java_id, "Spring Boot", "Backend Framework", ["spring", "spring boot", "springboot"])
link_child(java_id, "Micronaut", "Backend Framework")
link_child(java_id, "Quarkus", "Backend Framework")
link_child(java_id, "Hibernate", "ORM")
link_child(java_id, "Maven", "Build Tool")
link_child(java_id, "Gradle", "Build Tool")

# --- Go Ecosystem ---
link_child(go_id, "Gin", "Backend Framework")
link_child(go_id, "Echo", "Backend Framework")
link_child(go_id, "Fiber", "Backend Framework")
link_child(go_id, "GORM", "ORM")

# --- C# / .NET Ecosystem ---
link_child(csharp_id, "ASP.NET Core", "Backend Framework", ["asp.net", "asp.net core", ".net core"])
link_child(csharp_id, "Entity Framework", "ORM", ["entity framework", "ef core"])

# --- Independent Databases ---
db_cat = "Database"
get_or_create_skill("PostgreSQL", db_cat, ["postgresql", "postgres"])
get_or_create_skill("MySQL", db_cat)
get_or_create_skill("MongoDB", db_cat, ["mongodb", "mongo"])
get_or_create_skill("Redis", db_cat)
get_or_create_skill("Cassandra", db_cat)

# --- DevOps / Tools ---
tool_cat = "DevOps & Tools"
get_or_create_skill("Docker", tool_cat)
get_or_create_skill("Kubernetes", tool_cat, ["kubernetes", "k8s"])
get_or_create_skill("Git", tool_cat)
get_or_create_skill("GitHub Actions", tool_cat)
get_or_create_skill("Jenkins", tool_cat)
get_or_create_skill("AWS", tool_cat, ["aws", "amazon web services"])
get_or_create_skill("Azure", tool_cat, ["azure", "microsoft azure"])
get_or_create_skill("Google Cloud", tool_cat, ["gcp", "google cloud platform"])

print("Graph Seeded Successfully")

from database import supabase

def seed_learning_graph():
    print("Pre-seeding V1 expert learning graph (Frontend, Backend, Full Stack, Data Science)...")
    
    # 1. Fetch existing technologies to link to
    techs = supabase.table("technologies").select("id, normalized_name").execute().data
    tech_map = {t["normalized_name"].lower().strip(): t["id"] for t in techs}
    
    # Ensure all essential technologies exist in technologies table
    required_techs = [
        "html/css", "javascript", "git", "react", "redux", "tailwind css",
        "python", "django", "fastapi", "sql", "postgresql", "docker",
        "numpy", "pandas", "scikit-learn", "tensorflow", "keras"
    ]
    for t in required_techs:
        if t not in tech_map:
            # Check if there's a variant in naming
            found_key = None
            for k in tech_map.keys():
                if t in k or k in t:
                    found_key = k
                    break
            if found_key:
                tech_map[t] = tech_map[found_key]
            else:
                res = supabase.table("technologies").insert({"normalized_name": t.title(), "category": "Tool"}).execute()
                if res.data:
                    tech_map[t] = res.data[0]["id"]
                    
    # 2. Define expert learning nodes
    # concept_name -> {tech_key, difficulty_level}
    nodes_to_seed = {
        # Web Fundamentals
        "HTML/CSS Basics": {"tech": "html/css", "diff": "foundation"},
        "JavaScript Fundamentals": {"tech": "javascript", "diff": "foundation"},
        "Version Control with Git": {"tech": "git", "diff": "foundation"},
        
        # Frontend
        "React Component Library": {"tech": "react", "diff": "core"},
        "Redux State Management": {"tech": "redux", "diff": "advanced"},
        "Tailwind CSS Styling": {"tech": "tailwind css", "diff": "core"},
        
        # Backend & Databases
        "Python Programming": {"tech": "python", "diff": "foundation"},
        "SQL Database Basics": {"tech": "sql", "diff": "foundation"},
        "PostgreSQL Advanced": {"tech": "postgresql", "diff": "core"},
        "Docker Containerization": {"tech": "docker", "diff": "advanced"},
        
        # Backend Framework Alternatives
        "FastAPI Web Service": {"tech": "fastapi", "diff": "core"},
        "Django Enterprise Backend": {"tech": "django", "diff": "core"},
        
        # Data Science & ML
        "NumPy Fundamentals": {"tech": "numpy", "diff": "core"},
        "Pandas Data Manipulation": {"tech": "pandas", "diff": "core"},
        "Scikit-Learn ML": {"tech": "scikit-learn", "diff": "core"},
        "TensorFlow Deep Learning": {"tech": "tensorflow", "diff": "advanced"},
        "Keras High-Level API": {"tech": "keras", "diff": "advanced"}
    }
    
    # Clean old nodes to prevent duplicates
    supabase.table("learning_nodes").delete().neq("concept_name", "---").execute()
    
    node_id_map = {}
    for concept, spec in nodes_to_seed.items():
        tid = tech_map.get(spec["tech"])
        res = supabase.table("learning_nodes").insert({
            "technology_id": tid,
            "concept_name": concept,
            "difficulty_level": spec["diff"]
        }).execute()
        if res.data:
            node_id_map[concept] = res.data[0]["id"]
            
    # 3. Define expert prerequisite connections
    prereqs = [
        # Frontend Path
        ("HTML/CSS Basics", "JavaScript Fundamentals"),
        ("JavaScript Fundamentals", "React Component Library"),
        ("Version Control with Git", "React Component Library"),
        ("React Component Library", "Redux State Management"),
        ("React Component Library", "Tailwind CSS Styling"),
        
        # Backend Path
        ("Python Programming", "SQL Database Basics"),
        ("SQL Database Basics", "PostgreSQL Advanced"),
        ("Python Programming", "FastAPI Web Service"),
        ("Python Programming", "Django Enterprise Backend"),
        ("SQL Database Basics", "FastAPI Web Service"),
        ("SQL Database Basics", "Django Enterprise Backend"),
        ("Version Control with Git", "Docker Containerization"),
        
        # Data Science Path
        ("Python Programming", "NumPy Fundamentals"),
        ("NumPy Fundamentals", "Pandas Data Manipulation"),
        ("Pandas Data Manipulation", "Scikit-Learn ML"),
        ("Python Programming", "Scikit-Learn ML"), # Redundant edge for TR test
        ("NumPy Fundamentals", "TensorFlow Deep Learning"),
        ("TensorFlow Deep Learning", "Keras High-Level API")
    ]
    
    supabase.table("learning_prerequisites").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    for parent_name, child_name in prereqs:
        pid = node_id_map.get(parent_name)
        cid = node_id_map.get(child_name)
        if pid and cid:
            supabase.table("learning_prerequisites").insert({
                "node_id": cid,
                "prerequisite_node_id": pid
            }).execute()
            
    # 4. Seed alternative groups
    supabase.table("learning_alternatives").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    # Group A: FastAPI vs Django (Backend frameworks)
    backend_alt_group = "a2d6b03f-1322-476b-bbe8-9fcf35ace17e"
    fastapi_node = node_id_map.get("FastAPI Web Service")
    django_node = node_id_map.get("Django Enterprise Backend")
    if fastapi_node and django_node:
        supabase.table("learning_alternatives").insert({"node_id": fastapi_node, "alternative_group_id": backend_alt_group}).execute()
        supabase.table("learning_alternatives").insert({"node_id": django_node, "alternative_group_id": backend_alt_group}).execute()
        
    # Group B: TensorFlow vs Keras (DL frameworks)
    dl_alt_group = "b3c5a6d7-2489-4bce-9eef-1a2f333e02e1"
    tf_node = node_id_map.get("TensorFlow Deep Learning")
    keras_node = node_id_map.get("Keras High-Level API")
    if tf_node and keras_node:
        supabase.table("learning_alternatives").insert({"node_id": tf_node, "alternative_group_id": dl_alt_group}).execute()
        supabase.table("learning_alternatives").insert({"node_id": keras_node, "alternative_group_id": dl_alt_group}).execute()
        
    print("Expert V1 Learning Graph pre-seeded successfully!")

if __name__ == "__main__":
    seed_learning_graph()

from database import supabase

def seed_master_v1():
    print("Starting master database seeding for V1.1...")

    # 1. Clean old entries to ensure no duplicates
    print("Cleaning database tables...")
    supabase.table("learning_prerequisites").delete().neq("node_id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("learning_nodes").delete().neq("concept_name", "---").execute()
    supabase.table("occupation_skills").delete().neq("relation_type", "---").execute()
    supabase.table("occupations").delete().neq("title", "---").execute()
    supabase.table("technologies").delete().neq("normalized_name", "---").execute()

    # 2. Define canonical technologies
    technologies_to_seed = [
        # Frontend
        {"normalized_name": "HTML/CSS", "category": "Tool"},
        {"normalized_name": "JavaScript", "category": "Language"},
        {"normalized_name": "Version Control (Git)", "category": "Tool"},
        {"normalized_name": "React", "category": "Framework"},
        {"normalized_name": "Redux", "category": "Tool"},
        {"normalized_name": "Tailwind CSS", "category": "Framework"},
        # Backend
        {"normalized_name": "Python", "category": "Language"},
        {"normalized_name": "SQL", "category": "Language"},
        {"normalized_name": "PostgreSQL", "category": "Database"},
        {"normalized_name": "Docker", "category": "Tool"},
        {"normalized_name": "FastAPI", "category": "Framework"},
        {"normalized_name": "Django", "category": "Framework"},
        # Data Science
        {"normalized_name": "NumPy", "category": "Library"},
        {"normalized_name": "Pandas", "category": "Library"},
        {"normalized_name": "Matplotlib", "category": "Library"},
        {"normalized_name": "Seaborn", "category": "Library"},
        {"normalized_name": "Scikit-Learn", "category": "Library"},
        {"normalized_name": "TensorFlow", "category": "Framework"},
        {"normalized_name": "Keras", "category": "Framework"},
        # Cybersecurity
        {"normalized_name": "Wireshark", "category": "Tool"},
        {"normalized_name": "Nmap", "category": "Tool"},
        {"normalized_name": "Metasploit", "category": "Tool"},
        {"normalized_name": "Burp Suite", "category": "Tool"},
        {"normalized_name": "Cryptography", "category": "Concept"}
    ]

    print("Seeding canonical technologies...")
    tech_map = {}
    for t in technologies_to_seed:
        res = supabase.table("technologies").insert(t).execute()
        if res.data:
            tech_map[t["normalized_name"].lower().strip()] = res.data[0]["id"]

    # 3. Define occupations
    occupations_to_seed = [
        {"title": "Frontend Developer", "description": "Builds interactive user interfaces and frontend web apps."},
        {"title": "Backend Developer", "description": "Designs and manages backend server architectures, APIs, and databases."},
        {"title": "Full Stack Developer", "description": "Works across both frontend and backend development stacks."},
        {"title": "Data Scientist", "description": "Analyzes data and builds machine learning models to solve data challenges."},
        {"title": "Cybersecurity Analyst", "description": "Monitors and secures information systems and network infrastructures."}
    ]

    print("Seeding occupations...")
    occ_map = {}
    for o in occupations_to_seed:
        res = supabase.table("occupations").insert(o).execute()
        if res.data:
            occ_map[o["title"]] = res.data[0]["id"]

    # 4. Link occupation skills in occupation_skills
    # Using exact canonical lowercase keys to match tech_map
    occupation_mappings = {
        "Frontend Developer": [
            "html/css", "javascript", "version control (git)", "react", "redux", "tailwind css"
        ],
        "Backend Developer": [
            "python", "sql", "postgresql", "docker", "fastapi", "django"
        ],
        "Full Stack Developer": [
            "html/css", "javascript", "version control (git)", "react", "redux", "tailwind css", "python", "sql", "postgresql", "docker", "fastapi"
        ],
        "Data Scientist": [
            "python", "sql", "numpy", "pandas", "matplotlib", "seaborn", "scikit-learn", "tensorflow", "keras"
        ],
        "Cybersecurity Analyst": [
            "python", "version control (git)", "wireshark", "nmap", "metasploit", "burp suite", "cryptography"
        ]
    }

    print("Linking occupations to technologies...")
    for title, techs in occupation_mappings.items():
        oid = occ_map.get(title)
        for tname in techs:
            tid = tech_map.get(tname)
            if tid and oid:
                supabase.table("occupation_skills").insert({
                    "occupation_id": oid,
                    "skill_id": tid,
                    "relation_type": "core"
                }).execute()

    # 5. Define learning nodes
    learning_nodes_to_seed = {
        # Web Fundamentals
        "HTML/CSS Basics": {"tech": "html/css", "diff": "foundation"},
        "JavaScript Fundamentals": {"tech": "javascript", "diff": "foundation"},
        "Version Control with Git": {"tech": "version control (git)", "diff": "foundation"},
        
        # Frontend
        "React Component Library": {"tech": "react", "diff": "core"},
        "Redux State Management": {"tech": "redux", "diff": "advanced"},
        "Tailwind CSS Styling": {"tech": "tailwind css", "diff": "core"},
        
        # Backend & Databases
        "Python Programming": {"tech": "python", "diff": "foundation"},
        "SQL Database Basics": {"tech": "sql", "diff": "foundation"},
        "PostgreSQL Advanced": {"tech": "postgresql", "diff": "core"},
        "Docker Containerization": {"tech": "docker", "diff": "advanced"},
        
        # Framework Alternatives
        "FastAPI Web Service": {"tech": "fastapi", "diff": "core"},
        "Django Enterprise Backend": {"tech": "django", "diff": "core"},
        
        # Data Science & ML
        "NumPy Fundamentals": {"tech": "numpy", "diff": "core"},
        "Pandas Data Manipulation": {"tech": "pandas", "diff": "core"},
        "Matplotlib Visuals": {"tech": "matplotlib", "diff": "core"},
        "Seaborn Advanced Charts": {"tech": "seaborn", "diff": "core"},
        "Scikit-Learn ML": {"tech": "scikit-learn", "diff": "core"},
        "TensorFlow Deep Learning": {"tech": "tensorflow", "diff": "advanced"},
        "Keras High-Level API": {"tech": "keras", "diff": "advanced"},
        
        # Cybersecurity
        "Network Packet Analysis (Wireshark)": {"tech": "wireshark", "diff": "core"},
        "Network Scanning (Nmap)": {"tech": "nmap", "diff": "core"},
        "Penetration Testing (Metasploit)": {"tech": "metasploit", "diff": "advanced"},
        "Web Application Security (Burp Suite)": {"tech": "burp suite", "diff": "advanced"},
        "Cryptography Fundamentals": {"tech": "cryptography", "diff": "core"}
    }

    print("Seeding learning nodes...")
    node_id_map = {}
    for concept, spec in learning_nodes_to_seed.items():
        tid = tech_map.get(spec["tech"])
        if tid:
            res = supabase.table("learning_nodes").insert({
                "technology_id": tid,
                "concept_name": concept,
                "difficulty_level": spec["diff"]
            }).execute()
            if res.data:
                node_id_map[concept] = res.data[0]["id"]

    # 6. Define learning prerequisites
    prereqs = [
        # Frontend
        ("HTML/CSS Basics", "JavaScript Fundamentals"),
        ("JavaScript Fundamentals", "React Component Library"),
        ("Version Control with Git", "React Component Library"),
        ("React Component Library", "Redux State Management"),
        ("React Component Library", "Tailwind CSS Styling"),
        
        # Backend
        ("SQL Database Basics", "PostgreSQL Advanced"),
        ("Python Programming", "FastAPI Web Service"),
        ("Python Programming", "Django Enterprise Backend"),
        ("SQL Database Basics", "FastAPI Web Service"),
        ("SQL Database Basics", "Django Enterprise Backend"),
        ("Version Control with Git", "Docker Containerization"),
        
        # Data Science
        ("Python Programming", "NumPy Fundamentals"),
        ("NumPy Fundamentals", "Pandas Data Manipulation"),
        ("Pandas Data Manipulation", "Matplotlib Visuals"),
        ("Matplotlib Visuals", "Seaborn Advanced Charts"),
        ("Pandas Data Manipulation", "Scikit-Learn ML"),
        ("NumPy Fundamentals", "TensorFlow Deep Learning"),
        ("TensorFlow Deep Learning", "Keras High-Level API"),
        
        # Cybersecurity
        ("Python Programming", "Network Scanning (Nmap)"),
        ("Network Scanning (Nmap)", "Network Packet Analysis (Wireshark)"),
        ("Network Packet Analysis (Wireshark)", "Penetration Testing (Metasploit)"),
        ("Cryptography Fundamentals", "Web Application Security (Burp Suite)")
    ]

    print("Seeding prerequisites...")
    for parent, child in prereqs:
        pid = node_id_map.get(parent)
        cid = node_id_map.get(child)
        if pid and cid:
            try:
                supabase.table("learning_prerequisites").insert({
                    "node_id": cid,
                    "prerequisite_node_id": pid
                }).execute()
            except Exception as e:
                print(f"Skipped prerequisite insert: {parent} -> {child} ({e})")

    print("V1.1 Master Seeding Completed Successfully!")

if __name__ == "__main__":
    seed_master_v1()

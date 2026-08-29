from database import supabase

def seed_v1_occupations():
    print("Seeding V1 Occupations and linking correct target technologies...")

    # 1. Ensure Occupations exist in occupations table
    occupations_data = [
        {"title": "Frontend Developer", "description": "Builds interactive user interfaces and frontend web apps."},
        {"title": "Backend Developer", "description": "Designs and manages backend server architectures, APIs, and databases."},
        {"title": "Full Stack Developer", "description": "Works across both frontend and backend development stacks."},
        {"title": "Data Scientist", "description": "Analyzes data and builds machine learning models to solve business problems."},
        {"title": "Cybersecurity Analyst", "description": "Monitors and secures information systems and network infrastructures."}
    ]
    
    # Clean old occupations
    supabase.table("occupations").delete().neq("title", "---").execute()
    
    occ_map = {}
    for o in occupations_data:
        res = supabase.table("occupations").insert(o).execute()
        if res.data:
            occ_map[o["title"]] = res.data[0]["id"]
            
    # 2. Fetch technologies to get their IDs
    techs = supabase.table("technologies").select("id, normalized_name").execute().data
    tech_map = {t["normalized_name"].lower().strip(): t["id"] for t in techs}
    
    # 3. Define the precise skill mappings for each occupation
    # Occupation Title -> list of canonical tech names
    mappings = {
        "Frontend Developer": [
            "HTML/CSS", "JavaScript", "Version Control (Git)", "React", "Redux", "Tailwind CSS"
        ],
        "Backend Developer": [
            "Python", "SQL", "PostgreSQL", "Docker", "FastAPI", "Django"
        ],
        "Full Stack Developer": [
            "HTML/CSS", "JavaScript", "Version Control (Git)", "React", "Node.js", "Express", "MongoDB", "Docker", "SQL"
        ],
        "Data Scientist": [
            "Python", "SQL", "NumPy", "Pandas", "Scikit-Learn", "TensorFlow", "Keras"
        ],
        "Cybersecurity Analyst": [
            "Python", "Version Control (Git)", "Wireshark", "Nmap", "Metasploit", "Burp Suite", "Cryptography"
        ]
    }
    
    # Clean old mappings
    supabase.table("occupation_skills").delete().neq("relation_type", "---").execute()
    
    links_count = 0
    for title, tech_list in mappings.items():
        oid = occ_map.get(title)
        if not oid:
            continue
            
        for tname in tech_list:
            # Match the technology name (case-insensitive)
            tid = None
            tname_lower = tname.lower().strip()
            if tname_lower in tech_map:
                tid = tech_map[tname_lower]
            else:
                # Fallback fuzzy check
                for k, v in tech_map.items():
                    if tname_lower in k or k in tname_lower:
                        tid = v
                        break
                        
            if tid:
                try:
                    supabase.table("occupation_skills").insert({
                        "occupation_id": oid,
                        "skill_id": tid,
                        "relation_type": "core"
                    }).execute()
                    links_count += 1
                except Exception as e:
                    print(f"Skipped duplicate mapping: {title} -> {tname} ({e})")
                    
    print(f"Pre-seeded occupations and linked {links_count} target technologies successfully!")

if __name__ == "__main__":
    seed_v1_occupations()

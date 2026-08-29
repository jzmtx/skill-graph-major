import os
from database import supabase

def run_migration():
    print("Fetching existing skill knowledge graph data...")
    res = supabase.table("skill_knowledge_graph").select("*").execute()
    old_skills = res.data
    print(f"Found {len(old_skills)} old skills.")

    print("Migrating to 'technologies' table...")
    tech_inserted = 0
    id_map = {}
    
    # 1. Insert into technologies
    for old in old_skills:
        try:
            # Let's insert while preserving the UUID if possible
            tech_res = supabase.table("technologies").insert({
                "id": old["id"],
                "normalized_name": old["normalized_name"],
                "aliases": old.get("aliases", []),
                "category": old.get("category", "Concept")
            }).execute()
            if tech_res.data:
                tech_inserted += 1
                id_map[old["id"]] = old
        except Exception as e:
            # If already exists or other error, fallback and lookup
            print(f"Skipped/already exists: {old['normalized_name']} ({e})")
            id_map[old["id"]] = old

    print(f"Successfully migrated {tech_inserted} technologies.")

    # 2. Insert parent-child relationships
    print("Migrating parent-child relationships to 'technology_relationships'...")
    relations_inserted = 0
    for old_id, old_data in id_map.items():
        parent_id = old_data.get("parent_skill_id")
        if parent_id and parent_id in id_map:
            try:
                # Default relation type is HAS_LIBRARY or HAS_FRAMEWORK based on category
                cat = old_data.get("category", "").lower()
                rel_type = "HAS_FRAMEWORK" if "framework" in cat else "HAS_LIBRARY"
                
                rel_res = supabase.table("technology_relationships").insert({
                    "from_tech_id": parent_id,
                    "to_tech_id": old_id,
                    "relation_type": rel_type
                }).execute()
                if rel_res.data:
                    relations_inserted += 1
            except Exception as e:
                print(f"Skipped relation: {parent_id} -> {old_id} ({e})")

    print(f"Successfully migrated {relations_inserted} relationships.")

if __name__ == "__main__":
    run_migration()

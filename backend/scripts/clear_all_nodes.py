"""
Clears all old learning nodes, prerequisites, technologies (auto-discovered),
and generated roadmaps from the database.
"""
from database import supabase

print("Clearing all old data...")

# 1. Clear user-saved roadmaps first (FK dependency)
res = supabase.table("user_saved_roadmaps").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
print(f"  Deleted {len(res.data)} user saved roadmaps")

# 2. Clear generated career paths
res = supabase.table("career_paths").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
print(f"  Deleted {len(res.data)} career paths")

# 3. Clear learning prerequisites first (FK dependency)
res = supabase.table("learning_prerequisites").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
print(f"  Deleted {len(res.data)} learning prerequisites")

# 4. Clear learning nodes
res = supabase.table("learning_nodes").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
print(f"  Deleted {len(res.data)} learning nodes")

# 5. Clean up auto-discovered junk technologies (category='auto-discovered')
res = supabase.table("technologies").delete().eq("category", "auto-discovered").execute()
print(f"  Deleted {len(res.data)} auto-discovered junk technologies")

print("\nAll old data cleared successfully!")
print("Run seed_v1_master.py to re-seed the clean canonical data.")

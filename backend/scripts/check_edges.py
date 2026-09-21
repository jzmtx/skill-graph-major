from database import supabase

res = supabase.table("skill_edges").select("*").execute()
print(f"Total edges: {len(res.data)}")
for edge in res.data[:10]:
    print(edge)

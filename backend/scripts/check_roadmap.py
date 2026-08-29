from database import supabase
import json

res = supabase.table("career_paths").select("*").execute()
if res.data:
    row = res.data[0]
    print(f"Role: {row.get('role_name')}")
    print(f"Ecosystem: {row.get('ecosystem')}")
    print(json.dumps(row.get("roadmap_json"), indent=2))
else:
    print("No roadmaps found.")

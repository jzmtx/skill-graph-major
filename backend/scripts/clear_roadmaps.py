from database import supabase

try:
    # Supabase Python client requires an eq or similar filter to delete all.
    # We can fetch all IDs and delete them, or use a broad filter.
    res = supabase.table("career_paths").select("id").execute()
    ids = [r["id"] for r in res.data]
    
    if ids:
        # Delete in batches or one by one if there are few
        for rid in ids:
            supabase.table("career_paths").delete().eq("id", rid).execute()
        print(f"Deleted {len(ids)} generated roadmaps.")
    else:
        print("No generated roadmaps found to delete.")
except Exception as e:
    print(f"Error: {e}")

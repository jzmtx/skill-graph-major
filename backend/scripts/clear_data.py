import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

print("Clearing old data...")

try:
    # We must use a filter that matches everything to delete all rows via REST API.
    # ne(id, '00000000-0000-0000-0000-000000000000') works for UUIDs.
    
    # 1. Clear user saved roadmaps
    supabase.table("user_saved_roadmaps").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("Cleared user_saved_roadmaps.")
    
    # 2. Clear generated roadmaps
    supabase.table("career_paths").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("Cleared career_paths.")
    
    # 3. Clear raw scraped JDs
    supabase.table("industry_intelligence").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("Cleared industry_intelligence.")

    print("All previous roadmaps and scraped data have been successfully deleted!")
except Exception as e:
    print(f"Error clearing data: {e}")

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

print("Deleting all old roadmaps and JDs from the database...")
supabase.table('user_saved_roadmaps').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
supabase.table('career_paths').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
supabase.table('industry_intelligence').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
print("Done!")

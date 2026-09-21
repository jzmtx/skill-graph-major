import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

print("Deleting roadmaps from career_paths...")
supabase.table('career_paths').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()

print("Deleting saved roadmaps...")
supabase.table('user_saved_roadmaps').delete().neq('student_id', '00000000-0000-0000-0000-000000000000').execute()

print("Deleting extracted JDs...")
supabase.table('industry_intelligence').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
supabase.table('job_market_data').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()

print("Wipe complete!")

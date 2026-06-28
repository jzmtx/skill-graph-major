import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

print("Deleting all JDs...")
supabase.table('raw_job_descriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()

print("Deleting all Roadmaps...")
# Depending on schema, we might need to delete user_roadmaps first due to foreign keys
supabase.table('user_roadmaps').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
supabase.table('roadmaps').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()

print("Database cleared successfully.")

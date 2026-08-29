import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])
res = supabase.table('student_skills').select('*').execute()
print(res.data)


import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

res = supabase.table('industry_intelligence').select('*').order('created_at', desc=True).limit(1).execute()
if res.data:
    data = res.data[0]
    print(f"Role: {data['role_name']}")
    print(f"Ecosystem: {data['ecosystem']}")
    print(f"Company: {data['company_name']}")
    print(f"Source: {data['source_url']}")
else:
    print('No data found')

res2 = supabase.table('industry_intelligence').select('count', count='exact').execute()
print(f"Total JDs in DB: {res2.count}")

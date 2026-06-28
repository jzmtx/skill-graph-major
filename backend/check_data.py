import os, json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

res = supabase.table('job_market_data').select('*').order('scraped_at', desc=True).limit(1).execute()
if res.data:
    data = res.data[0]
    print(f"Role: {data['role_name']}")
    print("Core skills:")
    for s in data['core_skills']:
        print(f"  - {s['skill']}: {s['demand_score']}%")
    print("Recommended skills:")
    for s in data['recommended_skills']:
        print(f"  - {s['skill']}: {s['demand_score']}%")
else:
    print('No data found')

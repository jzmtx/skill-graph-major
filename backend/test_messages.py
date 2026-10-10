import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env')
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
supabase = create_client(url, key)

res = supabase.table('company_messages').select('*').limit(5).execute()
print("First 5 messages in company_messages:")
for m in res.data:
    print(f"- App: {m['application_id']} | Type: {m['sender_type']} | Msg: {m['message']}")

res = supabase.table('job_applications').select('id').limit(1).execute()
if res.data:
    app_id = res.data[0]['id']
    msgs = supabase.table('company_messages').select('*').eq('application_id', app_id).execute()
    print(f"\nMessages for random application {app_id}: {len(msgs.data)}")

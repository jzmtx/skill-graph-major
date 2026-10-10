import os
import re

with open('routes/company.py', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''def get_application_messages(app_id: str):
    try:
        print(f"DEBUG: get_application_messages called for app_id: {app_id}")
        messages = supabase.table("company_messages").select("*").eq("application_id", app_id).order("created_at", desc=False).execute()
        print(f"DEBUG: returning {len(messages.data)} messages")
        return messages.data'''

pattern = re.compile(r'def get_application_messages\(app_id: str\):\s*try:\s*messages = supabase\.table\("company_messages"\)\.select\("\*"\)\.eq\("application_id", app_id\)\.order\("created_at", desc=False\)\.execute\(\)\s*return messages\.data')

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open('routes/company.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Patched successfully')
else:
    print('Pattern not found')

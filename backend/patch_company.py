import os
import re

with open('routes/company.py', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''        result = supabase.table("job_applications").update({"status": status}).eq("id", app_id).execute()
        
        status_msg = f"Your application status has been updated to: **{status.capitalize()}**"
        supabase.table("company_messages").insert({
            "application_id": app_id,
            "sender_type": "company",
            "sender_id": company["id"],
            "sender_name": company["name"],
            "message": status_msg
        }).execute()
        
        return result.data[0]'''

pattern = re.compile(r'(        result = supabase\.table\("job_applications"\)\.update\(\{"status": status\}\)\.eq\("id", app_id\)\.execute\(\)\s*return result\.data\[0\])')

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open('routes/company.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Successfully updated company.py with regex')
else:
    print('Target not found!')

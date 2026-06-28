import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

res = supabase.table('career_paths').select('*').eq('ecosystem', 'Python').execute()
if res.data:
    data = res.data[0] # taking first one found
    print(f"Role: {data['role_name']}, Ecosystem: {data['ecosystem']}")
    
    print("\n--- ROADMAP JSON SUMMARY ---")
    roadmap = data['roadmap_json']
    for node in roadmap.get('nodes', []):
        if node['type'] == 'SINGLE':
            print(f"SINGLE: {node.get('skill')}")
        else:
            print(f"{node['type']}: {node.get('group_name')}")
            for alt in node.get('alternatives', []):
                print(f"  - {alt.get('skill')}")
                if 'children' in alt:
                    print(f"    (Has {len(alt['children'])} children)")
                    for child in alt['children']:
                         if child.get('type') == 'SINGLE':
                              print(f"      CHILD SINGLE: {child.get('skill')}")
                         else:
                              print(f"      CHILD {child.get('type')}: {child.get('group_name')}")
                              for calt in child.get('alternatives', []):
                                   print(f"        - {calt.get('skill')}")
else:
    print('No data found for Python ecosystem')

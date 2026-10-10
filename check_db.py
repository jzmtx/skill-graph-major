import os
import sys
from dotenv import load_dotenv

# Add the backend dir to path so we can import database.py
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from database import supabase

res = supabase.table("companies").select("*").execute()
print("Companies:")
for c in res.data:
    print(c)

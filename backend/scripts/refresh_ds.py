import asyncio
from database import supabase
from services.industry_engine import update_industry_statistics

print("Deleting old statistics for Data Scientist...")
supabase.table("industry_statistics").delete().eq("career_name", "Data Scientist").execute()
supabase.table("industry_intelligence").delete().eq("role_name", "Data Scientist").execute()
supabase.table("career_paths").delete().eq("role_name", "Data Scientist").execute()

print("Fetching fresh job market data...")
update_industry_statistics("Data Scientist")
print("Done!")

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise Exception("DATABASE_URL not found in .env")

# Modify connection string for psycopg2 (replace supabase with postgres if needed, though mostly standard)
if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://")
# Fix unescaped @ in password
if "Skillgraph@123@" in DB_URL:
    DB_URL = DB_URL.replace("Skillgraph@123@", "Skillgraph%40123@")

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

with open("roadmap_progress_migration.sql", "r") as f:
    sql = f.read()
    
print("Applying roadmap_progress_migration.sql...")
cur.execute(sql)
print("Migration applied successfully!")
cur.close()
conn.close()

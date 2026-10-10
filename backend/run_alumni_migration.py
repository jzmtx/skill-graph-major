import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    print("DATABASE_URL not found")
    exit(1)

with psycopg2.connect(DB_URL) as conn:
    with conn.cursor() as cur:
        with open('migrations/alumni_messages.sql', 'r') as f:
            cur.execute(f.read())
    conn.commit()

print("Migration successful")

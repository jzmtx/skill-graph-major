import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

sql = """
CREATE TABLE IF NOT EXISTS skill_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_name TEXT UNIQUE NOT NULL,
    official_docs_url TEXT,
    best_video_url TEXT,
    best_video_title TEXT,
    practice_project TEXT,
    confidence_score FLOAT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

import psycopg2
try:
    db_url = os.environ.get("DATABASE_URL")
    if "@123@" in db_url:
        db_url = db_url.replace("@123@", "%40123@")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    cur.close()
    conn.close()
    print("Migration successful via psycopg2")
except Exception as e2:
    print("Failed via psycopg2:", e2)

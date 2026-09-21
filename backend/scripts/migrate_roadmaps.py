import os
import sys
import subprocess

try:
    import psycopg2
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

from dotenv import load_dotenv
load_dotenv()

db_url = os.environ.get("DATABASE_URL")
if db_url and "@123@" in db_url:
    db_url = db_url.replace("@123@", "%40123@")

sql = """
-- 1. Job Market Data Tracking
CREATE TABLE IF NOT EXISTS public.job_market_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portal_source TEXT NOT NULL,
    job_role TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    demand_percentage INTEGER NOT NULL,
    average_salary_range TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.job_market_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to job_market_data" ON public.job_market_data;
CREATE POLICY "Allow public read access to job_market_data" ON public.job_market_data FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert to job_market_data" ON public.job_market_data;
CREATE POLICY "Allow public insert to job_market_data" ON public.job_market_data FOR INSERT WITH CHECK (true);

-- 2. Career Roadmaps (JSON Trees based on market data)
CREATE TABLE IF NOT EXISTS public.career_roadmaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL,
    ecosystem TEXT NOT NULL,
    roadmap_json JSONB NOT NULL,
    estimated_months INTEGER DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.career_roadmaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to career_roadmaps" ON public.career_roadmaps;
CREATE POLICY "Allow public read access to career_roadmaps" ON public.career_roadmaps FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert to career_roadmaps" ON public.career_roadmaps;
CREATE POLICY "Allow public insert to career_roadmaps" ON public.career_roadmaps FOR INSERT WITH CHECK (true);
"""

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql)
    print("Roadmaps Migration successful.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error migrating: {e}")

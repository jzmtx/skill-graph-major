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
CREATE TABLE IF NOT EXISTS public.coding_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    skill_name TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
    question_base_text TEXT NOT NULL,
    starter_code TEXT,
    correct_answer TEXT,
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.coding_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to coding_questions" ON public.coding_questions;
CREATE POLICY "Allow public read access to coding_questions" ON public.coding_questions
    FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.student_seen_coding_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    coding_question_id UUID REFERENCES public.coding_questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, coding_question_id)
);

ALTER TABLE public.student_seen_coding_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert and read coding seen" ON public.student_seen_coding_questions;
CREATE POLICY "Allow public insert and read coding seen" ON public.student_seen_coding_questions 
    FOR ALL USING (true) WITH CHECK (true);
"""

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql)
    print("Migration successful.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error migrating: {e}")

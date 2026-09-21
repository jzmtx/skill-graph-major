-- Migration script for Industry-Driven Data Pipeline Tables

-- 1. Canonical Skills (From ESCO)
CREATE TABLE IF NOT EXISTS public.canonical_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    esco_uri TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    skill_type TEXT, -- e.g., 'skill/competence', 'knowledge'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Raw Job Postings
CREATE TABLE IF NOT EXISTS public.raw_job_postings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL,
    company_name TEXT,
    job_title TEXT,
    description TEXT,
    url TEXT,
    source TEXT, -- e.g., 'Adzuna', 'JobSpy-MNC'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Role-Skill Demand (The final Industry Scores)
CREATE TABLE IF NOT EXISTS public.role_skill_demand (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL,
    canonical_skill_id UUID REFERENCES public.canonical_skills(id) ON DELETE CASCADE,
    
    -- Metrics
    jd_frequency NUMERIC(5, 4) DEFAULT 0.0,
    onet_trend_score NUMERIC(5, 4) DEFAULT 0.0,
    mnc_presence_score NUMERIC(5, 4) DEFAULT 0.0,
    dependency_score NUMERIC(5, 4) DEFAULT 0.0,
    ecosystem_score NUMERIC(5, 4) DEFAULT 0.0,
    
    -- Final Calculated Score
    industry_score NUMERIC(5, 4) DEFAULT 0.0,
    
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(role_name, canonical_skill_id)
);

-- Enable RLS and setup basic policies (open for backend processing)
ALTER TABLE public.canonical_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_skill_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to canonical_skills" ON public.canonical_skills FOR SELECT USING (true);
CREATE POLICY "Allow public insert to canonical_skills" ON public.canonical_skills FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to raw_job_postings" ON public.raw_job_postings FOR SELECT USING (true);
CREATE POLICY "Allow public insert to raw_job_postings" ON public.raw_job_postings FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to role_skill_demand" ON public.role_skill_demand FOR SELECT USING (true);
CREATE POLICY "Allow public insert to role_skill_demand" ON public.role_skill_demand FOR ALL USING (true);

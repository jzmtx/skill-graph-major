-- V2 Resource Engine Architecture Migration

-- 1. Add slug to canonical_skills
ALTER TABLE public.canonical_skills ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Drop the old skill_resources table and recreate it
DROP TABLE IF EXISTS public.skill_resources CASCADE;

CREATE TABLE public.skill_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    skill_id UUID REFERENCES public.canonical_skills(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Curated Resource Content
    official_docs_url TEXT,
    best_video_url TEXT,
    best_video_title TEXT,
    practice_project TEXT,
    sub_topics JSONB, -- Array of objects: { name, best_video_url, official_docs_url, practice_project }
    
    -- Quality and Versioning Metrics (V2 Architecture)
    confidence_score FLOAT,
    status TEXT DEFAULT 'APPROVED', -- CANDIDATE, VALIDATING, APPROVED, PUBLISHED, BROKEN
    version TEXT DEFAULT '1.0',
    last_verified TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.skill_resources ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for backend processing
CREATE POLICY "Allow public read access to skill_resources" ON public.skill_resources FOR SELECT USING (true);
CREATE POLICY "Allow public insert to skill_resources" ON public.skill_resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to skill_resources" ON public.skill_resources FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to skill_resources" ON public.skill_resources FOR DELETE USING (true);

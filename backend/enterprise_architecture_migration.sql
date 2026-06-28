-- ==========================================
-- Enterprise Architecture Migration
-- ==========================================

-- 1. Industry Intelligence Database (Raw Scraped Data)
CREATE TABLE IF NOT EXISTS industry_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT NOT NULL,
    ecosystem TEXT,
    company_name TEXT NOT NULL,
    source_url TEXT,
    raw_text TEXT,
    extracted_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    quality_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Skill Knowledge Graph (Global Dictionary)
CREATE TABLE IF NOT EXISTS skill_knowledge_graph (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    normalized_name TEXT NOT NULL UNIQUE,
    aliases JSONB DEFAULT '[]'::jsonb,
    category TEXT,
    global_frequency_score INTEGER DEFAULT 0,
    official_docs_url TEXT,
    best_course_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Career Paths (Cached Product)
CREATE TABLE IF NOT EXISTS career_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT NOT NULL,
    ecosystem TEXT NOT NULL,
    core_skills JSONB DEFAULT '[]'::jsonb,
    recommended_skills JSONB DEFAULT '[]'::jsonb,
    roadmap_json JSONB NOT NULL,
    analytics_json JSONB,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_name, ecosystem)
);

-- Enable RLS (Row Level Security) - Optional but good practice
ALTER TABLE industry_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow public read access for industry_intelligence" ON industry_intelligence FOR SELECT USING (true);
CREATE POLICY "Allow public read access for skill_knowledge_graph" ON skill_knowledge_graph FOR SELECT USING (true);
CREATE POLICY "Allow public read access for career_paths" ON career_paths FOR SELECT USING (true);

-- Allow anonymous insert access (for the backend API to write freely)
CREATE POLICY "Allow public insert access for industry_intelligence" ON industry_intelligence FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access for skill_knowledge_graph" ON skill_knowledge_graph FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access for career_paths" ON career_paths FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for career_paths" ON career_paths FOR UPDATE USING (true) WITH CHECK (true);

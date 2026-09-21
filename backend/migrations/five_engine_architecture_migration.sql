-- Migration for 5-Engine Architecture

-- 1. Create career_blueprints
CREATE TABLE IF NOT EXISTS career_blueprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_name TEXT NOT NULL UNIQUE,
    conceptual_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create resource_packs
CREATE TABLE IF NOT EXISTS resource_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES skill_knowledge_graph(id) ON DELETE CASCADE,
    official_docs_url TEXT,
    best_youtube_url TEXT,
    best_free_course_url TEXT,
    practice_platform_url TEXT,
    project_ideas JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(skill_id)
);

-- 3. Create industry_statistics
CREATE TABLE IF NOT EXISTS industry_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_name TEXT NOT NULL,
    skill_id UUID NOT NULL REFERENCES skill_knowledge_graph(id) ON DELETE CASCADE,
    jobspy_demand_percentage NUMERIC DEFAULT 0.0,
    github_popularity_score NUMERIC DEFAULT 0.0,
    registry_downloads_score NUMERIC DEFAULT 0.0,
    composite_recommendation_score NUMERIC DEFAULT 0.0,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(career_name, skill_id)
);

-- 4. Alter skill_knowledge_graph
ALTER TABLE skill_knowledge_graph
ADD COLUMN IF NOT EXISTS careers JSONB DEFAULT '[]'::jsonb;

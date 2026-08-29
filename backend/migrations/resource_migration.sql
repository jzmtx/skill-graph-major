CREATE TABLE IF NOT EXISTS skill_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_name TEXT UNIQUE NOT NULL,
    official_docs_url TEXT,
    best_video_url TEXT,
    best_video_title TEXT,
    practice_project TEXT,
    sub_topics JSONB,
    confidence_score FLOAT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

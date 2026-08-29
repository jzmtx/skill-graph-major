CREATE TABLE IF NOT EXISTS roadmap_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_skill_id UUID NOT NULL REFERENCES skill_knowledge_graph(id) ON DELETE CASCADE,
    to_skill_id UUID NOT NULL REFERENCES skill_knowledge_graph(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('REQUIRES', 'ALTERNATIVE', 'OPTIONAL', 'RECOMMENDED', 'COMPLEMENTS')),
    career_context TEXT,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_skill_id, to_skill_id, relation_type, career_context)
);

-- Index for fast traversal
CREATE INDEX IF NOT EXISTS idx_roadmap_edges_from ON roadmap_edges(from_skill_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_edges_to ON roadmap_edges(to_skill_id);

-- ==========================================
-- Graph Database Migration
-- ==========================================

-- 1. Create the Edges table to transform our flat table into a true Graph
CREATE TABLE IF NOT EXISTS skill_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_skill_id UUID NOT NULL REFERENCES skill_knowledge_graph(id) ON DELETE CASCADE,
    target_skill_id UUID NOT NULL REFERENCES skill_knowledge_graph(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- e.g., DEPENDS_ON, ALTERNATIVE_TO, REQUIRES, CONCEPTUAL_PARENT
    context_metadata JSONB DEFAULT '{}'::jsonb, -- Store LLM reasoning or source proof
    confidence_score NUMERIC DEFAULT 100.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_skill_id, target_skill_id, relationship_type)
);

-- Index for fast graph traversals
CREATE INDEX IF NOT EXISTS idx_skill_edges_source ON skill_edges(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_edges_target ON skill_edges(target_skill_id);

-- Enable RLS
ALTER TABLE skill_edges ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for now so backend can freely read/write
CREATE POLICY "Allow public read access for skill_edges" ON skill_edges FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for skill_edges" ON skill_edges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for skill_edges" ON skill_edges FOR UPDATE USING (true) WITH CHECK (true);

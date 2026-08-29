ALTER TABLE skill_knowledge_graph
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS parent_skill_id UUID REFERENCES skill_knowledge_graph(id),
ADD COLUMN IF NOT EXISTS prerequisite_skill_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS difficulty TEXT,
ADD COLUMN IF NOT EXISTS learning_time TEXT;

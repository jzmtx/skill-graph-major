-- Create V1 decoupled schema tables

CREATE TABLE IF NOT EXISTS technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_name VARCHAR(255) UNIQUE NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    category VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS technology_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_tech_id UUID REFERENCES technologies(id) ON DELETE CASCADE,
    to_tech_id UUID REFERENCES technologies(id) ON DELETE CASCADE,
    relation_type VARCHAR(100) NOT NULL,
    UNIQUE (from_tech_id, to_tech_id, relation_type)
);

CREATE TABLE IF NOT EXISTS relationship_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID REFERENCES technology_relationships(id) ON DELETE CASCADE,
    source_type VARCHAR(100) NOT NULL, -- registry, github, docs, job_market, llm
    source_count INT DEFAULT 0,
    confidence FLOAT DEFAULT 0.0,
    UNIQUE (relationship_id, source_type)
);

CREATE TABLE IF NOT EXISTS occupations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    code VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS occupation_skills (
    occupation_id UUID REFERENCES occupations(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES technologies(id) ON DELETE CASCADE,
    relation_type VARCHAR(100),
    PRIMARY KEY (occupation_id, skill_id)
);

CREATE TABLE IF NOT EXISTS learning_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technology_id UUID REFERENCES technologies(id) ON DELETE SET NULL,
    concept_name VARCHAR(255) NOT NULL,
    difficulty_level VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS learning_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES learning_nodes(id) ON DELETE CASCADE,
    prerequisite_node_id UUID REFERENCES learning_nodes(id) ON DELETE CASCADE,
    UNIQUE (node_id, prerequisite_node_id)
);

CREATE TABLE IF NOT EXISTS learning_alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES learning_nodes(id) ON DELETE CASCADE,
    alternative_group_id UUID NOT NULL,
    UNIQUE (node_id, alternative_group_id)
);

CREATE TABLE IF NOT EXISTS industry_skill_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occupation_id UUID REFERENCES occupations(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES technologies(id) ON DELETE CASCADE,
    demand_score FLOAT DEFAULT 0.0,
    recency_score FLOAT DEFAULT 0.0,
    diversity_score FLOAT DEFAULT 0.0,
    UNIQUE (occupation_id, skill_id)
);

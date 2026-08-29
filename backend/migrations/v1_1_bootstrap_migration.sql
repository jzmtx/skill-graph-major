-- V1.1 database extensions

ALTER TABLE technology_relationships 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'provisional', -- 'trusted' or 'provisional'
ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0.0;

ALTER TABLE career_paths
ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 1.0;

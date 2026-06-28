-- Add analytics tracking column to career_roadmaps
ALTER TABLE public.career_roadmaps 
ADD COLUMN IF NOT EXISTS analytics_json JSONB;

-- Create user_saved_roadmaps junction table
CREATE TABLE IF NOT EXISTS public.user_saved_roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR NOT NULL,
    roadmap_id UUID REFERENCES public.career_roadmaps(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, roadmap_id)
);

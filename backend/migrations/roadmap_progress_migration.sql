-- Tracking individual node progress for a student within a specific roadmap
CREATE TABLE IF NOT EXISTS public.student_roadmap_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    roadmap_id UUID REFERENCES public.career_roadmaps(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL, -- The unique ID of the node within the roadmap JSON
    skill_id UUID, -- References canonical_skills if applicable
    status TEXT DEFAULT 'locked', -- locked, unlocked, assessed, project_completed
    assessment_score INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, roadmap_id, node_id)
);

ALTER TABLE public.student_roadmap_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual read access to roadmap nodes" ON public.student_roadmap_nodes;
CREATE POLICY "Allow individual read access to roadmap nodes" ON public.student_roadmap_nodes
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );
DROP POLICY IF EXISTS "Allow individual insert/update access to roadmap nodes" ON public.student_roadmap_nodes;
CREATE POLICY "Allow individual insert/update access to roadmap nodes" ON public.student_roadmap_nodes
    FOR ALL USING (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    ) WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );

-- Tracking Milestone and Capstone projects for a roadmap
CREATE TABLE IF NOT EXISTS public.student_roadmap_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    roadmap_id UUID REFERENCES public.career_roadmaps(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL, -- 'chunk_assessment' (e.g., Frontend) or 'capstone_project'
    title TEXT NOT NULL,
    github_repo_url TEXT,
    status TEXT DEFAULT 'pending', -- pending, passed, failed
    score INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, roadmap_id, title)
);

ALTER TABLE public.student_roadmap_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow individual read access to milestones" ON public.student_roadmap_milestones;
CREATE POLICY "Allow individual read access to milestones" ON public.student_roadmap_milestones
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );
DROP POLICY IF EXISTS "Allow individual insert/update access to milestones" ON public.student_roadmap_milestones;
CREATE POLICY "Allow individual insert/update access to milestones" ON public.student_roadmap_milestones
    FOR ALL USING (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    ) WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );

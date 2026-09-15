-- ============================================================
-- SkillGraph TPO Module
-- Additive migration — does not modify any existing tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.college_student_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending_tpo_approval' CHECK (status IN ('pending_tpo_approval', 'pending_student_acceptance', 'linked')),
    initiated_by TEXT DEFAULT 'student' CHECK (initiated_by IN ('student', 'tpo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, college_id)
);

-- RLS Policies
ALTER TABLE public.college_student_links ENABLE ROW LEVEL SECURITY;

-- Allow public read access to colleges for linking
CREATE POLICY "Allow tpo to view their links" ON public.college_student_links
    FOR SELECT USING (
        college_id IN (SELECT college_id FROM public.tpo_officials WHERE auth_id = auth.uid())
    );

CREATE POLICY "Allow student to view their links" ON public.college_student_links
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );

CREATE POLICY "Allow public insert to links" ON public.college_student_links
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow tpo to update their links" ON public.college_student_links
    FOR UPDATE USING (
        college_id IN (SELECT college_id FROM public.tpo_officials WHERE auth_id = auth.uid())
    );

CREATE POLICY "Allow student to update their links" ON public.college_student_links
    FOR UPDATE USING (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );

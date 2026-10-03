-- ============================================================
-- SkillGraph: Open Source Module Migration
-- Connects Alumni-shared open source projects with Students
-- ============================================================

-- 1. Open Source Projects (posted by verified alumni)
CREATE TABLE IF NOT EXISTS public.open_source_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumni_id UUID REFERENCES public.alumni(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    repo_url TEXT,
    tech_stack TEXT[] DEFAULT '{}',
    max_contributors INTEGER DEFAULT 5,
    guidelines TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Open Source Applications (students apply for projects)
CREATE TABLE IF NOT EXISTS public.open_source_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.open_source_projects(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    pitch TEXT,
    status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'selected', 'rejected')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, student_id)
);

-- 3. Open Source Groups / Teams (created by alumni within a project)
CREATE TABLE IF NOT EXISTS public.open_source_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.open_source_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Group Members (students chosen & assigned to a group)
CREATE TABLE IF NOT EXISTS public.open_source_group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.open_source_groups(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'contributor',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, student_id)
);

-- 5. Individual Student Performance Logs (ratings & metrics by alumni)
CREATE TABLE IF NOT EXISTS public.open_source_performance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.open_source_projects(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
    week_label TEXT DEFAULT 'Week 1',
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- Row Level Security & Policies
-- ============================================================

ALTER TABLE public.open_source_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_source_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_source_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_source_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_source_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to open_source_projects" ON public.open_source_projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert to open_source_projects" ON public.open_source_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to open_source_projects" ON public.open_source_projects FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to open_source_applications" ON public.open_source_applications FOR SELECT USING (true);
CREATE POLICY "Allow public insert to open_source_applications" ON public.open_source_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to open_source_applications" ON public.open_source_applications FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to open_source_groups" ON public.open_source_groups FOR SELECT USING (true);
CREATE POLICY "Allow public insert to open_source_groups" ON public.open_source_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to open_source_groups" ON public.open_source_groups FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to open_source_group_members" ON public.open_source_group_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert to open_source_group_members" ON public.open_source_group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete to open_source_group_members" ON public.open_source_group_members FOR DELETE USING (true);

CREATE POLICY "Allow public read access to open_source_performance_logs" ON public.open_source_performance_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert to open_source_performance_logs" ON public.open_source_performance_logs FOR INSERT WITH CHECK (true);

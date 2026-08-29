-- ============================================================
-- SkillGraph Module 2: Ecosystem (Company / TPO / Alumni)
-- Additive migration — does not modify any existing tables
-- ============================================================

-- 1. Companies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Recruiters (linked to a company + a Supabase auth user)
CREATE TABLE IF NOT EXISTS public.recruiters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TPO Officials (linked to a college + a Supabase auth user)
CREATE TABLE IF NOT EXISTS public.tpo_officials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    designation TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Alumni (linked to a college + a Supabase auth user)
CREATE TABLE IF NOT EXISTS public.alumni (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passout_year INTEGER,
    current_company TEXT,
    current_job_role TEXT,
    linkedin_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Jobs (posted by a recruiter)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recruiter_id UUID REFERENCES public.recruiters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    required_skills TEXT[] DEFAULT '{}',
    location TEXT,
    ctc TEXT,
    deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Applications (student applies to a job)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'rejected', 'hired')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, student_id)
);

-- 7. Opportunities (posted by alumni)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumni_id UUID REFERENCES public.alumni(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'referral' CHECK (type IN ('referral', 'internship', 'mentorship')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Opportunity Interest (student expresses interest)
CREATE TABLE IF NOT EXISTS public.opportunity_interest (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    expressed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(opportunity_id, student_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tpo_officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_interest ENABLE ROW LEVEL SECURITY;

-- Companies: public read (students need to see company names on jobs), authenticated insert
CREATE POLICY "Allow public read access to companies" ON public.companies
    FOR SELECT USING (true);
CREATE POLICY "Allow public insert to companies" ON public.companies
    FOR INSERT WITH CHECK (true);

-- Recruiters: individual read/insert of own profile
CREATE POLICY "Allow individual read access to recruiter profile" ON public.recruiters
    FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Allow individual insert to recruiter profile" ON public.recruiters
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- TPO officials: individual read/insert of own profile
CREATE POLICY "Allow individual read access to tpo profile" ON public.tpo_officials
    FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Allow individual insert to tpo profile" ON public.tpo_officials
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Alumni: individual read/insert of own profile, but public read for directory/opportunity display
CREATE POLICY "Allow public read access to alumni" ON public.alumni
    FOR SELECT USING (true);
CREATE POLICY "Allow individual insert to alumni profile" ON public.alumni
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Jobs: public read (students browse jobs), insert allowed (checked at API layer for verified recruiters)
CREATE POLICY "Allow public read access to jobs" ON public.jobs
    FOR SELECT USING (true);
CREATE POLICY "Allow public insert to jobs" ON public.jobs
    FOR INSERT WITH CHECK (true);

-- Applications: student can read/insert their own applications
CREATE POLICY "Allow individual read access to applications" ON public.applications
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );
CREATE POLICY "Allow individual insert to applications" ON public.applications
    FOR INSERT WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );

-- Opportunities: public read (students browse), insert allowed (checked at API layer for verified alumni)
CREATE POLICY "Allow public read access to opportunities" ON public.opportunities
    FOR SELECT USING (true);
CREATE POLICY "Allow public insert to opportunities" ON public.opportunities
    FOR INSERT WITH CHECK (true);

-- Opportunity interest: student can read/insert their own interest records
CREATE POLICY "Allow individual read access to opportunity interest" ON public.opportunity_interest
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );
CREATE POLICY "Allow individual insert to opportunity interest" ON public.opportunity_interest
    FOR INSERT WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );
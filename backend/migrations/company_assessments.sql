CREATE TABLE IF NOT EXISTS public.company_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES public.job_applications(id) ON DELETE CASCADE UNIQUE,
    assessment_link TEXT NOT NULL,
    guidelines TEXT,
    student_status TEXT DEFAULT 'pending' CHECK (student_status IN ('pending', 'accepted', 'completed', 'declined')),
    company_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

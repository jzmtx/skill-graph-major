CREATE TABLE IF NOT EXISTS public.raw_job_descriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL,
    ecosystem TEXT NOT NULL,
    company_name TEXT NOT NULL,
    source_url TEXT,
    jd_text TEXT,
    extracted_skills JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.raw_job_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to raw_jds" ON public.raw_job_descriptions
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert to raw_jds" ON public.raw_job_descriptions
    FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES public.job_applications(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('company', 'student')),
    sender_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

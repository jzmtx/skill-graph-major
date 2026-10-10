CREATE TABLE IF NOT EXISTS public.alumni_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('alumni', 'student')),
    sender_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.open_source_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.open_source_projects(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('alumni', 'student')),
    sender_id UUID NOT NULL,
    sender_name TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.open_source_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to open_source_messages" ON public.open_source_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert to open_source_messages" ON public.open_source_messages FOR INSERT WITH CHECK (true);

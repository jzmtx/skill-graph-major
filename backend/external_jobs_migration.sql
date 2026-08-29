ALTER TABLE public.jobs ALTER COLUMN recruiter_id DROP NOT NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal' CHECK (source IN ('internal', 'external'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_name TEXT;
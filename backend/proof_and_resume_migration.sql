-- ============================================================
-- Adds proof-of-identity fields (Company/TPO/Alumni) and
-- resume/cover note fields (Applications)
-- Additive migration — does not modify existing columns
-- ============================================================

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS proof_document_url TEXT;
ALTER TABLE public.tpo_officials ADD COLUMN IF NOT EXISTS proof_document_url TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS proof_document_url TEXT;

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS cover_note TEXT;
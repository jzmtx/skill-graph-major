-- ==============================================================
-- Coupled Knowledge Graph & Dependency Migration SQL
-- ==============================================================

-- 1. Create skill_dependencies table for modeling the graph edges (DAG)
CREATE TABLE IF NOT EXISTS public.skill_dependencies (
    skill_id UUID REFERENCES public.skill_knowledge_graph(id) ON DELETE CASCADE,
    prerequisite_id UUID REFERENCES public.skill_knowledge_graph(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'strict', -- 'strict' or 'recommended'
    PRIMARY KEY (skill_id, prerequisite_id)
);

-- Enable RLS on dependencies
ALTER TABLE public.skill_dependencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access for skill_dependencies" ON public.skill_dependencies;
CREATE POLICY "Allow public read access for skill_dependencies" ON public.skill_dependencies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert access for skill_dependencies" ON public.skill_dependencies;
CREATE POLICY "Allow public insert access for skill_dependencies" ON public.skill_dependencies FOR INSERT WITH CHECK (true);

-- 2. Create resource_catalog table to structure verified, ranked learning materials
CREATE TABLE IF NOT EXISTS public.resource_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES public.skill_knowledge_graph(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    type TEXT CHECK (type IN ('video', 'documentation', 'interactive', 'book')),
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    is_official BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on resource_catalog
ALTER TABLE public.resource_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access for resource_catalog" ON public.resource_catalog;
CREATE POLICY "Allow public read access for resource_catalog" ON public.resource_catalog FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert access for resource_catalog" ON public.resource_catalog;
CREATE POLICY "Allow public insert access for resource_catalog" ON public.resource_catalog FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update access for resource_catalog" ON public.resource_catalog;
CREATE POLICY "Allow public update access for resource_catalog" ON public.resource_catalog FOR UPDATE USING (true) WITH CHECK (true);

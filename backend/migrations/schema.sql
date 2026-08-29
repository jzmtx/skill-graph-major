-- Schema for SkillGraph Module 1

-- 1. Colleges Table
CREATE TABLE IF NOT EXISTS public.colleges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    district TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    state TEXT,
    branch TEXT,
    year INTEGER,
    usn TEXT,
    college_id UUID REFERENCES public.colleges(id),
    github_url TEXT,
    linkedin_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - optional but recommended
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Allow public read access to colleges
CREATE POLICY "Allow public read access to colleges" ON public.colleges
    FOR SELECT USING (true);

-- Allow public insert to colleges (for new college registration)
CREATE POLICY "Allow public insert to colleges" ON public.colleges
    FOR INSERT WITH CHECK (true);

-- Allow users to read their own student profile
CREATE POLICY "Allow individual read access to student profile" ON public.students
    FOR SELECT USING (auth.uid() = auth_id);

-- Allow users to create their own student profile
CREATE POLICY "Allow individual insert to student profile" ON public.students
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- 3. Student Skills Table (Level 0 to Level 2)
CREATE TABLE IF NOT EXISTS public.student_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    source TEXT DEFAULT 'github', -- 'github', 'manual'
    verification_level INTEGER DEFAULT 0, -- 0: Extracted, 1: Assessed, 2: Project Verified
    skill_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, skill_name)
);

-- 4. Assessment Questions Caching Table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    skill_name TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
    question_base_text TEXT NOT NULL,
    options_json JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    topic TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for student_skills
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read access to skills" ON public.student_skills
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE auth_id = auth.uid())
    );

-- RLS for questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to questions" ON public.questions
    FOR SELECT USING (true);

-- 5. Student Seen Questions Tracking
CREATE TABLE IF NOT EXISTS public.student_seen_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, question_id)
);

ALTER TABLE public.student_seen_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert and read" ON public.student_seen_questions 
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Coding Questions Tracking
CREATE TABLE IF NOT EXISTS public.coding_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    skill_name TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
    question_base_text TEXT NOT NULL,
    starter_code TEXT,
    correct_answer TEXT,
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.coding_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to coding_questions" ON public.coding_questions
    FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to coding_questions" ON public.coding_questions
    FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.student_seen_coding_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    coding_question_id UUID REFERENCES public.coding_questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, coding_question_id)
);

ALTER TABLE public.student_seen_coding_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert and read coding seen" ON public.student_seen_coding_questions 
    FOR ALL USING (true) WITH CHECK (true);

-- API Usage Tracking Logs
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL, -- e.g., 'Groq', 'Tavily', 'Adzuna', 'ONET'
    endpoint TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0.0,
    status_code INTEGER,
    quota_remaining INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to api_usage_logs" ON public.api_usage_logs;
CREATE POLICY "Allow public read access to api_usage_logs" ON public.api_usage_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert to api_usage_logs" ON public.api_usage_logs;
CREATE POLICY "Allow public insert to api_usage_logs" ON public.api_usage_logs FOR INSERT WITH CHECK (true);


-- =============================================
-- EMPLOYTEENS — ENTERPRISE SUPABASE SCHEMA
-- Run this in your Supabase SQL editor
-- =============================================

-- Enable pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 14 AND age <= 19),
  state TEXT NOT NULL CHECK (state IN ('NY', 'NJ')),
  zip_code TEXT NOT NULL,
  transportation TEXT NOT NULL,
  school_grade TEXT NOT NULL,
  school_end_time TEXT NOT NULL DEFAULT '3:00 PM',
  availability JSONB NOT NULL DEFAULT '{}',
  skills JSONB NOT NULL DEFAULT '[]',
  interests JSONB NOT NULL DEFAULT '[]',
  resume_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- JOBS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('NY', 'NJ')),
  zip_code TEXT NOT NULL,
  apply_url TEXT NOT NULL,
  source TEXT NOT NULL,

  -- Eligibility
  min_age INTEGER NOT NULL DEFAULT 14,
  experience_required TEXT NOT NULL DEFAULT 'none',

  -- AI enrichment scores (0-100)
  teen_friendly_score INTEGER NOT NULL DEFAULT 50 CHECK (teen_friendly_score BETWEEN 0 AND 100),
  schedule_flexibility_score INTEGER NOT NULL DEFAULT 50 CHECK (schedule_flexibility_score BETWEEN 0 AND 100),
  hiring_speed_score INTEGER NOT NULL DEFAULT 50 CHECK (hiring_speed_score BETWEEN 0 AND 100),
  scam_risk_score INTEGER NOT NULL DEFAULT 0 CHECK (scam_risk_score BETWEEN 0 AND 100),

  -- Physical/logistical attributes
  commute_estimate INTEGER NOT NULL DEFAULT 30,
  physical_demand_level INTEGER NOT NULL DEFAULT 50 CHECK (physical_demand_level BETWEEN 0 AND 100),
  customer_interaction_level INTEGER NOT NULL DEFAULT 50 CHECK (customer_interaction_level BETWEEN 0 AND 100),

  -- Job description / tags
  description TEXT,
  tags TEXT[],
  salary_min INTEGER,
  salary_max INTEGER,
  job_type TEXT DEFAULT 'part_time',

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'flagged')),
  last_verified_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ DEFAULT NOW(),

  -- AI embedding for vector similarity search
  embedding vector(1536),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active jobs" ON public.jobs;
CREATE POLICY "Anyone can read active jobs"
  ON public.jobs FOR SELECT
  USING (status = 'active' AND scam_risk_score < 70);

-- Index for fast AI feed queries
CREATE INDEX IF NOT EXISTS jobs_state_idx ON public.jobs(state);
CREATE INDEX IF NOT EXISTS jobs_zip_idx ON public.jobs(zip_code);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON public.jobs(status);
CREATE INDEX IF NOT EXISTS jobs_teen_score_idx ON public.jobs(teen_friendly_score DESC);
CREATE INDEX IF NOT EXISTS jobs_source_idx ON public.jobs(source);
CREATE INDEX IF NOT EXISTS jobs_created_idx ON public.jobs(created_at DESC);

-- Vector similarity index
CREATE INDEX IF NOT EXISTS jobs_embedding_idx ON public.jobs
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =============================================
-- APPLICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'interviewing', 'offered', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own applications" ON public.applications;
CREATE POLICY "Users can manage own applications"
  ON public.applications FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- JOB MATCHES TABLE (cached AI match scores)
-- =============================================
CREATE TABLE IF NOT EXISTS public.job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  match_explanation TEXT,
  feed_section TEXT NOT NULL DEFAULT 'best_matches',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own matches" ON public.job_matches;
CREATE POLICY "Users can read own matches"
  ON public.job_matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS matches_user_score_idx ON public.job_matches(user_id, match_score DESC);
CREATE INDEX IF NOT EXISTS matches_feed_section_idx ON public.job_matches(user_id, feed_section);

-- =============================================
-- JOB INGESTION LOG
-- =============================================
CREATE TABLE IF NOT EXISTS public.ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  jobs_fetched INTEGER NOT NULL DEFAULT 0,
  jobs_inserted INTEGER NOT NULL DEFAULT 0,
  jobs_rejected INTEGER NOT NULL DEFAULT 0,
  jobs_deduplicated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Admin only
ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ANALYTICS EVENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own events" ON public.analytics_events;
CREATE POLICY "Users can insert own events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON public.applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MATCH FEED FUNCTION (fast server-side feed)
-- =============================================
CREATE OR REPLACE FUNCTION get_user_feed(
  p_user_id UUID,
  p_section TEXT DEFAULT 'best_matches',
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  job_id UUID,
  title TEXT,
  company TEXT,
  location TEXT,
  apply_url TEXT,
  teen_friendly_score INTEGER,
  hiring_speed_score INTEGER,
  schedule_flexibility_score INTEGER,
  match_score INTEGER,
  match_explanation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.company,
    j.location,
    j.apply_url,
    j.teen_friendly_score,
    j.hiring_speed_score,
    j.schedule_flexibility_score,
    jm.match_score,
    jm.match_explanation
  FROM public.job_matches jm
  JOIN public.jobs j ON j.id = jm.job_id
  WHERE jm.user_id = p_user_id
    AND jm.feed_section = p_section
    AND j.status = 'active'
    AND j.scam_risk_score < 70
  ORDER BY jm.match_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

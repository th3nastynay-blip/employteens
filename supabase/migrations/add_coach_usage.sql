-- EMPLOYTEENS — coach usage meter
--
-- Opus costs roughly 15-25x per message what the Groq model did. Without a cap,
-- one bored teenager with a keyboard, or one script, is an unbounded bill
-- against a personal card. This is the meter.
--
-- WHY A TABLE AND NOT AN IN-MEMORY COUNTER. Vercel functions are stateless and
-- horizontally scaled, so a module-level Map resets on every cold start and is
-- not shared between concurrent instances. It would read as working in testing
-- and enforce nothing in production. The counter has to live where all
-- instances can see it.
--
-- WHY (user_id, day) AND NOT A ROLLING WINDOW. A rolling window needs one row
-- per message and a time-range scan on every request. A day bucket is one row
-- per user per day, upserted, and the whole check is a single primary-key read.
-- The cost of the simpler shape is that the allowance resets at midnight UTC
-- rather than exactly 24h after first use, which no teen will ever notice.

CREATE TABLE IF NOT EXISTS public.coach_usage (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day         date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  messages    integer NOT NULL DEFAULT 0,
  -- Rough running total, for spotting a runaway before the invoice does.
  est_tokens  integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.coach_usage ENABLE ROW LEVEL SECURITY;

-- A teen may read their own meter, so the UI can show "3 left today" instead of
-- only finding out by hitting the wall mid-sentence.
DROP POLICY IF EXISTS "own usage readable" ON public.coach_usage;
CREATE POLICY "own usage readable"
  ON public.coach_usage FOR SELECT
  USING (auth.uid() = user_id);

-- No client-side INSERT or UPDATE policy, deliberately. Writes happen only
-- through the service role in the API route. A limit the client can increment
-- is not a limit.

CREATE INDEX IF NOT EXISTS coach_usage_day_idx ON public.coach_usage (day);

-- Atomic increment-and-report.
--
-- Done in SQL rather than read-then-write in TypeScript because two messages
-- sent in the same tick would otherwise both read the old count and both
-- write count+1, letting a determined user hold the limit open indefinitely.
-- INSERT ... ON CONFLICT DO UPDATE is a single atomic statement, so concurrent
-- calls serialise on the row lock and every one of them gets a distinct number.
CREATE OR REPLACE FUNCTION public.bump_coach_usage(
  p_user_id uuid,
  p_limit   integer,
  p_tokens  integer DEFAULT 0
)
RETURNS TABLE (allowed boolean, used integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_used  integer;
BEGIN
  INSERT INTO public.coach_usage (user_id, day, messages, est_tokens, updated_at)
  VALUES (p_user_id, v_today, 1, GREATEST(p_tokens, 0), now())
  ON CONFLICT (user_id, day) DO UPDATE
    SET messages   = public.coach_usage.messages + 1,
        est_tokens = public.coach_usage.est_tokens + GREATEST(p_tokens, 0),
        updated_at = now()
  RETURNING public.coach_usage.messages INTO v_used;

  RETURN QUERY SELECT
    v_used <= p_limit,
    v_used,
    GREATEST(p_limit - v_used, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.bump_coach_usage(uuid, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_coach_usage(uuid, integer, integer) TO service_role;

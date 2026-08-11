-- EMPLOYTEENS — the one thing on the ladder that is not self-reported
-- Run in Supabase Dashboard → SQL Editor.
--
-- WHY
-- Every rung is currently the teen telling us. Working papers is a checkbox.
-- "Applied" is the teen tapping yes when they come back to the app. "Hired" is
-- the teen saying so. That is fine for a tracker — it is your own diary. It is
-- not fine the moment we describe it to an employer as a track record, because
-- the entire value of a reference is that somebody OTHER than the candidate
-- said it.
--
-- This adds the smallest possible piece of outside confirmation: the adult the
-- teen named clicks a link and says yes. No employer has to sign up. No
-- integration. One row, one token, one click.
--
-- WHY NO OUTBOUND EMAIL
-- We deliberately do NOT email the adult ourselves. The teen shares the link —
-- text, email, in person, however they already talk to that person. Reasons,
-- in order of weight:
--
--   1. Child safety and privacy. Sending unsolicited mail naming a minor to an
--      adult whose address a minor typed in is a bad shape, whatever the
--      intent. NY's Child Data Protection Act took effect 20 June 2025 and
--      treats 13-17 data as requiring the teen's own informed consent; the
--      narrower the data flow, the better.
--   2. It works better. A supervisor who gets a text from a kid they know
--      opens it. A cold email from an app they have never heard of goes in
--      the bin or the spam folder.
--   3. We have no email provider wired up, so this ships today rather than
--      after a Resend account and a domain verification.
--
-- If outbound is ever added, the token flow below does not change.

ALTER TABLE public.users
  -- Unguessable. Generated per teen when they first ask someone.
  ADD COLUMN IF NOT EXISTS reference_token        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS reference_token_at     TIMESTAMPTZ,
  -- Set when the adult clicks confirm. THE only non-self-reported field.
  ADD COLUMN IF NOT EXISTS reference_confirmed_at TIMESTAMPTZ,
  -- What the adult typed about themselves. Their words, not the teen's.
  ADD COLUMN IF NOT EXISTS reference_confirmed_by TEXT,
  -- An explicit no. Distinct from "has not answered", and it must be possible:
  -- a vouch you cannot decline is not a vouch.
  ADD COLUMN IF NOT EXISTS reference_declined_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_reference_token_idx
  ON public.users (reference_token) WHERE reference_token IS NOT NULL;

-- NOTE ON ACCESS
-- The vouch page is public and unauthenticated, so it CANNOT go through RLS
-- with an anon key. /api/reference/* uses the service-role client and looks
-- the row up by token only. The token is the whole authorisation, so:
--
--   * it is generated with crypto.randomUUID, never sequential
--   * the public page returns the teen's FIRST NAME ONLY, plus the role and
--     org the teen typed. No surname, no age, no ZIP, no email, no listings.
--     An adult confirming a reference does not need any of that, and a leaked
--     token should expose as little as possible about a minor.
--   * expiry is enforced in the route (30 days from reference_token_at)
--     rather than in SQL, so the message can say "this link expired" instead
--     of "not found".

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────────────
--   SELECT count(*) FILTER (WHERE reference_name IS NOT NULL)      AS named,
--          count(*) FILTER (WHERE reference_confirmed_at IS NOT NULL) AS vouched,
--          count(*) FILTER (WHERE reference_declined_at IS NOT NULL)  AS declined
--     FROM public.users;
--
-- named vs vouched is the number that matters. A large gap means teens are
-- asking and adults are not replying, which is a product problem, not a bug.

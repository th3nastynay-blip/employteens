-- EMPLOYTEENS — the resume
--
-- REPLACES A FEATURE THAT NEVER WORKED. Onboarding uploaded a file to a
-- `resumes` storage bucket and saved getPublicUrl() into users.resume_url. That
-- URL answers 400 — identical to the response for a bucket name that does not
-- exist — so the "Resume uploaded, tap to view" link on every profile has been
-- dead since it shipped. The upload call discards its `error` binding, so it
-- failed silently and nobody found out.
--
-- WHY STRUCTURED DATA AND NOT A FILE. A file is opaque: we cannot show it in
-- the app, the coach cannot revise it, and a teen on a phone has no way to edit
-- a PDF. Structured JSON can be rendered, printed, rewritten by the coach, and
-- regenerated when their profile changes. It also means the resume starts
-- three-quarters written, because we already hold the name, school, grade,
-- skills and — the rare and valuable part — a confirmed reference.
--
-- ONE ROW PER USER. Version history sounds appealing and is not worth it here:
-- a teen has one resume, and "which of my nine drafts was the good one" is a
-- problem we would be inventing for them.
--
-- PII. This holds a minor's full name, phone, email and school in one row.
-- Owner-only RLS, no service-role read path in any feature, cascade from
-- auth.users so account deletion really erases it.

CREATE TABLE IF NOT EXISTS public.user_resumes (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Shape lives in lib/resume/types.ts. jsonb rather than thirty columns
  -- because the sections are lists of free text that will keep changing, and
  -- migrating a column per field would be a migration per copy edit.
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own resume" ON public.user_resumes;
CREATE POLICY "own resume" ON public.user_resumes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- EMPLOYTEENS — record of third-party AI consent
--
-- App Store Guideline 5.1.2(i), Apple's wording: "You must clearly disclose
-- where personal data will be shared with third parties, including with
-- third-party AI, and obtain explicit permission before doing so."
--
-- Permission has to be recorded somewhere the SERVER can check, because the
-- server is what makes the outbound call to the AI provider. A flag in
-- localStorage would let anyone clear their storage and silently start sending
-- a minor's profile to a third party with no consent on file.
--
-- A TIMESTAMP, NOT A BOOLEAN. If consent is ever challenged — by a parent, a
-- regulator, or App Review — "true" answers nothing. The date answers when, and
-- setting it back to NULL is a clean withdrawal that leaves no ambiguity about
-- the current state. Absent and refused are deliberately the same value,
-- because both mean: do not send.
--
-- ai_consent_version exists so that changing the provider or the payload
-- invalidates old consent. Someone who agreed to Groq receiving their ZIP code
-- has not agreed to a different company receiving their resume, and silently
-- reusing the old timestamp would be exactly the "repurposed without further
-- consent" that 5.1.2(ii) prohibits.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_consent_at      timestamptz,
  ADD COLUMN IF NOT EXISTS ai_consent_version text;

COMMENT ON COLUMN public.users.ai_consent_at IS
  'When the user explicitly agreed to send profile data to the third-party AI provider. NULL = never agreed or withdrawn; in both cases do not send.';
COMMENT ON COLUMN public.users.ai_consent_version IS
  'Which provider/payload they agreed to. Bump when either changes so consent is re-collected rather than inherited.';

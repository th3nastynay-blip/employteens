-- EMPLOYTEENS — saved coach conversations
--
-- The chat lived in sessionStorage, which is tab-scoped: closing the tab threw
-- away the resume you spent twenty minutes building with the coach. On a phone,
-- where the browser evicts background tabs whenever it feels like it, that is
-- not an edge case, it is the normal experience.
--
-- TWO TABLES, NOT ONE JSONB COLUMN. Messages as a jsonb array on the
-- conversation row means every appended message rewrites the whole blob, and
-- there is no way to page a long chat or index anything inside it. Rows are
-- boring and they are correct.
--
-- PRIVACY, AND THIS ONE IS NOT BOILERPLATE. Teens tell this coach things they
-- would not put in a profile: that money is tight at home, that they were fired,
-- what they are scared of in an interview. Moving that from a tab to a database
-- is a real escalation in what we hold, so:
--   * RLS is owner-only on both tables, with no service-role read path used by
--     any feature. Nothing in the product reads another user's chats.
--   * ON DELETE CASCADE from auth.users, so /api/account/delete really does
--     erase them rather than orphaning rows nobody remembers exist.
--   * Deleting a single conversation cascades to its messages.
-- The privacy policy needs a line saying coach conversations are stored and how
-- to delete them. That is a copy change, not a code change, but it is required.

CREATE TABLE IF NOT EXISTS public.coach_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Derived from the first user message, not model-generated. A title is not
  -- worth a second inference call, and "Help me write a resume" is a better
  -- label than anything a summariser would invent anyway.
  title       text NOT NULL DEFAULT 'New chat',
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Sort key for the list. Bumped on every message so an active chat rises.
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- user_id is denormalised onto messages deliberately. Without it, the RLS
-- policy has to sub-select the parent conversation on every single row, which
-- turns loading a 60-message chat into 60 correlated subqueries.
CREATE INDEX IF NOT EXISTS coach_conversations_user_idx
  ON public.coach_conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS coach_messages_convo_idx
  ON public.coach_messages (conversation_id, created_at);

ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages      ENABLE ROW LEVEL SECURITY;

-- Owner-only, all four verbs. The client talks to these tables directly through
-- supabase-js, so RLS is the entire access control layer — there is no API route
-- in front of it to re-check anything.
DROP POLICY IF EXISTS "own conversations" ON public.coach_conversations;
CREATE POLICY "own conversations" ON public.coach_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own messages" ON public.coach_messages;
CREATE POLICY "own messages" ON public.coach_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Keep updated_at honest without the client having to remember.
CREATE OR REPLACE FUNCTION public.touch_coach_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coach_conversations
     SET updated_at = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coach_messages_touch ON public.coach_messages;
CREATE TRIGGER coach_messages_touch
  AFTER INSERT ON public.coach_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_coach_conversation();

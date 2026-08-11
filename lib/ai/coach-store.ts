'use client'

/**
 * EMPLOYTEENS — saved coach conversations, client side
 *
 * Talks to Supabase directly rather than through an API route. RLS on
 * coach_conversations and coach_messages is owner-only, so the database is the
 * access control layer and a route in front of it would add a hop, a
 * serialisation format and a second place for the auth check to drift out of
 * sync with the first.
 *
 * EVERY FUNCTION SWALLOWS ITS ERRORS AND DEGRADES.
 *
 * The migration is a file somebody has to run, and history has established that
 * it does not always get run before the code ships. If these tables do not
 * exist, every call here fails, and the correct outcome is a coach that works
 * exactly as it did before with no saved history — not a chat page that throws
 * on mount. So: list returns [], save returns null, and the caller carries on.
 *
 * Nothing here is on the critical path of sending a message. Persistence
 * happens after the stream settles, so a failed write costs the history entry
 * and never the answer.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * The generated Database type predates these two tables, so the typed client
 * narrows every insert on them to `never`. Casting to an untyped client here is
 * the smaller lie than hand-editing generated types that the next `supabase gen
 * types` run would overwrite. Regenerate the types and this cast can go.
 */
function db(): SupabaseClient {
  return createClient() as unknown as SupabaseClient
}

export interface Conversation {
  id: string
  title: string
  updated_at: string
}

export interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/**
 * A title from the first thing they typed.
 *
 * Not model-generated: a title is not worth a second inference call, and the
 * teen's own words are a better label than a summary would be. "Help me write a
 * resume" already says everything a list entry needs to.
 */
export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= 48) return clean || 'New chat'
  // Cut at a word boundary so the list never shows half a word before the
  // ellipsis.
  return `${clean.slice(0, 48).replace(/\s+\S*$/, '')}…`
}

export async function listConversations(limit = 40): Promise<Conversation[]> {
  try {
    const supabase = db()
    const { data, error } = await supabase
      .from('coach_conversations')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as Conversation[]
  } catch {
    return []
  }
}

export async function loadMessages(conversationId: string): Promise<StoredMessage[]> {
  try {
    const supabase = db()
    const { data, error } = await supabase
      .from('coach_messages')
      .select('id, role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as StoredMessage[]
  } catch {
    return []
  }
}

/** Returns the new conversation id, or null if persistence is unavailable. */
export async function createConversation(firstMessage: string): Promise<string | null> {
  try {
    const supabase = db()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('coach_conversations')
      .insert({ user_id: user.id, title: titleFrom(firstMessage) })
      .select('id')
      .single()
    if (error) throw error
    return (data?.id as string) ?? null
  } catch {
    return null
  }
}

export async function appendMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  if (!conversationId || !content.trim()) return
  try {
    const supabase = db()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('coach_messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content,
    })
  } catch {
    // History entry lost, conversation unaffected.
  }
}

export async function deleteConversation(id: string): Promise<boolean> {
  try {
    const supabase = db()
    // Messages go with it via ON DELETE CASCADE. Deleting the parent only is
    // what leaves orphaned rows holding things a teen asked us to erase.
    const { error } = await supabase.from('coach_conversations').delete().eq('id', id)
    if (error) throw error
    return true
  } catch {
    return false
  }
}

export async function renameConversation(id: string, title: string): Promise<boolean> {
  try {
    const supabase = db()
    const { error } = await supabase
      .from('coach_conversations')
      .update({ title: title.slice(0, 120) })
      .eq('id', id)
    if (error) throw error
    return true
  } catch {
    return false
  }
}

/** "2h ago", "Yesterday", "Mar 4". Short enough for a list row. */
export function whenLabel(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.floor((Date.now() - then) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

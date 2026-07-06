import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// @supabase/ssr v0.5.2 was written against an older SupabaseClient generic signature.
// In @supabase/supabase-js v2.108+, SupabaseClient gained an extra leading generic
// (SchemaNameOrClientOptions), shifting the parameter positions. This causes
// createBrowserClient's return type to be mistyped — Schema ends up in the SchemaName
// slot. We cast the return to SupabaseClient<Database> so TypeScript resolves types
// correctly. The runtime value (and session handling) is unaffected.
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<Database>
}

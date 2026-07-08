import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { SupabaseClient, createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

type CookieEntry = { name: string; value: string; options: CookieOptions }

// Same @supabase/ssr v0.5.2 / @supabase/supabase-js v2.108+ generic mismatch as client.ts.
// Explicit SupabaseClient<Database> return type restores correct type inference.
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieEntry[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  ) as unknown as SupabaseClient<Database>
}

/**
 * Service-role client — deliberately NOT cookie-aware.
 *
 * The previous implementation used createServerClient with the request's
 * cookies. That meant any request carrying a Supabase session cookie (e.g.
 * an admin triggering an ingest from their browser) sent the USER's JWT
 * instead of the service-role key — RLS silently applied and inserts failed
 * with "new row violates row-level security policy". Cron requests have no
 * cookies, which is why the same code worked on schedule but failed from a
 * browser. Admin means service role, unconditionally.
 */
export async function createAdminClient(): Promise<SupabaseClient<Database>> {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ) as unknown as SupabaseClient<Database>
}

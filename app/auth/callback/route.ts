import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')   // 'recovery' for password-reset links
  const next = searchParams.get('next')   // optional override

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Password-reset flow: send user to /reset-password so they can choose a new one.
      // The temporary recovery session is now active; /reset-password calls updateUser().
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // OAuth / email-confirmation flow: route based on onboarding state.
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single() as { data: { onboarding_completed: boolean } | null, error: unknown }

        const destination = profile?.onboarding_completed ? '/dashboard' : '/onboarding'
        return NextResponse.redirect(`${origin}${next ?? destination}`)
      }
    }

    // Code exchange failed (expired, already used, etc.)
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  // No code in URL — malformed or direct access
  return NextResponse.redirect(`${origin}/login?error=missing_code`)
}

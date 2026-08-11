/**
 * EMPLOYTEENS — reference vouch API
 *
 * Two audiences, two auth models, one file.
 *
 *   POST  /api/reference          authenticated teen. Saves who they asked and
 *                                 mints the share token.
 *   GET   /api/reference?token=   PUBLIC. The adult opening the link. Returns
 *                                 the minimum needed to decide.
 *   PATCH /api/reference          PUBLIC. The adult confirming or declining.
 *
 * The token IS the authorisation for the public routes, so everything here is
 * built around limiting what a leaked token can expose. See the disclosure
 * note on GET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

/** A link that has sat unopened for a month is stale, not pending. */
const TOKEN_TTL_DAYS = 30

function firstNameOf(full: string | null | undefined): string {
  return String(full ?? '').trim().split(/\s+/)[0] || 'A student'
}

function isExpired(issuedAt: string | null): boolean {
  if (!issuedAt) return true
  const age = (Date.now() - new Date(issuedAt).getTime()) / 86_400_000
  return age > TOKEN_TTL_DAYS
}

// ─────────────────────────────────────────────────────────────────────────────
// Teen names someone and gets a link to send them
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { name?: string; role?: string; org?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim().slice(0, 80)
  const role = String(body.role ?? '').trim().slice(0, 80)
  const org = String(body.org ?? '').trim().slice(0, 120)
  if (!name || !role) {
    return NextResponse.json({ error: 'Who are they, and what do they do?' }, { status: 400 })
  }

  // Reuse the existing token if one is live. Reminting on every edit would
  // silently break a link the teen already sent to their supervisor.
  const { data: existing } = await supabase
    .from('users')
    .select('reference_token, reference_token_at, reference_confirmed_at')
    .eq('id', user.id)
    .single()

  const keepToken =
    existing?.reference_token && !isExpired(existing.reference_token_at as string | null)
  const token = keepToken ? String(existing!.reference_token) : crypto.randomUUID()

  const { error } = await supabase
    .from('users')
    .update({
      reference_name: name,
      reference_role: role,
      reference_org: org || null,
      reference_added_at: new Date().toISOString(),
      reference_token: token,
      reference_token_at: keepToken ? existing!.reference_token_at : new Date().toISOString(),
      // Changing WHO you asked invalidates an answer about someone else.
      // Keeping the old confirmation would let a teen get one adult to vouch
      // and then swap the name for a different, more impressive one.
      ...(existing?.reference_confirmed_at && !keepToken
        ? { reference_confirmed_at: null, reference_confirmed_by: null }
        : {}),
      reference_declined_at: null,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })

  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  return NextResponse.json({ ok: true, url: `${base}/vouch/${token}` })
}

// ─────────────────────────────────────────────────────────────────────────────
// The adult opens the link
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = await createAdminClient()
  const { data } = await admin
    .from('users')
    .select('name, reference_name, reference_role, reference_org, reference_token_at, reference_confirmed_at, reference_declined_at')
    .eq('reference_token', token)
    .single()

  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (isExpired(data.reference_token_at as string | null)) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  // MINIMUM DISCLOSURE.
  //
  // First name only. No surname, no age, no ZIP, no email, no school, nothing
  // about what they have applied to. An adult deciding whether to vouch for a
  // kid they already know needs none of it, and this page is reachable by
  // anyone holding the token.
  return NextResponse.json({
    studentFirstName: firstNameOf(data.name as string | null),
    askedName: data.reference_name,
    askedRole: data.reference_role,
    askedOrg: data.reference_org,
    alreadyConfirmed: Boolean(data.reference_confirmed_at),
    alreadyDeclined: Boolean(data.reference_declined_at),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// The adult answers
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  let body: { token?: string; decision?: string; confirmedBy?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const token = String(body.token ?? '')
  const decision = body.decision === 'decline' ? 'decline' : 'confirm'
  const confirmedBy = String(body.confirmedBy ?? '').trim().slice(0, 120)
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = await createAdminClient()
  const { data: row } = await admin
    .from('users')
    .select('id, reference_token_at')
    .eq('reference_token', token)
    .single()

  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (isExpired(row.reference_token_at as string | null)) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  const now = new Date().toISOString()
  const { error } = await admin
    .from('users')
    .update(
      decision === 'confirm'
        ? { reference_confirmed_at: now, reference_confirmed_by: confirmedBy || null, reference_declined_at: null }
        // A decline is recorded, not hidden. A vouch you cannot refuse is not
        // a vouch, and the teen needs to know to ask someone else rather than
        // waiting forever on a silent link.
        : { reference_declined_at: now, reference_confirmed_at: null, reference_confirmed_by: null },
    )
    .eq('id', row.id)

  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true, decision })
}

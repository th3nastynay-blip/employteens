/**
 * Supabase Edge Function — generates daily AI feed for all users
 * Schedule: supabase functions schedule add cron-generate-feed --cron "0 6 * * *"
 * (Runs at 6am EST daily)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Trigger the Next.js API route that handles feed generation
  const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? ''
  const res = await fetch(`${appUrl}/api/generate-feed`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('CRON_SECRET')}`,
      'Content-Type': 'application/json',
    },
  })

  const result = await res.json()

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})

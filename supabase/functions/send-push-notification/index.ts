import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
// web-push removed: use the Web Push API via fetch instead
// import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VAPID_PUBLIC_KEY = 'BD8frhjMCLpofBswS-zbKdQGp6-8PVlVFUZvqr_C3NLHw5WFhk-yk7d2xvCTue2SDDHFd35t8YPQ4Ah7aH95pWY'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check admin auth (allow internal calls with service key via Authorization header)
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      // Allow service role key for internal calls
      if (token !== supabaseServiceKey) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Admin required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    const { title, body, url } = await req.json()

    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title and body required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    webpush.setVapidDetails(
      'mailto:hello@aiinasia.com',
      VAPID_PUBLIC_KEY,
      vapidPrivateKey
    )

    // Fetch all subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')

    if (fetchError) throw fetchError

    console.log(`Sending push to ${subscriptions?.length || 0} subscribers`)

    const payload = JSON.stringify({ title, body, url: url || '/', icon: '/favicon.png' })
    let successCount = 0
    let failCount = 0
    const expiredIds: string[] = []

    for (const sub of subscriptions || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
        successCount++
      } catch (err: any) {
        failCount++
        // Remove expired/invalid subscriptions (410 Gone or 404)
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredIds.push(sub.id)
        }
        console.error(`Push failed for ${sub.endpoint}:`, err.message)
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds)
      console.log(`Removed ${expiredIds.length} expired subscriptions`)
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, cleaned: expiredIds.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Send push error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

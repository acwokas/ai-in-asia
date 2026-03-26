import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VAPID_PUBLIC_KEY = 'BD8frhjMCLpofBswS-zbKdQGp6-8PVlVFUZvqr_C3NLHw5WFhk-yk7d2xvCTue2SDDHFd35t8YPQ4Ah7aH95pWY'

// --- VAPID / Web Push helpers (no npm:web-push dependency) ---

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (base64.length % 4)) % 4
  const raw = atob(base64 + '='.repeat(pad))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function importVapidKey(base64Key: string): Promise<CryptoKey> {
  const raw = base64UrlToUint8Array(base64Key)
  return crypto.subtle.importKey('pkcs8', raw.buffer as ArrayBuffer, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

function uint8ToBase64Url(arr: Uint8Array): string {
  let binary = ''
  for (const byte of arr) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function createVapidAuthHeader(endpoint: string, vapidPrivateKey: string): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60

  const header = uint8ToBase64Url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = uint8ToBase64Url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: expiration,
    sub: 'mailto:hello@aiinasia.com',
  })))

  const unsignedToken = `${header}.${payload}`
  const key = await importVapidKey(vapidPrivateKey)
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken),
  ))

  // Convert from DER to raw r||s if needed (WebCrypto returns raw 64 bytes for P-256)
  const jwt = `${unsignedToken}.${uint8ToBase64Url(signature)}`

  return {
    authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    cryptoKey: `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check admin auth
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
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
        const vapidHeaders = await createVapidAuthHeader(sub.endpoint, vapidPrivateKey)

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'TTL': '86400',
            'Authorization': vapidHeaders.authorization,
            'Crypto-Key': vapidHeaders.cryptoKey,
          },
          body: new TextEncoder().encode(payload),
        })

        if (response.ok || response.status === 201) {
          successCount++
        } else if (response.status === 410 || response.status === 404) {
          expiredIds.push(sub.id)
          failCount++
        } else {
          failCount++
          console.error(`Push failed for ${sub.endpoint}: ${response.status}`)
        }
      } catch (err: any) {
        failCount++
        console.error(`Push failed for ${sub.endpoint}:`, err.message)
      }
    }

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

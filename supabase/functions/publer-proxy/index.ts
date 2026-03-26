import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const PUBLER_BASE = 'https://app.publer.io/api/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ── Auth: verify JWT + admin role ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: claimsErr } = await supabase.auth.getUser(token)
    const claimsData = user ? { claims: { sub: user.id } } : null
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = claimsData.claims.sub as string
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: roleRow } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Publer credentials ──
    const publerApiKey = Deno.env.get('PUBLER_API_KEY')
    const publerWorkspaceId = Deno.env.get('PUBLER_WORKSPACE_ID')
    if (!publerApiKey || !publerWorkspaceId) {
      return new Response(
        JSON.stringify({ error: 'PUBLER_API_KEY or PUBLER_WORKSPACE_ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Determine endpoint ──
    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint') || 'posts'

    // Allowlist to prevent SSRF
    const ALLOWED = ['posts', 'accounts', 'media', 'analytics', 'reports']
    const basePath = endpoint.split('/')[0]
    if (!ALLOWED.includes(basePath)) {
      return new Response(
        JSON.stringify({ error: `Endpoint "${endpoint}" not allowed. Use: ${ALLOWED.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Forward remaining query params (except "endpoint") to Publer
    const forwardParams = new URLSearchParams()
    for (const [k, v] of url.searchParams.entries()) {
      if (k !== 'endpoint') forwardParams.set(k, v)
    }
    const qs = forwardParams.toString()
    const publerUrl = `${PUBLER_BASE}/${endpoint}${qs ? '?' + qs : ''}`

    console.log(`[publer-proxy] → GET ${publerUrl}`)

    const publerRes = await fetch(publerUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer-API ${publerApiKey}`,
        'Publer-Workspace-Id': publerWorkspaceId,
        'Content-Type': 'application/json',
        'User-Agent': 'AIinAsia/1.0',
      },
    })

    if (!publerRes.ok) {
      const errText = await publerRes.text()
      console.error(`[publer-proxy] Publer returned ${publerRes.status}: ${errText}`)
      return new Response(
        JSON.stringify({ error: `Publer API error (${publerRes.status})`, details: errText }),
        { status: publerRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await publerRes.json()

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[publer-proxy] Fatal error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

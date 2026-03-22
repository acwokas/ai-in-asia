import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const PUBLER_BASE = 'https://app.publer.com/api/v1'

async function publerGet(path: string, apiKey: string, workspaceId: string, params?: Record<string, string>): Promise<any> {
  const url = new URL(`${PUBLER_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer-API ${apiKey}`,
      'Publer-Workspace-Id': workspaceId,
      'Content-Type': 'application/json',
      'User-Agent': 'AIinAsia/1.0',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Publer GET ${path} failed (${res.status}): ${text}`)
  }
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check admin role
    const userId = claimsData.claims.sub as string
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const publerApiKey = Deno.env.get('PUBLER_API_KEY')
    const publerWorkspaceId = Deno.env.get('PUBLER_WORKSPACE_ID')

    if (!publerApiKey || !publerWorkspaceId) {
      return new Response(JSON.stringify({ error: 'Publer credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request params
    const url = new URL(req.url)
    const from = url.searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const to = url.searchParams.get('to') || new Date().toISOString().slice(0, 10)

    console.log(`Fetching Publer analytics from ${from} to ${to}`)

    // 1) Fetch accounts
    const accountsRes = await publerGet('/accounts', publerApiKey, publerWorkspaceId)
    const accounts = Array.isArray(accountsRes) ? accountsRes : accountsRes?.accounts || []

    console.log(`Found ${accounts.length} Publer accounts`)

    // 2) Fetch post insights per account
    const accountInsights: any[] = []
    for (const account of accounts) {
      try {
        const insights = await publerGet(
          `/analytics/${account.id}/post_insights`,
          publerApiKey,
          publerWorkspaceId,
          { from, to },
        )
        accountInsights.push({
          account_id: account.id,
          account_name: account.name || account.username || 'Unknown',
          platform: (account.platform || account.type || 'unknown').toLowerCase(),
          avatar: account.avatar || account.picture || null,
          posts: insights?.posts || [],
          total_posts: insights?.posts?.length || 0,
        })
      } catch (err: any) {
        console.warn(`Failed to fetch insights for account ${account.id}: ${err.message}`)
        accountInsights.push({
          account_id: account.id,
          account_name: account.name || account.username || 'Unknown',
          platform: (account.platform || account.type || 'unknown').toLowerCase(),
          avatar: account.avatar || account.picture || null,
          posts: [],
          total_posts: 0,
          error: err.message,
        })
      }
    }

    // 3) Fetch recent posts (scheduled + published)
    let recentPosts: any[] = []
    try {
      const postsRes = await publerGet('/posts', publerApiKey, publerWorkspaceId, {
        from,
        to,
        state: 'published',
        per_page: '50',
      })
      recentPosts = Array.isArray(postsRes) ? postsRes : postsRes?.posts || []
    } catch (err: any) {
      console.warn(`Failed to fetch recent posts: ${err.message}`)
    }

    // 4) Aggregate metrics
    const platformSummary: Record<string, {
      platform: string
      account_name: string
      total_posts: number
      total_likes: number
      total_comments: number
      total_shares: number
      total_impressions: number
      total_reach: number
      total_clicks: number
      total_engagement: number
    }> = {}

    for (const acct of accountInsights) {
      const key = acct.platform
      if (!platformSummary[key]) {
        platformSummary[key] = {
          platform: acct.platform,
          account_name: acct.account_name,
          total_posts: 0,
          total_likes: 0,
          total_comments: 0,
          total_shares: 0,
          total_impressions: 0,
          total_reach: 0,
          total_clicks: 0,
          total_engagement: 0,
        }
      }
      const s = platformSummary[key]
      s.total_posts += acct.total_posts

      for (const post of acct.posts) {
        s.total_likes += post.likes || post.reactions || 0
        s.total_comments += post.comments || 0
        s.total_shares += post.shares || post.reposts || post.retweets || 0
        s.total_impressions += post.impressions || 0
        s.total_reach += post.reach || 0
        s.total_clicks += post.clicks || post.link_clicks || 0
        s.total_engagement += post.engagement || post.total_engagement || 0
      }
    }

    // 5) Build top posts list
    const allPosts = accountInsights.flatMap(a =>
      a.posts.map((p: any) => ({
        ...p,
        platform: a.platform,
        account_name: a.account_name,
      }))
    )
    const topPosts = allPosts
      .sort((a: any, b: any) => (b.engagement || b.total_engagement || 0) - (a.engagement || a.total_engagement || 0))
      .slice(0, 10)
      .map((p: any) => ({
        title: (p.text || p.title || '').substring(0, 120),
        platform: p.platform,
        scheduled_at: p.scheduled_at || p.published_at || null,
        likes: p.likes || p.reactions || 0,
        comments: p.comments || 0,
        shares: p.shares || p.reposts || p.retweets || 0,
        impressions: p.impressions || 0,
        clicks: p.clicks || p.link_clicks || 0,
        engagement: p.engagement || p.total_engagement || 0,
      }))

    return new Response(JSON.stringify({
      success: true,
      period: { from, to },
      accounts: accounts.length,
      platforms: Object.values(platformSummary),
      top_posts: topPosts,
      recent_posts_count: recentPosts.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in publer-analytics:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

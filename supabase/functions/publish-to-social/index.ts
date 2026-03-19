import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PUBLER_BASE = 'https://app.publer.com/api/v1'

// Stagger offsets in minutes after article published_at
const PLATFORM_OFFSETS: Record<string, number> = {
  facebook: 30,
  twitter: 60,
  linkedin: 90,
  instagram: 120,
  tiktok: 150,
  youtube: 150,
}

// Media file names per platform
const PLATFORM_MEDIA: Record<string, string> = {
  facebook: 'landscape.jpg',
  twitter: 'landscape.jpg',
  linkedin: 'landscape.jpg',
  instagram: 'square.jpg',
  tiktok: 'vertical.mp4',
  youtube: 'vertical.mp4',
}

interface PlatformAccount {
  id: string
  platform_name: string
  publer_account_id: string
  post_type: string
  media_format: string
  is_active: boolean
}

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  published_at: string
  featured_image_url: string | null
  primary_category_id: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchSocialCopy(
  supabase: any,
  slug: string,
  platform: string,
  article: Article,
): Promise<string> {
  try {
    const path = `social/${slug}/${platform}_copy.txt`
    const { data, error } = await supabase.storage
      .from('article-images')
      .download(path)

    if (!error && data) {
      const text = await data.text()
      if (text.trim()) {
        console.log(`  ✓ Found social copy for ${platform} at ${path}`)
        return text.trim()
      }
    }
  } catch (e) {
    // fall through to fallback
  }

  // Fallback: generate from title/excerpt
  const excerpt = article.excerpt
    ? article.excerpt.substring(0, 200)
    : ''
  const fallback = excerpt
    ? `${article.title}\n\n${excerpt}`
    : article.title
  console.log(`  ⚠ No social copy for ${platform}, using fallback`)
  return fallback
}

async function publerRequest(
  method: string,
  path: string,
  apiKey: string,
  workspaceId: string,
  body?: Record<string, unknown>,
): Promise<any> {
  const url = `${PUBLER_BASE}${path}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer-API ${apiKey}`,
    'Publer-Workspace-Id': workspaceId,
    'Content-Type': 'application/json',
    'User-Agent': 'AIinAsia/1.0',
  }

  const opts: RequestInit = { method, headers }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Publer ${method} ${path} failed (${res.status}): ${text}`)
  }
  return res.json()
}

async function schedulePost(
  apiKey: string,
  workspaceId: string,
  accountId: string,
  copy: string,
  scheduledTime: string,
  mediaUrl: string | null,
): Promise<any> {
  const postData: Record<string, unknown> = {
    account_id: accountId,
    text: copy,
    scheduled_at: scheduledTime,
    ...(mediaUrl ? { media_url: mediaUrl } : {}),
  }

  const payload = {
    bulk: [postData],
  }

  console.log(`  📅 Scheduling post for ${scheduledTime}`)
  return publerRequest('POST', '/posts/schedule', apiKey, workspaceId, payload)
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== publish-to-social: starting ===')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const publerApiKey = Deno.env.get('PUBLER_API_KEY')
    const publerWorkspaceId = Deno.env.get('PUBLER_WORKSPACE_ID')

    if (!publerApiKey || !publerWorkspaceId) {
      console.error('Missing PUBLER_API_KEY or PUBLER_WORKSPACE_ID')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Publer credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1) Articles published in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: articles, error: artErr } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, published_at, featured_image_url, primary_category_id')
      .eq('status', 'published')
      .gte('published_at', twentyFourHoursAgo)
      .order('published_at', { ascending: false })

    if (artErr) throw artErr
    if (!articles || articles.length === 0) {
      console.log('No recently published articles found')
      return new Response(
        JSON.stringify({ success: true, message: 'No articles to post', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Found ${articles.length} articles published in last 24h`)

    // 2) Get active platform accounts
    const { data: platforms, error: platErr } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('is_active', true)

    if (platErr) throw platErr
    if (!platforms || platforms.length === 0) {
      console.log('No active platform accounts')
      return new Response(
        JSON.stringify({ success: true, message: 'No active platforms', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Active platforms: ${platforms.map((p: PlatformAccount) => p.platform_name).join(', ')}`)

    // 3) Get existing social_posts to skip duplicates
    const articleIds = articles.map((a: Article) => a.id)
    const { data: existingPosts, error: existErr } = await supabase
      .from('social_posts')
      .select('article_id, platform')
      .in('article_id', articleIds)

    if (existErr) throw existErr

    const postedSet = new Set(
      (existingPosts || []).map((p: { article_id: string; platform: string }) => `${p.article_id}:${p.platform}`),
    )

    const results: Array<{ article: string; platform: string; status: string; error?: string }> = []

    // 4) Process each article × platform
    for (const article of articles as Article[]) {
      console.log(`\n📰 Processing: "${article.title}" (${article.slug})`)

      for (const platform of platforms as PlatformAccount[]) {
        const key = `${article.id}:${platform.platform_name}`
        if (postedSet.has(key)) {
          console.log(`  ⭐ Already posted to ${platform.platform_name}, skipping`)
          continue
        }

        try {
          // a) Get social copy
          const copy = await fetchSocialCopy(supabase, article.slug, platform.platform_name, article)

          // b) Determine media URL from storage (with /social/ prefix)
          const mediaFile = PLATFORM_MEDIA[platform.platform_name] || 'landscape.jpg'
          const mediaStorageUrl = `${supabaseUrl}/storage/v1/object/public/article-images/social/${article.slug}/${mediaFile}`

          // c) Calculate staggered schedule time
          const offsetMinutes = PLATFORM_OFFSETS[platform.platform_name] || 60
          const publishedAt = new Date(article.published_at)
          const scheduledFor = new Date(publishedAt.getTime() + offsetMinutes * 60 * 1000)
          // If scheduled time is in the past, schedule 5 min from now
          const now = new Date()
          const finalSchedule = scheduledFor > now ? scheduledFor : new Date(now.getTime() + 5 * 60 * 1000)
          const scheduledIso = finalSchedule.toISOString()

          // d) Schedule post on Publer (passing media URL directly)
          const publerRes = await schedulePost(
            publerApiKey,
            publerWorkspaceId,
            platform.publer_account_id,
            copy,
            scheduledIso,
            mediaStorageUrl,
          )

          const publerPostId = publerRes?.id || publerRes?.post_id || null

          // e) Insert record into social_posts
          const { error: insertErr } = await supabase.from('social_posts').insert({
            article_id: article.id,
            article_slug: article.slug,
            platform: platform.platform_name,
            publer_post_id: publerPostId,
            status: 'scheduled',
            scheduled_for: scheduledIso,
            post_copy: copy,
            media_url: mediaStorageUrl,
            publer_response: publerRes,
          })

          if (insertErr) {
            console.error(`  ✗ DB insert error for ${platform.platform_name}:`, insertErr)
            results.push({ article: article.slug, platform: platform.platform_name, status: 'db_error', error: insertErr.message })
          } else {
            console.log(`  ✓ Scheduled on ${platform.platform_name} for ${scheduledIso}`)
            results.push({ article: article.slug, platform: platform.platform_name, status: 'scheduled' })
          }
        } catch (err: any) {
          console.error(`  ✗ Error posting to ${platform.platform_name}:`, err)

          // Record failure using try/catch instead of .catch()
          try {
            await supabase.from('social_posts').insert({
              article_id: article.id,
              article_slug: article.slug,
              platform: platform.platform_name,
              status: 'failed',
              error_message: err.message || 'Unknown error',
            })
          } catch (failInsertErr: any) {
            console.error('Failed to log error:', failInsertErr.message)
          }

          results.push({ article: article.slug, platform: platform.platform_name, status: 'failed', error: err.message })
        }
      }
    }

    const scheduled = results.filter((r) => r.status === 'scheduled').length
    const failed = results.filter((r) => r.status === 'failed' || r.status === 'db_error').length
    const skipped = results.filter((r) => r.status === 'skipped').length

    console.log(`\n=== Done: ${scheduled} scheduled, ${failed} failed, ${skipped} skipped ===`)

    return new Response(
      JSON.stringify({
        success: true,
        scheduled,
        failed,
        totalProcessed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Fatal error in publish-to-social:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin, getUserFromAuth } from '../_shared/requireAdmin.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapedEvent {
  title: string
  location: string
  city: string
  country: string
  region: string
  start_date: string
  end_date?: string
  description?: string
  website_url?: string
  event_type: string
  venue?: string
  organizer?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting AI events scraping task...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')
    const user = await getUserFromAuth(supabase, authHeader)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await requireAdmin(supabase, user.id)

    const scrapedEvents: ScrapedEvent[] = []

    // Scrape online.marketing AI events
    try {
      console.log('Scraping online.marketing...')
      const response = await fetch('https://online.marketing/artificial-intelligence/')
      const html = await response.text()
      
      const eventMatches = html.matchAll(/<article[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>[\s\S]*?<time[^>]*datetime="([^"]*)"[\s\S]*?<a[^>]*href="([^"]*)"[\s\S]*?<\/article>/gi)
      
      for (const match of eventMatches) {
        const title = match[1].replace(/<[^>]*>/g, '').trim()
        const date = match[2]
        const url = match[3]
        
        if (title && date) {
          scrapedEvents.push({
            title,
            location: 'Online/TBD',
            city: 'Various',
            country: 'Global',
            region: 'Global',
            start_date: new Date(date).toISOString(),
            website_url: url,
            event_type: 'conference',
            description: 'AI and Marketing event'
          })
        }
      }
      console.log(`Found events from online.marketing`)
    } catch (error) {
      console.error('Error scraping online.marketing:', error)
    }

    // Scrape ainewshub.org events
    try {
      console.log('Scraping ainewshub.org...')
      const response = await fetch('https://www.ainewshub.org/global-ai-events')
      const html = await response.text()
      
      const eventMatches = html.matchAll(/<div[^>]*class="[^"]*event[^"]*"[^>]*>[\s\S]*?<h[23][^>]*>(.*?)<\/h[23]>[\s\S]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\w+\s+\d{1,2},?\s+\d{4})[\s\S]*?<a[^>]*href="([^"]*)"[\s\S]*?<\/div>/gi)
      
      for (const match of eventMatches) {
        const title = match[1].replace(/<[^>]*>/g, '').trim()
        const dateStr = match[2]
        const url = match[3]
        
        if (title && dateStr) {
          scrapedEvents.push({
            title,
            location: 'Various',
            city: 'Various',
            country: 'Global',
            region: 'Global',
            start_date: new Date(dateStr).toISOString(),
            website_url: url.startsWith('http') ? url : `https://www.ainewshub.org${url}`,
            event_type: 'conference'
          })
        }
      }
      console.log(`Found events from ainewshub.org`)
    } catch (error) {
      console.error('Error scraping ainewshub.org:', error)
    }

    // Scrape timesofai.com events
    try {
      console.log('Scraping timesofai.com...')
      const response = await fetch('https://www.timesofai.com/events/')
      const html = await response.text()
      
      const eventMatches = html.matchAll(/<article[^>]*>[\s\S]*?<h[23][^>]*>(.*?)<\/h[23]>[\s\S]*?<time[^>]*datetime="([^"]*)"[\s\S]*?href="([^"]*)"[\s\S]*?<\/article>/gi)
      
      for (const match of eventMatches) {
        const title = match[1].replace(/<[^>]*>/g, '').trim()
        const date = match[2]
        const url = match[3]
        
        if (title && date) {
          scrapedEvents.push({
            title,
            location: 'Various',
            city: 'Various',
            country: 'Global',
            region: 'Global',
            start_date: new Date(date).toISOString(),
            website_url: url.startsWith('http') ? url : `https://www.timesofai.com${url}`,
            event_type: 'conference'
          })
        }
      }
      console.log(`Found events from timesofai.com`)
    } catch (error) {
      console.error('Error scraping timesofai.com:', error)
    }

    // Scrape Luma Singapore events
    try {
      console.log('Scraping Luma Singapore...')
      const response = await fetch('https://lu.ma/sg-ai')
      const html = await response.text()
      
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gi)
      
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1])
          if (data['@type'] === 'Event') {
            scrapedEvents.push({
              title: data.name,
              location: data.location?.name || 'Singapore',
              city: 'Singapore',
              country: 'Singapore',
              region: 'APAC',
              start_date: new Date(data.startDate).toISOString(),
              end_date: data.endDate ? new Date(data.endDate).toISOString() : undefined,
              description: data.description,
              website_url: data.url,
              event_type: 'meetup',
              venue: data.location?.name
            })
          }
        } catch (parseError) {
          console.error('Error parsing JSON-LD:', parseError)
        }
      }
      console.log(`Found events from Luma Singapore`)
    } catch (error) {
      console.error('Error scraping Luma:', error)
    }

    console.log(`Total scraped events: ${scrapedEvents.length}`)

    // Insert new events into database
    let insertedCount = 0
    let skippedCount = 0

    for (const event of scrapedEvents) {
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('title', event.title)
        .eq('start_date', event.start_date)
        .single()

      if (!existing) {
        const slug = event.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')

        const { error } = await supabase
          .from('events')
          .insert({
            ...event,
            slug,
            status: 'upcoming'
          })

        if (error) {
          console.error('Error inserting event:', event.title, error)
        } else {
          insertedCount++
          console.log('Inserted event:', event.title)
        }
      } else {
        skippedCount++
      }
    }

    const result = {
      success: true,
      results: {
        inserted: insertedCount,
        skipped: skippedCount
      },
      message: `Scraping completed. Inserted: ${insertedCount}, Skipped (duplicates): ${skippedCount}, Total scraped: ${scrapedEvents.length}`
    }

    console.log(result.message)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in scrape-ai-events function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

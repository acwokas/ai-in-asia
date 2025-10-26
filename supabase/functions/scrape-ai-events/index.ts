import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapedEvent {
  title: string
  description?: string
  start_date: string
  end_date?: string
  location: string
  city: string
  country: string
  region: string
  venue?: string
  event_type: string
  website_url?: string
  registration_url?: string
  image_url?: string
  organizer?: string
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

function mapLocationToRegion(country: string): string {
  const regionMap: Record<string, string> = {
    'Singapore': 'APAC',
    'China': 'APAC',
    'India': 'APAC',
    'Japan': 'APAC',
    'Australia': 'APAC',
    'USA': 'North America',
    'Canada': 'North America',
    'UK': 'Europe',
    'Germany': 'Europe',
    'France': 'Europe',
    'UAE': 'Middle East & Africa',
    'Brazil': 'Latin America',
  }
  return regionMap[country] || 'Global'
}

async function scrapeOnlineMarketing(): Promise<ScrapedEvent[]> {
  console.log('Scraping online.marketing/artificial-intelligence...')
  try {
    const response = await fetch('https://online.marketing/artificial-intelligence/')
    const html = await response.text()
    
    const events: ScrapedEvent[] = []
    
    // Regex to find <article> tags with event data
    const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi
    const articles = html.match(articleRegex) || []
    
    for (const article of articles) {
      try {
        // Extract title from <h2>
        const titleMatch = article.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
        
        // Extract date from <time>
        const timeMatch = article.match(/<time[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/i)
        const dateStr = timeMatch ? timeMatch[1] : null
        
        // Extract link
        const linkMatch = article.match(/<a[^>]*href="([^"]+)"[^>]*>/i)
        const link = linkMatch ? linkMatch[1] : null
        
        // Extract location if available
        const locationMatch = article.match(/location[^>]*>([\s\S]*?)<\/[^>]+>/i)
        const locationText = locationMatch ? locationMatch[1].replace(/<[^>]+>/g, '').trim() : 'Online'
        
        if (title && dateStr) {
          const [city, country] = locationText.split(',').map(s => s.trim())
          events.push({
            title,
            start_date: new Date(dateStr).toISOString(),
            location: locationText,
            city: city || 'Online',
            country: country || 'Global',
            region: mapLocationToRegion(country || 'Global'),
            event_type: 'conference',
            website_url: link?.startsWith('http') ? link : `https://online.marketing${link}`,
          })
        }
      } catch (e) {
        console.error('Error parsing article:', e)
      }
    }
    
    console.log(`online.marketing: Found ${events.length} events`)
    return events
  } catch (error) {
    console.error('Error scraping online.marketing:', error)
    return []
  }
}

async function scrapeAINewsHub(): Promise<ScrapedEvent[]> {
  console.log('Scraping ainewshub.org/global-ai-events...')
  try {
    const response = await fetch('https://www.ainewshub.org/global-ai-events')
    const html = await response.text()
    
    const events: ScrapedEvent[] = []
    
    // Regex to find event divs with h2/h3 titles and date strings
    const eventDivRegex = /<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    const eventDivs = html.match(eventDivRegex) || []
    
    for (const eventDiv of eventDivs) {
      try {
        // Extract title from h2 or h3
        const titleMatch = eventDiv.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
        
        // Extract date string (look for common date patterns)
        const dateMatch = eventDiv.match(/(\d{1,2}[\s\-\/]\w+[\s\-\/]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i)
        const dateStr = dateMatch ? dateMatch[1] : null
        
        // Extract location
        const locationMatch = eventDiv.match(/location[^>]*>([\s\S]*?)<\/[^>]+>|<span[^>]*>([\s\S]*?(?:Singapore|USA|UK|China|India|Australia)[^<]*)<\/span>/i)
        const locationText = locationMatch ? (locationMatch[1] || locationMatch[2]).replace(/<[^>]+>/g, '').trim() : 'Online'
        
        // Extract link
        const linkMatch = eventDiv.match(/<a[^>]*href="([^"]+)"[^>]*>/i)
        const link = linkMatch ? linkMatch[1] : null
        
        if (title && dateStr) {
          const [city, country] = locationText.split(',').map(s => s.trim())
          events.push({
            title,
            start_date: new Date(dateStr).toISOString(),
            location: locationText,
            city: city || 'Online',
            country: country || 'Global',
            region: mapLocationToRegion(country || 'Global'),
            event_type: 'conference',
            website_url: link?.startsWith('http') ? link : link ? `https://www.ainewshub.org${link}` : undefined,
          })
        }
      } catch (e) {
        console.error('Error parsing event div:', e)
      }
    }
    
    console.log(`ainewshub.org: Found ${events.length} events`)
    return events
  } catch (error) {
    console.error('Error scraping ainewshub.org:', error)
    return []
  }
}

async function scrapeTimesOfAI(): Promise<ScrapedEvent[]> {
  console.log('Scraping timesofai.com/events...')
  try {
    const response = await fetch('https://www.timesofai.com/events/')
    const html = await response.text()
    
    const events: ScrapedEvent[] = []
    
    // Regex to find <article> tags with h2/h3 titles and time datetime attributes
    const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi
    const articles = html.match(articleRegex) || []
    
    for (const article of articles) {
      try {
        // Extract title from h2 or h3
        const titleMatch = article.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null
        
        // Extract datetime from <time> tag
        const timeMatch = article.match(/<time[^>]*datetime="([^"]+)"[^>]*>/i)
        const dateStr = timeMatch ? timeMatch[1] : null
        
        // Extract location
        const locationMatch = article.match(/venue[^>]*>([\s\S]*?)<\/[^>]+>|location[^>]*>([\s\S]*?)<\/[^>]+>/i)
        const locationText = locationMatch ? (locationMatch[1] || locationMatch[2]).replace(/<[^>]+>/g, '').trim() : 'Online'
        
        // Extract link
        const linkMatch = article.match(/<a[^>]*href="([^"]+)"[^>]*>/i)
        const link = linkMatch ? linkMatch[1] : null
        
        if (title && dateStr) {
          const [city, country] = locationText.split(',').map(s => s.trim())
          events.push({
            title,
            start_date: new Date(dateStr).toISOString(),
            location: locationText,
            city: city || 'Online',
            country: country || 'Global',
            region: mapLocationToRegion(country || 'Global'),
            event_type: 'conference',
            website_url: link?.startsWith('http') ? link : link ? `https://www.timesofai.com${link}` : undefined,
          })
        }
      } catch (e) {
        console.error('Error parsing article:', e)
      }
    }
    
    console.log(`timesofai.com: Found ${events.length} events`)
    return events
  } catch (error) {
    console.error('Error scraping timesofai.com:', error)
    return []
  }
}

async function scrapeLumaSingapore(): Promise<ScrapedEvent[]> {
  console.log('Scraping lu.ma/sg-ai...')
  try {
    const response = await fetch('https://lu.ma/sg-ai')
    const html = await response.text()
    
    const events: ScrapedEvent[] = []
    
    // Extract JSON-LD structured data from <script type="application/ld+json"> tags
    const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    const scripts = html.match(jsonLdRegex) || []
    
    for (const script of scripts) {
      try {
        const jsonMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/)
        if (!jsonMatch) continue
        
        const data = JSON.parse(jsonMatch[1])
        
        // Handle both single event and array of events
        const eventData = Array.isArray(data) ? data : [data]
        
        for (const event of eventData) {
          if (event['@type'] === 'Event') {
            events.push({
              title: event.name,
              description: event.description,
              start_date: event.startDate,
              end_date: event.endDate,
              location: 'Singapore',
              city: 'Singapore',
              country: 'Singapore',
              region: 'APAC',
              venue: event.location?.name,
              event_type: 'meetup',
              website_url: event.url,
              registration_url: event.offers?.url,
              image_url: event.image,
              organizer: event.organizer?.name,
            })
          }
        }
      } catch (e) {
        console.error('Error parsing Luma JSON-LD:', e)
      }
    }
    
    console.log(`lu.ma/sg-ai: Found ${events.length} events`)
    return events
  } catch (error) {
    console.error('Error scraping lu.ma/sg-ai:', error)
    return []
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roles || roles.role !== 'admin') {
      throw new Error('Admin access required')
    }

    console.log('Starting event scraping...')

    // Scrape all sources in parallel
    const [onlineMarketing, aiNewsHub, timesOfAI, luma] = await Promise.all([
      scrapeOnlineMarketing(),
      scrapeAINewsHub(),
      scrapeTimesOfAI(),
      scrapeLumaSingapore(),
    ])

    console.log('Scraping results:')
    console.log(`- online.marketing: ${onlineMarketing.length} events`)
    console.log(`- ainewshub.org: ${aiNewsHub.length} events`)
    console.log(`- timesofai.com: ${timesOfAI.length} events`)
    console.log(`- lu.ma/singapore: ${luma.length} events`)

    const allEvents = [...onlineMarketing, ...aiNewsHub, ...timesOfAI, ...luma]
    console.log(`Scraped ${allEvents.length} events total`)
    
    // If no events found, provide debugging info
    if (allEvents.length === 0) {
      console.log('WARNING: No events found from any source. This could mean:')
      console.log('1. The websites have changed their HTML structure')
      console.log('2. The websites are blocking automated access')
      console.log('3. The websites require JavaScript to load content')
    }

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (const event of allEvents) {
      try {
        const slug = generateSlug(event.title)
        
        // Check for duplicates
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('title', event.title)
          .eq('start_date', event.start_date)
          .single()

        if (existing) {
          skipped++
          continue
        }

        // Insert new event
        const { error: insertError } = await supabase
          .from('events')
          .insert({
            ...event,
            slug,
            status: 'upcoming',
            created_by: user.id,
          })

        if (insertError) {
          errors.push(`Error inserting "${event.title}": ${insertError.message}`)
        } else {
          inserted++
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error processing "${event.title}": ${message}`)
      }
    }

    console.log(`Scraping complete: ${inserted} inserted, ${skipped} skipped`)

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          total_scraped: allEvents.length,
          inserted,
          skipped,
          errors: errors.length > 0 ? errors : undefined,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Scraping error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

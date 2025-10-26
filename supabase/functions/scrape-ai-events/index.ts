import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts'

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
  console.log('Scraping online.marketing...')
  try {
    const response = await fetch('https://online.marketing/ai-events')
    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    const events: ScrapedEvent[] = []
    
    // Look for event cards or JSON-LD structured data
    const scripts = doc?.querySelectorAll('script[type="application/ld+json"]')
    scripts?.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || '{}')
        if (data['@type'] === 'Event') {
          events.push({
            title: data.name,
            description: data.description,
            start_date: data.startDate,
            end_date: data.endDate,
            location: data.location?.address?.addressLocality || 'Unknown',
            city: data.location?.address?.addressLocality || 'Unknown',
            country: data.location?.address?.addressCountry || 'Unknown',
            region: mapLocationToRegion(data.location?.address?.addressCountry || 'Unknown'),
            venue: data.location?.name,
            event_type: 'conference',
            website_url: data.url,
            image_url: data.image,
            organizer: data.organizer?.name,
          })
        }
      } catch (e) {
        console.error('Error parsing JSON-LD:', e)
      }
    })
    
    return events
  } catch (error) {
    console.error('Error scraping online.marketing:', error)
    return []
  }
}

async function scrapeAINewsHub(): Promise<ScrapedEvent[]> {
  console.log('Scraping ainewshub.org...')
  try {
    const response = await fetch('https://ainewshub.org/events')
    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    const events: ScrapedEvent[] = []
    
    // Parse event listings
    const eventElements = doc?.querySelectorAll('.event-item, article, .event-card')
    eventElements?.forEach((element) => {
      try {
        const title = element.querySelector('h2, h3, .event-title')?.textContent?.trim()
        const dateText = element.querySelector('.event-date, time')?.textContent?.trim()
        const location = element.querySelector('.event-location, .location')?.textContent?.trim()
        const link = element.querySelector('a')?.getAttribute('href')
        
        if (title && dateText && location) {
          const [city, country] = location.split(',').map(s => s.trim())
          events.push({
            title,
            start_date: new Date(dateText).toISOString(),
            location,
            city: city || 'Unknown',
            country: country || 'Unknown',
            region: mapLocationToRegion(country || 'Unknown'),
            event_type: 'conference',
            website_url: link ? `https://ainewshub.org${link}` : undefined,
          })
        }
      } catch (e) {
        console.error('Error parsing event element:', e)
      }
    })
    
    return events
  } catch (error) {
    console.error('Error scraping ainewshub.org:', error)
    return []
  }
}

async function scrapeTimesOfAI(): Promise<ScrapedEvent[]> {
  console.log('Scraping timesofai.com...')
  try {
    const response = await fetch('https://timesofai.com/events')
    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    const events: ScrapedEvent[] = []
    
    // Parse calendar events
    const eventElements = doc?.querySelectorAll('.event, .calendar-event')
    eventElements?.forEach((element) => {
      try {
        const title = element.querySelector('.event-name, h3')?.textContent?.trim()
        const dateText = element.querySelector('.event-date')?.textContent?.trim()
        const location = element.querySelector('.event-venue')?.textContent?.trim()
        
        if (title && dateText) {
          const [city, country] = (location || '').split(',').map(s => s.trim())
          events.push({
            title,
            start_date: new Date(dateText).toISOString(),
            location: location || 'Online',
            city: city || 'Online',
            country: country || 'Global',
            region: mapLocationToRegion(country || 'Global'),
            event_type: 'conference',
          })
        }
      } catch (e) {
        console.error('Error parsing event:', e)
      }
    })
    
    return events
  } catch (error) {
    console.error('Error scraping timesofai.com:', error)
    return []
  }
}

async function scrapeLumaSingapore(): Promise<ScrapedEvent[]> {
  console.log('Scraping lu.ma/singapore...')
  try {
    const response = await fetch('https://lu.ma/singapore')
    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    const events: ScrapedEvent[] = []
    
    // Luma uses JSON-LD
    const scripts = doc?.querySelectorAll('script[type="application/ld+json"]')
    scripts?.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || '{}')
        if (data['@type'] === 'Event' || Array.isArray(data)) {
          const eventData = Array.isArray(data) ? data : [data]
          eventData.forEach((event: any) => {
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
          })
        }
      } catch (e) {
        console.error('Error parsing Luma JSON-LD:', e)
      }
    })
    
    return events
  } catch (error) {
    console.error('Error scraping lu.ma/singapore:', error)
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

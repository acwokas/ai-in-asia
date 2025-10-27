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

const SOURCES = [
  { url: 'https://online.marketing/artificial-intelligence/', name: 'online.marketing' },
  { url: 'https://www.ainewshub.org/global-ai-events', name: 'ainewshub.org' },
  { url: 'https://www.timesofai.com/events/', name: 'timesofai.com' },
  { url: 'https://lu.ma/sg-ai', name: 'luma' }
]

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

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    console.log('Starting AI-powered event scraping...')
    const allScrapedEvents: ScrapedEvent[] = []

    // Scrape each source using AI
    for (const source of SOURCES) {
      try {
        console.log(`Fetching ${source.name}...`)
        const response = await fetch(source.url)
        
        if (!response.ok) {
          console.error(`Failed to fetch ${source.name}: ${response.status}`)
          continue
        }

        const html = await response.text()
        console.log(`Extracting events from ${source.name} using AI...`)

        // Use AI to extract structured event data
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are an expert at extracting event data from HTML. Extract all AI-related events from the provided HTML.
For each event, extract:
- title (string, required)
- start_date (ISO 8601 format, required - if only month/year given, use first of month)
- end_date (ISO 8601 format, optional)
- location (string - city, country format if available, otherwise "Online" or "TBD")
- city (string - extract city name, or "Various" or "Online")
- country (string - extract country name, or "Global" or "Online")
- region (string - "APAC", "EMEA", "Americas", or "Global")
- description (string, optional - brief description if available)
- website_url (string, optional - full URL to event page or registration)
- event_type (string - "conference", "meetup", "workshop", "expo", "summit", or "webinar")
- venue (string, optional - specific venue name)
- organizer (string, optional - organizing company/entity)

Return ONLY valid JSON array of events. Skip past events. Be thorough and extract all events you can find.`
              },
              {
                role: 'user',
                content: `Extract all AI events from this HTML (source: ${source.name}):\n\n${html.slice(0, 50000)}`
              }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'extract_events',
                description: 'Extract structured event data',
                parameters: {
                  type: 'object',
                  properties: {
                    events: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          start_date: { type: 'string' },
                          end_date: { type: 'string' },
                          location: { type: 'string' },
                          city: { type: 'string' },
                          country: { type: 'string' },
                          region: { type: 'string' },
                          description: { type: 'string' },
                          website_url: { type: 'string' },
                          event_type: { type: 'string' },
                          venue: { type: 'string' },
                          organizer: { type: 'string' }
                        },
                        required: ['title', 'start_date', 'location', 'city', 'country', 'region', 'event_type']
                      }
                    }
                  },
                  required: ['events']
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'extract_events' } }
          })
        })

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text()
          console.error(`AI extraction failed for ${source.name}:`, aiResponse.status, errorText)
          continue
        }

        const aiResult = await aiResponse.json()
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0]
        
        if (toolCall?.function?.arguments) {
          const extracted = JSON.parse(toolCall.function.arguments)
          const events = extracted.events || []
          console.log(`Extracted ${events.length} events from ${source.name}`)
          allScrapedEvents.push(...events)
        }
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error)
      }
    }

    console.log(`Total extracted events: ${allScrapedEvents.length}`)

    // Deduplicate events based on title + start_date
    const deduped = new Map<string, ScrapedEvent>()
    for (const event of allScrapedEvents) {
      const key = `${event.title.toLowerCase().trim()}_${event.start_date.split('T')[0]}`
      if (!deduped.has(key)) {
        deduped.set(key, event)
      }
    }

    const uniqueEvents = Array.from(deduped.values())
    console.log(`After deduplication: ${uniqueEvents.length} unique events`)

    // Insert new events into database
    let insertedCount = 0
    let skippedCount = 0
    let updatedCount = 0

    for (const event of uniqueEvents) {
      try {
        // Check if event already exists (by title + start_date)
        const { data: existing } = await supabase
          .from('events')
          .select('id, website_url')
          .eq('title', event.title)
          .eq('start_date', event.start_date)
          .maybeSingle()

        const slug = event.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')

        if (!existing) {
          // Insert new event
          const { error } = await supabase
            .from('events')
            .insert({
              ...event,
              slug,
              status: 'upcoming'
            })

          if (error) {
            console.error('Error inserting event:', event.title, error.message)
          } else {
            insertedCount++
            console.log('✓ Inserted:', event.title)
          }
        } else if (event.website_url && existing.website_url !== event.website_url) {
          // Update existing event if we have new information
          const { error } = await supabase
            .from('events')
            .update({
              website_url: event.website_url,
              description: event.description || undefined,
              venue: event.venue || undefined,
              organizer: event.organizer || undefined
            })
            .eq('id', existing.id)

          if (error) {
            console.error('Error updating event:', event.title, error.message)
          } else {
            updatedCount++
            console.log('↻ Updated:', event.title)
          }
        } else {
          skippedCount++
        }
      } catch (error) {
        console.error('Error processing event:', event.title, error)
      }
    }

    const result = {
      success: true,
      results: {
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedCount,
        total_extracted: allScrapedEvents.length,
        unique_events: uniqueEvents.length
      },
      message: `Scraping completed. Inserted: ${insertedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount} (Total extracted: ${allScrapedEvents.length}, Unique: ${uniqueEvents.length})`
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

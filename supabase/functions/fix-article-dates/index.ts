import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parse } from 'https://deno.land/std@0.224.0/csv/parse.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    })

    if (!isAdmin) {
      throw new Error('Admin access required')
    }

    console.log('Reading CSV data from request...')
    
    const { csvData } = await req.json()
    
    if (!csvData) {
      throw new Error('No CSV data provided in request')
    }
    
    const csvText = csvData
    
    console.log('Parsing CSV with proper parser...')
    
    const records = parse(csvText, {
      skipFirstRow: true,
      columns: ['title', 'slug', 'old_slug', 'content', 'excerpt', 'author', 'categories', 'tags', 'meta_title', 'meta_description', 'featured_image_url', 'featured_image_alt', 'published_at', 'article_type']
    })
    
    console.log(`Total records in CSV: ${records.length}`)
    
    let updated = 0
    let skipped = 0
    const errors: string[] = []
    
    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      
      try {
        const slug = record.slug?.trim()
        const publishedAt = record.published_at?.trim()
        
        if (!slug || !publishedAt) {
          skipped++
          continue
        }
        
        // Try to parse the date
        const parsedDate = new Date(publishedAt)
        if (isNaN(parsedDate.getTime())) {
          errors.push(`Invalid date for slug "${slug}": ${publishedAt}`)
          skipped++
          continue
        }
        
        // Update the article  
        const { data, error } = await supabase
          .from('articles')
          .update({ published_at: parsedDate.toISOString() })
          .eq('slug', slug)
          .eq('status', 'published')
          .select('id')
        
        if (error) {
          errors.push(`Error updating "${slug}": ${error.message}`)
          skipped++
        } else if (!data || data.length === 0) {
          // No article found with this slug
          if (updated < 5) {
            console.log(`No match found for slug: "${slug}"`)
          }
          skipped++
        } else {
          updated++
          if (updated % 50 === 0) {
            console.log(`Progress: ${updated} articles updated`)
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error processing line ${i}: ${message}`)
        skipped++
      }
    }
    
    console.log(`Date fixing complete: ${updated} updated, ${skipped} skipped`)
    
    return new Response(
      JSON.stringify({
        success: true,
        results: {
          updated,
          skipped,
          errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
          total_errors: errors.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Date fixing error:', error)
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

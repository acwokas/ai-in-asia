import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    console.log('Fetching CSV file...')
    
    // Fetch the CSV file
    const csvResponse = await fetch('https://207800f6-04ea-4303-a3ba-b1b386c6515d.lovableproject.com/import-data/ai-in-asia-export2-updated.csv')
    const csvText = await csvResponse.text()
    
    console.log('Parsing CSV...')
    const lines = csvText.split('\n')
    const headers = lines[0].split(',')
    
    // Find the indices of slug and published_at columns
    const slugIndex = headers.findIndex(h => h.trim() === 'slug')
    const publishedAtIndex = headers.findIndex(h => h.trim() === 'published_at')
    
    console.log(`Found slug at index ${slugIndex}, published_at at index ${publishedAtIndex}`)
    
    let updated = 0
    let skipped = 0
    const errors: string[] = []
    
    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue
      
      try {
        // Parse CSV line (basic parsing, may need improvement for complex cases)
        const values: string[] = []
        let currentValue = ''
        let insideQuotes = false
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          
          if (char === '"') {
            insideQuotes = !insideQuotes
          } else if (char === ',' && !insideQuotes) {
            values.push(currentValue)
            currentValue = ''
          } else {
            currentValue += char
          }
        }
        values.push(currentValue) // Add the last value
        
        if (values.length < Math.max(slugIndex, publishedAtIndex) + 1) {
          skipped++
          continue
        }
        
        const slug = values[slugIndex]?.trim()
        const publishedAt = values[publishedAtIndex]?.trim()
        
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
        const { error } = await supabase
          .from('articles')
          .update({ published_at: parsedDate.toISOString() })
          .eq('slug', slug)
          .eq('status', 'published')
        
        if (error) {
          errors.push(`Error updating "${slug}": ${error.message}`)
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

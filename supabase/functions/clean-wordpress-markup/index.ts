import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentBlock {
  type: string;
  content?: any;
  attrs?: any;
}

function cleanWordPressMarkup(content: ContentBlock[]): ContentBlock[] {
  return content.map(block => {
    if (block.type === 'paragraph' && typeof block.content === 'string') {
      let cleaned = block.content;
      
      // Remove WordPress HTML comments
      cleaned = cleaned.replace(/<!--\s*wp:[^>]+-->/g, '');
      
      // Extract quote text from WordPress blockquote HTML
      const blockquoteMatch = cleaned.match(/<div class="uagb-blockquote__content">"?([^<]+)"?<\/div>/);
      if (blockquoteMatch && cleaned.includes('wp-block-uagb-blockquote')) {
        // This is a quote, convert to quote block
        return {
          type: 'quote',
          content: blockquoteMatch[1].trim()
        };
      }
      
      // Remove all HTML tags if they're WordPress-specific
      if (cleaned.includes('wp-block-') || cleaned.includes('uagb-')) {
        // Extract any text content before removing tags
        cleaned = cleaned
          .replace(/<div[^>]*uagb-blockquote__content[^>]*>"?([^<]+)"?<\/div>/g, '$1')
          .replace(/<[^>]+>/g, '') // Remove all HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // If nothing meaningful left, return null to filter out later
        if (!cleaned || cleaned.length < 5) {
          return { type: 'paragraph', content: '' };
        }
      }
      
      return { ...block, content: cleaned };
    }
    
    return block;
  }).filter(block => {
    // Filter out empty paragraphs
    if (block.type === 'paragraph' && (!block.content || block.content === '')) {
      return false;
    }
    return true;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    // Fetch all articles to check for WordPress markup
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, slug, content')
      .eq('status', 'published');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Checking ${articles?.length || 0} articles for WordPress markup`);
    
    // Filter articles that contain WordPress markup
    const articlesWithMarkup = articles?.filter(article => {
      const contentStr = JSON.stringify(article.content);
      return contentStr.includes('wp:uagb') || 
             contentStr.includes('wp-block-') || 
             contentStr.includes('classMigrate');
    }) || [];
    
    console.log(`Found ${articlesWithMarkup.length} articles with WordPress markup`);

    const results = {
      processed: 0,
      cleaned: 0,
      errors: [] as any[]
    };

    for (const article of articlesWithMarkup) {
      try {
        const content = typeof article.content === 'string' 
          ? JSON.parse(article.content) 
          : article.content;

        const cleanedContent = cleanWordPressMarkup(content);
        
        // Only update if content changed
        const contentStr = JSON.stringify(content);
        const cleanedStr = JSON.stringify(cleanedContent);
        
        if (contentStr !== cleanedStr) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ content: cleanedContent })
            .eq('id', article.id);

          if (updateError) {
            results.errors.push({
              id: article.id,
              slug: article.slug,
              error: updateError.message
            });
          } else {
            results.cleaned++;
          }
        }
        
        results.processed++;
      } catch (err) {
        console.error(`Error processing article ${article.id}:`, err);
        results.errors.push({
          id: article.id,
          slug: article.slug,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

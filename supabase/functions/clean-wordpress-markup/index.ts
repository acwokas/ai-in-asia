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

function cleanWordPressMarkup(content: ContentBlock[]): { cleaned: ContentBlock[], changed: boolean } {
  let hasChanges = false;
  const blocksToKeep: ContentBlock[] = [];
  
  for (const block of content) {
    if (typeof block.content === 'string') {
      let originalContent = block.content;
      let cleanedContent = originalContent;
      
      // Remove WordPress HTML comments (<!-- wp:... -->)
      cleanedContent = cleanedContent.replace(/<!--\s*wp:[^>]+-->/g, '');
      
      // Remove WordPress block wrapper divs and classes
      cleanedContent = cleanedContent.replace(/<div[^>]*class="[^"]*wp-block-[^"]*"[^>]*>/g, '');
      cleanedContent = cleanedContent.replace(/<div[^>]*class="[^"]*uagb-[^"]*"[^>]*>/g, '');
      cleanedContent = cleanedContent.replace(/<\/div>/g, '');
      
      // Remove classMigrate attributes
      cleanedContent = cleanedContent.replace(/classMigrate="[^"]*"/g, '');
      
      // Clean up excessive whitespace
      cleanedContent = cleanedContent.replace(/\s+/g, ' ').trim();
      
      // Remove empty HTML tags
      cleanedContent = cleanedContent.replace(/<([a-z]+)[^>]*>\s*<\/\1>/gi, '');
      
      if (cleanedContent !== originalContent) {
        hasChanges = true;
        
        // Skip if content is now empty or too short
        if (cleanedContent && cleanedContent.length >= 3) {
          blocksToKeep.push({ ...block, content: cleanedContent });
        }
      } else {
        blocksToKeep.push(block);
      }
    } else {
      blocksToKeep.push(block);
    }
  }
  
  return { cleaned: blocksToKeep, changed: hasChanges };
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

    // Fetch all published articles
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
      return contentStr.includes('wp:') || 
             contentStr.includes('wp-block-') || 
             contentStr.includes('uagb-') ||
             contentStr.includes('classMigrate');
    }) || [];
    
    console.log(`Found ${articlesWithMarkup.length} articles with WordPress markup`);

    const results = {
      processed: 0,
      cleaned: 0,
      skipped: 0,
      errors: [] as any[]
    };

    for (const article of articlesWithMarkup) {
      try {
        const content = typeof article.content === 'string' 
          ? JSON.parse(article.content) 
          : article.content;

        if (!Array.isArray(content)) {
          console.log(`Skipping ${article.slug}: content is not an array`);
          results.skipped++;
          continue;
        }

        const { cleaned, changed } = cleanWordPressMarkup(content);
        
        if (changed) {
          console.log(`Cleaning article: ${article.slug}`);
          
          const { error: updateError } = await supabase
            .from('articles')
            .update({ content: cleaned })
            .eq('id', article.id);

          if (updateError) {
            console.error(`Failed to update ${article.slug}:`, updateError);
            results.errors.push({
              id: article.id,
              slug: article.slug,
              error: updateError.message
            });
          } else {
            results.cleaned++;
          }
        } else {
          results.skipped++;
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

    console.log(`Results: processed=${results.processed}, cleaned=${results.cleaned}, skipped=${results.skipped}, errors=${results.errors.length}`);

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

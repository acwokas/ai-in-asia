import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample tools based on what's available in Asia
const SAMPLE_TOOLS = [
  {
    name: "Vertex AI",
    description: "Google's comprehensive suite of AI tools for creating, training, and deploying machine learning models. Covering everything from data preparation to model assessment and implementation.",
    url: "https://cloud.google.com/vertex-ai",
    category: "Machine Learning Platform",
  },
  {
    name: "JetBrains Junie",
    description: "An innovative AI coding assistant that works inside JetBrains IDEs to streamline programming efforts and boost efficiency through automated code writing and testing.",
    url: "https://www.jetbrains.com/junie/",
    category: "Developer Tools",
  },
  {
    name: "Google AI Studio",
    description: "A platform for prototyping and experimenting with Google's Gemini AI models through an intuitive interface.",
    url: "https://aistudio.google.com/",
    category: "AI Development",
  },
  {
    name: "Alibaba Cloud Machine Learning",
    description: "Comprehensive machine learning platform from Alibaba Cloud offering end-to-end AI solutions for businesses across Asia.",
    url: "https://www.alibabacloud.com/product/machine-learning",
    category: "Machine Learning Platform",
  },
  {
    name: "Baidu AI",
    description: "China's leading AI platform offering speech recognition, natural language processing, computer vision, and deep learning capabilities.",
    url: "https://ai.baidu.com/",
    category: "AI Platform",
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    const user = await getUserFromAuth(supabase, authHeader);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    await requireAdmin(supabase, user.id);

    console.log('Seeding sample AI tools...');
    
    let insertedCount = 0;
    let skippedCount = 0;

    for (const tool of SAMPLE_TOOLS) {
      try {
        // Check if tool exists
        const { data: existing } = await supabase
          .from('ai_tools')
          .select('id')
          .eq('name', tool.name)
          .maybeSingle();

        if (existing) {
          console.log(`Tool already exists: ${tool.name}`);
          skippedCount++;
          continue;
        }

        // Insert new tool
        const { error: insertError } = await supabase
          .from('ai_tools')
          .insert({
            ...tool,
            source_urls: ['seed']
          });

        if (insertError) {
          console.error(`Error inserting tool ${tool.name}:`, insertError);
          skippedCount++;
        } else {
          console.log(`Inserted tool: ${tool.name}`);
          insertedCount++;
        }
      } catch (error) {
        console.error(`Error processing tool ${tool.name}:`, error);
        skippedCount++;
      }
    }

    console.log(`Seeding complete. Inserted: ${insertedCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sample tools seeded',
        stats: {
          inserted: insertedCount,
          skipped: skippedCount,
          total: SAMPLE_TOOLS.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in seed-sample-tools function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
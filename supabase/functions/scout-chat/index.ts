import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const requestSchema = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(10000)
      })).min(1).max(50)
    });

    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = validationResult.data;
    const authHeader = req.headers.get('Authorization');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Get user session
    const { data: { user } } = await supabase.auth.getUser();
    
    // Query limit logic
    let queryLimit = 3; // Default for non-logged in users
    
    if (user) {
      // Get user stats to determine level
      const { data: stats } = await supabase
        .from('user_stats')
        .select('points, level')
        .eq('user_id', user.id)
        .single();
      
      if (stats) {
        const points = stats.points || 0;
        if (points >= 1000) {
          queryLimit = 999999; // Unlimited for Thought Leaders
        } else if (points >= 500) {
          queryLimit = 50; // Expert
        } else if (points >= 100) {
          queryLimit = 25; // Enthusiast
        } else {
          queryLimit = 10; // Explorer
        }
      }
    }

    // Check today's query count
    const today = new Date().toISOString().split('T')[0];
    const { data: queryData } = await supabase
      .from('scout_queries')
      .select('query_count')
      .eq('query_date', today)
      .eq('user_id', user?.id || null)
      .maybeSingle();

    const currentCount = queryData?.query_count || 0;

    if (currentCount >= queryLimit) {
      return new Response(
        JSON.stringify({ 
          error: user 
            ? `Daily query limit reached (${queryLimit} queries). Read more articles to unlock more queries!`
            : 'Daily query limit reached (3 queries). Sign in for more queries!' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update query count
    if (queryData) {
      await supabase
        .from('scout_queries')
        .update({ query_count: currentCount + 1 })
        .eq('query_date', today)
        .eq('user_id', user?.id || null);
    } else {
      await supabase
        .from('scout_queries')
        .insert({ 
          user_id: user?.id || null, 
          query_date: today, 
          query_count: 1 
        });
    }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are Scout, the AI assistant for AIinASIA.com, a leading platform for AI news and insights across Asia. 

Your role:
- Answer questions about AI developments, trends, and news in Asia
- Provide insights on AI technology, research, and applications
- Help users discover relevant articles and content
- Be knowledgeable about AI topics including machine learning, deep learning, LLMs, computer vision, and robotics
- Keep responses concise and informative
- Use British English
- When discussing specific articles or content, encourage users to explore the site

Guidelines:
- Be professional yet conversational
- Focus on Asia-Pacific AI developments when relevant
- Cite credible sources when discussing facts
- Admit when you don't know something
- When users ask about specific topics, companies, people, or events, use the search_articles tool to find relevant articles from our database
- Always call search_articles when a user query mentions searchable terms`;

    const tools = [
      {
        type: "function",
        function: {
          name: "search_articles",
          description: "Search for articles in the AIinASIA database by keywords. Use this when users ask about specific topics, companies, people, or events.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query (e.g., 'Rory Sutherland', 'Lenovo', 'OpenAI')"
              }
            },
            required: ["query"]
          }
        }
      }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires additional credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Error in scout-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

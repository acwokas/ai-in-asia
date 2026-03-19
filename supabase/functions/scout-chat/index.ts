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

  console.log('Scout chat request received');

  try {
    // Validate input
    const requestSchema = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(10000)
      })).min(1).max(50),
      context: z.object({
        title: z.string().optional(),
        category: z.string().optional(),
      }).optional(),
    });

    const body = await req.json();
    console.log('Request body received, messages count:', body.messages?.length);
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, context } = validationResult.data;
    const authHeader = req.headers.get('Authorization');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Try standard auth first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    let authenticatedUserId = user?.id;

    // If standard auth fails but we have a JWT, try to extract user from expired token
    if (!authenticatedUserId && authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.sub) {
            // Verify user exists using service role
            const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
            const { data: userData } = await adminClient.auth.admin.getUserById(payload.sub);
            if (userData?.user) {
              authenticatedUserId = userData.user.id;
              console.log('Recovered user from expired JWT:', authenticatedUserId);
            }
          }
        }
      } catch (e) {
        console.warn('JWT recovery failed:', e.message);
      }
    }

    if (!authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please sign in to use Scout.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Query limit logic based on user level
    let queryLimit = 10; // Default for authenticated users
    
    {
      // Get user stats to determine level
      const { data: stats } = await supabase
        .from('user_stats')
        .select('points, level')
        .eq('user_id', authenticatedUserId)
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
      .eq('user_id', authenticatedUserId)
      .maybeSingle();

    const currentCount = queryData?.query_count || 0;

    if (currentCount >= queryLimit) {
      return new Response(
        JSON.stringify({ 
          error: `Daily query limit reached (${queryLimit} queries). Read more articles to unlock more queries!`
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
        .eq('user_id', authenticatedUserId);
    } else {
      await supabase
        .from('scout_queries')
        .insert({ 
          user_id: authenticatedUserId, 
          query_date: today, 
          query_count: 1 
        });
    }
    console.log('Query count updated, proceeding to AI gateway');
    
    // Get contextual article suggestions based on conversation
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const { data: articles } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, primary_category_id, categories:primary_category_id(slug)')
      .eq('status', 'published')
      .textSearch('title', lastUserMessage.split(' ').slice(0, 5).join(' | '), {
        type: 'websearch',
        config: 'english'
      })
      .limit(3);
    
    const suggestedArticles = articles?.map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt || '',
      category_slug: (a.categories as any)?.slug || 'news'
    })) || [];
    
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const todayFormatted = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const systemPrompt = `You are Scout, the AI assistant for AIinASIA.com — the leading independent publication covering artificial intelligence across Asia-Pacific.

Today's date is ${todayFormatted}. Use this when answering questions about recent events, what's happening this week, or anything time-sensitive. Do not speculate about events after this date.

AIinASIA covers: AI policy and regulation across Southeast Asia, China, Japan, South Korea, India and Australia; enterprise AI adoption; AI in healthcare, finance, education and media; LLMs, generative AI, computer vision and robotics; startup funding and M&A; government initiatives and national AI strategies.

Your personality:
- Knowledgeable but not academic — you explain things clearly without being condescending
- Direct and opinionated where the facts support it
- Genuinely interested in Asia-Pacific AI developments, not just repackaging Western tech news
- British English throughout (colour not color, organise not organize, etc.)

Response format:
- Keep responses concise — this is a chat widget, not a report. Aim for 3–5 sentences for most answers.
- Use short paragraphs. Never use bullet points unless listing 4+ discrete items.
- When you reference an article from search results, always include the full URL formatted as: https://aiinasia.com/[category]/[slug]
- Never fabricate article titles, URLs, or statistics. If you don't know, say so.

Tool use guidance:
- Call search_articles whenever the user asks about a specific company, person, country, technology, policy, event, or named topic.
- Do NOT call search_articles for general knowledge questions (e.g. "what is a large language model", "explain reinforcement learning").
- After searching, synthesise the results into a direct answer — don't just list article titles.
- If search returns no results, say so honestly and answer from your own knowledge if you can.

Boundaries:
- You only discuss AI and adjacent technology topics. If asked about unrelated subjects, politely redirect.
- Do not give financial, legal, or medical advice.
- If asked who built you or what model you are, say you are Scout, AIinASIA's AI assistant, and leave it at that.${context?.title ? `

CURRENT ARTICLE CONTEXT:
The user is currently reading: "${context.title}"${context.category ? ` (category: ${context.category})` : ''}.
If their question could relate to this article, answer with that context in mind. If they ask to explain or summarise the article, do so based on your knowledge — and search for it by title if needed.` : ''}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "search_articles",
          description: "Search for articles, events, and AI tools in the AIinASIA database by keywords. Use this when users ask about specific topics, companies, people, events, or tools.",
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

    console.log('Calling AI gateway with', messages.length, 'messages');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        tools: [
          {
            name: 'search_articles',
            description: 'Search for articles, events, and AI tools in the AIinASIA database by keywords. Use this when users ask about specific topics, companies, people, events, or tools.',
            input_schema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query (e.g., "Rory Sutherland", "Lenovo", "OpenAI")'
                }
              },
              required: ['query']
            }
          }
        ],
      }),
    });

    console.log('AI gateway response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires additional credits. Please check your Google AI API quota.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiResponse = await response.json();
    console.log('AI response:', JSON.stringify(aiResponse));
    
    // Check if AI wants to call a tool
    const message = aiResponse.content;
    const toolUseBlock = message?.find((b: any) => b.type === 'tool_use');
    if (toolUseBlock) {
      const toolCall = toolUseBlock;
      console.log('Tool call detected:', toolCall.name);
      
      if (toolCall.name === 'search_articles') {
        const args = toolCall.input;
        // Sanitize query for use in ilike patterns
        const sanitizedQuery = args.query.replace(/[%_\\]/g, '\\$&').slice(0, 200);
        console.log('Searching for:', sanitizedQuery);
        
        // First search by title and excerpt
        const { data: titleExcerptResults } = await supabase
          .from('articles')
          .select('id, title, slug, excerpt, content')
          .eq('status', 'published')
          .or(`title.ilike.%${sanitizedQuery}%,excerpt.ilike.%${sanitizedQuery}%`)
          .limit(5);
        
        // Then get ALL published articles to search content (no limit)
        const { data: allArticles } = await supabase
          .from('articles')
          .select('id, title, slug, excerpt, content')
          .eq('status', 'published');
        
        // Filter articles by searching through content text
        const contentMatches = allArticles?.filter(article => {
          if (!article.content || !Array.isArray(article.content)) return false;
          
          const contentText = article.content
            .map((block: any) => {
              if (block.type === 'paragraph' && block.content && Array.isArray(block.content)) {
                return block.content
                  .filter((item: any) => item.type === 'text')
                  .map((item: any) => item.text)
                  .join('');
              }
              return '';
            })
            .join(' ')
            .toLowerCase();
          
          return contentText.includes(sanitizedQuery.toLowerCase());
        }) || [];
        
        // Combine and deduplicate results
        const articleIds = new Set(titleExcerptResults?.map(a => a.id) || []);
        const uniqueContentMatches = contentMatches.filter(a => !articleIds.has(a.id));
        const articles = [...(titleExcerptResults || []), ...uniqueContentMatches].slice(0, 10);
        
        // Search events
        const { data: events } = await supabase
          .from('events')
          .select('id, title, slug, description, start_date, location')
          .or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%,location.ilike.%${sanitizedQuery}%`)
          .limit(5);
        
        // Search AI tools
        const { data: tools } = await supabase
          .from('ai_tools')
          .select('id, name, description, url, category')
          .or(`name.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%,category.ilike.%${sanitizedQuery}%`)
          .limit(5);
        
        console.log('Found articles:', articles?.length || 0, 'events:', events?.length || 0, 'tools:', tools?.length || 0);
        
        // Format results for AI
        let resultsText = '';
        
        if (articles && articles.length > 0) {
          resultsText += '📰 **Articles:**\n\n' + articles.map(a => {
            // Extract text content from jsonb content field
            let contentText = '';
            if (a.content && Array.isArray(a.content)) {
              contentText = a.content
                .filter((block: any) => block.type === 'paragraph' && block.content && Array.isArray(block.content))
                .map((block: any) => 
                  block.content
                    .filter((item: any) => item.type === 'text')
                    .map((item: any) => item.text)
                    .join('')
                )
                .join(' ')
                .slice(0, 500); // First 500 chars of content
            }
            
            return `- ${a.title}\n  ${a.excerpt || ''}\n  Content: ${contentText}\n  Link: /article/${a.slug}`;
          }).join('\n\n') + '\n\n';
        }
        
        if (events && events.length > 0) {
          resultsText += '📅 **Events:**\n\n' + events.map(e => 
            `- ${e.title}\n  ${e.description || ''}\n  ${e.location} - ${new Date(e.start_date).toLocaleDateString()}\n  Link: /events/${e.slug || e.id}`
          ).join('\n\n') + '\n\n';
        }
        
        if (tools && tools.length > 0) {
          resultsText += '🔧 **AI Tools:**\n\n' + tools.map(t => 
            `- ${t.name}${t.category ? ` (${t.category})` : ''}\n  ${t.description || ''}\n  Link: ${t.url}`
          ).join('\n\n') + '\n\n';
        }
        
        const articlesText = resultsText || 'No articles, events, or tools found matching that query.';
        
        // Send tool result back to AI
        const finalResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              ...messages,
              { role: 'assistant', content: message },
              {
                role: 'user',
                content: [{ type: 'tool_result', tool_use_id: toolCall.id, content: articlesText }]
              }
            ],
          }),
        });

        const finalData = await finalResponse.json();
        const finalText = finalData.content?.find((b: any) => b.type === 'text')?.text || 'Sorry, I could not find relevant results.';
        return new Response(
          JSON.stringify({ content: finalText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // No tool calls — return text directly
    const textBlock = message?.find((b: any) => b.type === 'text');
    const content = textBlock?.text || '';
    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scout-chat function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

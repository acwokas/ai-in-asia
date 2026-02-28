import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, title } = await req.json();

    if (!title || !slug) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: slug and title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract topic from title by removing common prefixes
    const topic = title
      .replace(/^(how to|guide to|a guide to|the complete guide to|mastering|understanding)\s+/i, '')
      .trim();

    // Pick colour palette based on title keywords
    const lower = title.toLowerCase();
    const palettes = [
      { keys: ['business', 'finance', 'market', 'revenue', 'startup', 'enterprise', 'roi', 'investment', 'monetis', 'monetiz', 'sales', 'pricing', 'economic'], color: 'warm golden and amber', accent: 'rich gold' },
      { keys: ['tech', 'programming', 'code', 'developer', 'software', 'api', 'data', 'machine learning', 'deep learning', 'neural', 'algorithm', 'cloud', 'infrastructure', 'automation'], color: 'cool blue and teal', accent: 'electric cyan' },
      { keys: ['life', 'wellness', 'health', 'mindful', 'wellbeing', 'lifestyle', 'personal', 'mental', 'balance', 'self-care'], color: 'deep burgundy and crimson', accent: 'warm rose' },
      { keys: ['learn', 'education', 'tutorial', 'course', 'training', 'teach', 'student', 'beginner', 'fundamental', 'introduction', 'guide to'], color: 'rich emerald and jade', accent: 'bright green' },
      { keys: ['creative', 'content', 'writing', 'design', 'art', 'prompt', 'storytelling', 'video', 'image', 'generat', 'music', 'brand'], color: 'regal purple and violet', accent: 'electric lavender' },
      { keys: ['productiv', 'workflow', 'efficien', 'organis', 'organiz', 'time management', 'tool', 'system', 'process', 'project management'], color: 'warm copper and bronze', accent: 'burnt orange' },
    ];

    const matched = palettes.find(p => p.keys.some(k => lower.includes(k)));
    const palette = matched || { color: 'warm golden and amber', accent: 'rich gold' };

    const prompt = `Cinematic dark still-life photograph related to ${topic}. Moody ambient lighting with ${palette.color} accents on a near-black background, with subtle ${palette.accent} highlights. Realistic objects arranged as an elegant composition - think vintage desk items, professional tools, or symbolic objects that represent the topic. Rich textures like leather, wood, brushed metal, aged paper, glass. Photorealistic quality, shallow depth of field, no people, no text, no screens, no UI elements, no diagrams. Shot on medium format camera, 16:9 aspect ratio.`;

    console.log(`Generating image for guide "${slug}" with topic: ${topic}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          { role: 'user', content: prompt }
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits required.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      throw new Error(`AI gateway error: ${response.status} ${text}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated from AI gateway');
    }

    console.log(`Image generated successfully for guide "${slug}"`);

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating guide image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

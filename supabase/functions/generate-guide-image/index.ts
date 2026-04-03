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

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }),
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

    const prompt = `Extreme close-up macro photograph of symbolic objects related to ${topic}. Shallow depth of field, dramatic product photography lighting with ${palette.color} side light and subtle ${palette.accent} accent glow. The objects subtly incorporate glowing neural network circuit patterns or data particle elements, suggesting AI and technology. Rich textures like leather, wood, brushed metal, aged paper, glass. Dark background, premium editorial quality. No people, no text, no words, no logos, no screens, no UI elements, no diagrams. 16:9 aspect ratio.`;

    console.log(`Generating image for guide "${slug}" with topic: ${topic}`);

    const geminiResp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": GOOGLE_AI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio: "16:9" },
          },
        }),
      }
    );

    if (!geminiResp.ok) {
      if (geminiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (geminiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits required. Please check your Google AI API quota.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await geminiResp.text();
      throw new Error(`Gemini API error: ${geminiResp.status} ${text}`);
    }

    const data = await geminiResp.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart) {
      throw new Error('No image generated from Gemini API');
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const base64Data = imagePart.inlineData.data;
    const imageUrl = `data:${mimeType};base64,${base64Data}`;

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

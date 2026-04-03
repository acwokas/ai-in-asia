import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ImagePrompt = {
  title: string;
  prompt: string;
  explanation?: string;
};

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function asText(content: unknown): string {
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content } = await req.json();

    if (!title || !content) {
      return new Response(JSON.stringify({ error: "Title and content are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gatewayUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    console.log("Generating image prompts via Google Gemini API");

    const contentText = asText(content);
    const contentPreview = contentText.substring(0, 1800);

    const systemPrompt =
      `You are a world-class editorial image prompt engineer. Generate exactly TWO distinct image generation prompts for the SAME article. Each prompt will be sent to a Gemini image generation model.

VISUAL STYLE SYSTEM — assign one style per prompt, never the same style twice:

Style A "Macro Symbolic": Extreme close-up of a symbolic object relevant to the article's subject. Shallow depth of field, dramatic product photography lighting with warm amber side light and cool blue accent. The object subtly incorporates glowing neural network circuit patterns or data particle elements.

Style B "Street Documentary": Street-level or environmental photograph of a real location relevant to the article. Golden hour or blue hour lighting, shot on medium format film aesthetic with slight grain. Subtle translucent holographic data visualisation overlay suggesting AI/digital transformation.

Style C "Cinematic Wide": Cinematic ultra-wide aerial or panoramic shot of a location or scene relevant to the article. Moody teal-and-amber colour palette, premium editorial atmosphere. Thin luminous data streams or particles suggesting AI flowing through the scene.

RULES:
- Each prompt must be 3-4 sentences of rich visual description.
- Choose visual subjects (objects, landmarks, cultural elements, locations) that are SPECIFIC to the article content — not generic tech imagery.
- For articles about specific countries or cities, include recognisable local elements (architecture, cultural objects, landscapes).
- The two prompts MUST use different styles and different visual subjects/compositions.
- Include technical photographic terms: lens type, lighting setup, colour palette, mood, composition.
- Strictly NO text, words, logos, typography, UI elements, screens, or diagrams in the image.
- Avoid brand names and copyrighted characters.
- ALWAYS end each prompt with: "No text, no words, no logos, no letters. 16:9 aspect ratio."
- Do NOT include Midjourney parameters (--ar, --v, --style). These prompts go to Gemini, not Midjourney.
- Output must be structured via the provided tool.`;

    const userPrompt = `Article Title: ${title}\n\nArticle Content (preview):\n${contentPreview}\n\nReturn two prompts:\n1) HERO: A striking editorial image for the featured image above the fold. Pick one of the three visual styles (Macro Symbolic, Street Documentary, or Cinematic Wide) and describe the scene in detail with subjects drawn from the article content.\n2) BODY: A rich, atmospheric mid-article supporting image using a DIFFERENT visual style from the hero. Completely different composition, subject, and metaphor.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "create_image_prompts",
          description:
            "Return exactly two image prompts: one for the hero/title section and one for the body section.",
          parameters: {
            type: "object",
            properties: {
              prompts: {
                type: "array",
                minItems: 2,
                maxItems: 2,
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description:
                        "Short label for where the prompt is used, e.g. 'Title Section (Hero)' or 'Body Section'.",
                    },
                    prompt: {
                      type: "string",
                      description:
                        "3-4 sentence editorial image generation prompt using one of the three visual styles. Subjects must be specific to the article content. End with 'No text, no words, no logos, no letters. 16:9 aspect ratio.'",
                    },
                    explanation: {
                      type: "string",
                      description:
                        "Optional one-sentence note on why this visual fits the article.",
                    },
                  },
                  required: ["title", "prompt"],
                  additionalProperties: false,
                },
              },
            },
            required: ["prompts"],
            additionalProperties: false,
          },
        },
      },
    ];

    const body: Record<string, unknown> = {
      model: "gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "create_image_prompts" } },
      temperature: 0.7,
    };

    // First attempt
    let response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
         Authorization: `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits required. Please check your Google AI API quota. Please check your Google AI API quota.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ error: "Failed to generate prompts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    const tryExtractPrompts = (payload: any): ImagePrompt[] | null => {
      // Tool calling path
      const toolArgs =
        payload?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (typeof toolArgs === "string") {
        try {
          const parsed = JSON.parse(toolArgs);
          if (Array.isArray(parsed?.prompts)) return parsed.prompts;
        } catch {
          // fall through
        }
      }

      // Content fallback path (if tool calling not returned)
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim()) {
        try {
          const jsonMatch =
            content.match(/```json\n([\s\S]*?)\n```/) ||
            content.match(/```\n([\s\S]*?)\n```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : content;
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed?.prompts)) return parsed.prompts;
        } catch {
          // fall through
        }
      }

      return null;
    };

    let prompts = tryExtractPrompts(data);

    // If prompts are missing or duplicated, ask once to diversify
    const isBad = (p: ImagePrompt[] | null) => {
      if (!p || p.length !== 2) return true;
      const a = normalizeText(p[0]?.prompt || "");
      const b = normalizeText(p[1]?.prompt || "");
      return !a || !b || a === b;
    };

    if (isBad(prompts)) {
      const retryBody = {
        ...body,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              userPrompt +
              "\n\nIMPORTANT: The two prompts must be materially different; the second must NOT be a paraphrase of the first.",
          },
        ],
      };

      response = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GOOGLE_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(retryBody),
      });

      if (response.ok) {
        const retryData = await response.json();
        prompts = tryExtractPrompts(retryData);
      }
    }

    if (!prompts || prompts.length !== 2) {
      return new Response(JSON.stringify({ error: "Failed to generate two prompts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ prompts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


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
      `You are a world-class Midjourney prompt engineer and editorial art director for AI in ASIA (aiinasia.com), a publication covering AI, technology, business, and culture across Asia.\n\nGenerate exactly TWO distinct image prompts that are SPECIFIC to the article's subject matter. Each prompt must tell a visual story — never produce generic tech imagery.\n\nSTYLE DIRECTION:\n- Rotate between these proven styles based on article tone: cinematic photography, stylised illustration (lo-fi anime, concept art), 3D Pixar/cartoon, surreal photo-manipulation, macro/close-up tactile shots, epic-scale conceptual scenes\n- Colour palettes should be bold and saturated: teal & orange, blue & gold, neon pink & cyan, warm amber & deep shadow. Avoid muted, washed-out, or corporate-bland palettes\n- Lighting should be dramatic: rim lighting, volumetric haze, neon glows, golden hour, or chiaroscuro — never flat or evenly lit\n\nCOMPOSITION RULES:\n- Build each prompt around a CONCRETE VISUAL METAPHOR drawn from the article's specific subject (e.g. a puppet dissolving into code for AI replacing jobs, a book with a city skyline emerging for knowledge/Asia, clockwork gears for precision/engineering)\n- Include human-scale elements where possible: hands, silhouettes, characters, cultural objects — these create emotional connection\n- When the article involves an Asian country or culture, weave in recognisable cultural details (architecture, clothing, food, landscapes, ceremonies) — but tastefully, not as stereotypes\n- Vary composition: use close-ups, aerial/high-angle, split-screen contrasts, environmental storytelling — not just centred subjects\n\nPROMPT STRUCTURE:\n- Each prompt should be 2-4 sentences of rich, specific visual description\n- Include technical terms: lens type (85mm, wide-angle, macro), lighting setup, depth of field, colour grading\n- End each prompt with: --ar 16:9 --style raw --v 6\n\nSTRICTLY AVOID:\n- Abstract glowing nodes, neural networks, floating data streams, or generic \"AI brain\" imagery\n- Dark/muted colour schemes that look like stock photos\n- Text, words, logos, typography, UI elements, screens, or diagrams\n- Brand names and copyrighted characters\n- Anything that could be described as \"vague nebulous lights\" or \"abstract tech\"\n\nThe two prompts must be meaningfully different in style, composition, and visual metaphor. Output must be structured via the provided tool.`;

    const userPrompt = `Article Title: ${title}\n\nArticle Content (preview):\n${contentPreview}\n\nBased on the specific subject matter above, generate two distinct Midjourney v6 prompts. Each must use a concrete visual metaphor directly tied to the article's theme — not generic tech imagery. Make them eye-catching, colourful, and provocative.`;

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
                        "1-2 sentence editorial image generation prompt. No text in image.",
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


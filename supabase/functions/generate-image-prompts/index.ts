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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentText = asText(content);
    const contentPreview = contentText.substring(0, 1800);

    const systemPrompt =
      "You are an editorial art director. Generate exactly TWO distinct, editorial-quality image generation prompts for the SAME article: one for the hero/title section image and one for an in-body section image.\n\nRules:\n- Output must be structured via the provided tool.\n- Prompts must be meaningfully different (different composition, subject framing, environment, or metaphor), not paraphrases.\n- No text/words/logos/typography in the image.\n- Avoid brand names and copyrighted characters.\n- Keep each prompt 1-2 sentences, highly visual, specific lighting/composition.";

    const userPrompt = `Article Title: ${title}\n\nArticle Content (preview):\n${contentPreview}\n\nReturn two prompts:\n1) HERO: used as the featured image above the fold (strong focal point, clean negative space).\n2) BODY: used as an in-article supporting image (more contextual/detail, different composition from HERO).`;

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
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "create_image_prompts" } },
      temperature: 0.7,
    };

    // First attempt
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
              "AI credits required. Please add credits to your Lovable AI usage to continue.",
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

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Extract a base64 data-URL from the Gemini image-generation response.
 * Handles multiple response formats (Lovable gateway, Google direct, inline_data).
 */
function extractBase64FromResponse(data: any): string | null {
  // Format 1: Lovable AI Gateway — images array
  const gatewayUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (gatewayUrl) return gatewayUrl;

  // Format 2: Google direct API — content parts
  const parts = data.choices?.[0]?.message?.content;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part?.type === "image_url" && part?.image_url?.url) return part.image_url.url;
      if (part?.inline_data?.data && part?.inline_data?.mime_type) {
        return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { displayDate } = await req.json();

    const imagePrompt = `Generate a bold, eye-catching editorial hero image for a daily AI intelligence briefing called "3 Before 9" for the date: ${displayDate}.

COMPOSITION: Wide establishing shot or epic-scale scene. Strong visual hierarchy using the rule of thirds. Leave generous negative space on one side for potential title overlay. Use foreground elements to add depth and draw the eye inward. 16:9 aspect ratio, ultra high resolution.

STYLE DIRECTION: Rotate between these approaches — cinematic photography with dramatic grading, stylised illustration (lo-fi anime or concept art), 3D Pixar/cartoon, surreal photo-manipulation, or epic-scale conceptual scenes. Commit fully to one style. The image should feel premium, editorial, and forward-looking.

COLOUR & LIGHTING: Bold, saturated palettes — teal & orange, blue & gold, neon pink & cyan, warm amber & deep shadow, or electric purple & gold. Lighting must be dramatic: rim lighting, volumetric haze, neon glows, golden hour, or chiaroscuro. Never flat, evenly lit, or muted. Never dark/muted colour schemes.

VISUAL METAPHOR: Build around a CONCRETE VISUAL METAPHOR tied to AI, technology, or the future of Asia — e.g. a sunrise over a futuristic Asian cityscape, origami cranes transforming into digital particles, a tea ceremony with holographic elements, bamboo forest with bioluminescent data streams weaving through. Make it vivid, specific, and culturally rich.

HUMAN ELEMENTS: Include human-scale elements where possible — hands, silhouettes, characters, cultural objects. These create emotional connection and scale.

CULTURAL DETAILS: Weave in recognisable Asian cultural details — architecture, clothing, food, landscapes, ceremonies — tastefully, not as stereotypes.

STRICTLY AVOID: Abstract glowing nodes, neural networks, floating data streams, generic "AI brain" imagery. Dark/muted colour schemes that look like stock photos. Text, words, logos, typography, UI elements, screens, or diagrams. Brand names and copyrighted characters. People sitting at computers or typing on laptops. Anything described as "vague nebulous lights" or "abstract tech". No flat design.`;

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!googleApiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const gatewayUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    console.log("Generating 3B9 hero image via Google Gemini API");

    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${googleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-image",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const base64Url = extractBase64FromResponse(data);

    if (!base64Url) {
      console.error("No image in response. Message keys:", JSON.stringify(Object.keys(data?.choices?.[0]?.message || {})));
      throw new Error("No image generated");
    }

    const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const timestamp = Date.now();
    const filePath = `3b9/hero-${timestamp}.png`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(filePath, imageBytes, { contentType: "image/png" });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from("article-images")
      .getPublicUrl(filePath);

    console.log("3B9 hero image generated:", urlData.publicUrl);

    return new Response(
      JSON.stringify({ heroImageUrl: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating 3B9 hero:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

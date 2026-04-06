import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VISUAL_STYLES = [
  {
    name: "Macro Symbolic",
    instruction: "Extreme close-up macro photograph of a symbolic object. Shallow depth of field, dramatic product photography lighting with warm amber side light and cool blue accent. The object subtly incorporates glowing neural network circuit patterns or data particle elements.",
  },
  {
    name: "Street Documentary",
    instruction: "Street-level documentary photograph at golden hour. Rich warm tones, slight film grain, medium format aesthetic. A subtle translucent holographic data visualisation overlay suggests AI and digital transformation without overwhelming the scene.",
  },
  {
    name: "Cinematic Wide",
    instruction: "Cinematic ultra-wide panoramic shot at blue hour. Moody teal-and-amber colour palette, premium editorial atmosphere. Thin streams of luminous data particles flow like wind currents through the scene, suggesting AI intelligence permeating the environment.",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { displayDate, bullets } = await req.json();

    const dayOfYear = Math.floor(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const style = VISUAL_STYLES[dayOfYear % VISUAL_STYLES.length];

    let contentContext = "";
    if (bullets && Array.isArray(bullets) && bullets.length > 0) {
      contentContext = `Today's briefing covers: ${bullets.join("; ")}. Use these topics to choose relevant visual subjects — specific locations, cultural objects, industry symbols, or scenes that relate to the content.`;
    } else {
      contentContext = `This is a daily AI intelligence briefing about technology and AI across Asia. Choose visual subjects that evoke innovation, data, and the Asia-Pacific region.`;
    }

    const imagePrompt = `Create a premium editorial header image for a daily AI intelligence briefing called "3 Before 9". ${style.instruction} ${contentContext} Date context: ${displayDate}. No text, no words, no logos, no letters, no numbers. Ultra high resolution, 16:9 aspect ratio.`;

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!googleApiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

    console.log(`Generating 3B9 hero image (style: ${style.name})...`);

    const geminiResp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": googleApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio: "16:9" },
          },
        }),
      }
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("Gemini API error:", geminiResp.status, errText);
      if (geminiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error: ${geminiResp.status}`);
    }

    const data = await geminiResp.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart) throw new Error("No image generated");

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const base64Data = imagePart.inlineData.data;
    const timestamp = Date.now();
    const filePath = `3b9/hero-${timestamp}.webp`;

    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(filePath, imageBytes, {
        contentType: "image/webp",
        cacheControl: "31536000",
      });

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

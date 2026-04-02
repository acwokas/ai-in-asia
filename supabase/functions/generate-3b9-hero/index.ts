import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { displayDate } = await req.json();

    const imagePrompt = `A sophisticated, modern editorial header image for a daily AI intelligence briefing called "3 Before 9". Abstract tech-inspired composition with warm amber and gold accent tones against a deep dark background. Incorporate subtle visual elements suggesting artificial intelligence, data flows, neural networks, or digital connectivity. The mood should be premium, editorial, and forward-looking. Style: clean, minimal, high-contrast. Do NOT include any text, numbers, letters, or words in the image. Date context: ${displayDate}. Ultra high resolution, 16:9 aspect ratio hero image.`;

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!googleApiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

    console.log("Generating 3B9 hero image via Gemini native API...");

    const geminiResp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-image-generation:generateContent",
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
      const errBody = await geminiResp.text();
      console.error("Gemini API error:", geminiResp.status, errBody);
      if (geminiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (geminiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Gemini API error: " + geminiResp.status + " - " + errBody);
    }

    const data = await geminiResp.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inline_data);

    if (!imagePart?.inline_data) throw new Error("No image generated from Gemini");

    const mimeType = imagePart.inline_data.mime_type || "image/png";
    const base64Data = imagePart.inline_data.data;
    const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
    const timestamp = Date.now();
    const filePath = `3b9/hero-${timestamp}.${ext}`;

    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(filePath, imageBytes, { contentType: mimeType });

    if (uploadError) throw new Error("Upload failed: " + uploadError.message);

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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

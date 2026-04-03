import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { displayDate, bullets } = await req.json();

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!googleApiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

    const PROMPT_WRITER_SYSTEM = `You are an expert AI art director specializing in cinematic editorial imagery for Asian technology media. Your job is to write a single, vivid image generation prompt for the hero image of a daily AI/tech briefing called "3 Before 9".

STYLE GUIDE:
- Always anchor the image in culturally specific Asian imagery (architecture, landscapes, transportation, mythology, ceremonies, craft traditions – e.g. temple gates, longtail boats, pagodas, rice terraces, bullet trains, night markets)
- Pair it with a tech/AI metaphor tied to the day's actual news (data flows, neural networks, regulation filters, digital transformation, AI decision-making, model training)
- Cinematic composition: wide-angle or dramatic perspective, strong foreground/background depth, sense of epic scale
- Color palette: neon cyan and magenta energy/light + golden warm tones + deep dark backgrounds (midnight blue, charcoal, obsidian black)
- Include specific style direction: lo-fi anime, volumetric haze, rim lighting, crystalline surfaces, bioluminescent glow, etc.
- Make it feel epic, premium, and editorial – never generic or corporate
- NO text, words, letters, numbers, or logos in the image
- Output ONLY the image prompt text – no preamble, no explanation

FEW-SHOT EXAMPLES (match this quality bar exactly):
Example 1: "An epic-scale conceptual illustration of a traditional Thai longtail boat navigating a digital storm of swirling, dark monsoon clouds and fragmented paper reports. From the center of the boat, a brilliant pulse of neon cyan light cuts through the chaos, turning the turbulent grey waves into a calm, glowing crystalline path of golden light. High-contrast lo-fi anime style, vibrant pink and cyan highlights, volumetric haze, wide-angle perspective."

Example 2: "A cinematic wide-angle shot of a massive, glowing traditional Korean palace gate standing as a monumental filter. Streams of neon cyan and magenta liquid energy, representing global AI data, attempt to pass through the gate but are refined into orderly golden geometric patterns. Dramatic midnight blue atmosphere with volumetric golden mist and sharp rim lighting on the intricate wooden architecture."

Given the day's news signals below, write ONE cinematic hero image prompt (2-4 sentences) that captures the overarching theme or the most visually compelling story of the day. The image should feel like a single cohesive scene, not a collage. Output ONLY the prompt text.`;

    const FALLBACK_PROMPT = `A cinematic wide-angle view of a vast traditional Asian night market at the edge of a futuristic megacity skyline, the stalls illuminated by neon cyan lanterns that pulse with flowing streams of golden data light. In the distance, towering pagoda spires are wrapped in holographic magenta rings representing AI signals circling the globe. Lo-fi anime aesthetic, deep midnight blue atmosphere, volumetric fog rolling between the ancient market and the digital horizon, dramatic rim lighting on carved wooden market stalls. No text.`;

    let imagePrompt = FALLBACK_PROMPT;

    if (bullets && Array.isArray(bullets) && bullets.length > 0) {
      console.log("Generating cinematic prompt from today's signals via gemini-2.5-flash...");

      const bulletSummaries = bullets.map((b: string, i: number) => `Signal ${i + 1}: ${b}`).join("\n");

      const promptGenResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: PROMPT_WRITER_SYSTEM },
            { role: "user", content: `Today's date: ${displayDate}\n\nToday's 3 Before 9 signals:\n${bulletSummaries}\n\nWrite ONE cinematic hero image prompt for this briefing.` },
          ],
        }),
      });

      if (promptGenResponse.ok) {
        const promptData = await promptGenResponse.json();
        const generated = promptData.choices?.[0]?.message?.content?.trim();
        if (generated) {
          imagePrompt = generated;
          console.log("Generated cinematic prompt:", imagePrompt.substring(0, 120) + "...");
        } else {
          console.warn("Prompt writer returned empty response, using fallback");
        }
      } else {
        const errText = await promptGenResponse.text();
        console.warn("Prompt writer failed, using fallback. Status:", promptGenResponse.status, errText.substring(0, 200));
      }
    } else {
      console.log("No bullets provided – using fallback cinematic prompt");
    }

    console.log("Generating 3B9 hero image via Gemini native API...");

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,`,
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
      throw new Error(`Gemini API error: ${geminiResp.status} - ${errBody}`);
    }

    const data = await geminiResp.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inline_data);

    if (!imagePart?.inline_data) throw new Error("No image generated from Gemini");

    const mimeType = imagePart.inline_data.mime_type || "image/png";
    const base64Data = imagePart.inline_data.data;
    const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
    const timestamp = Date.now();
    const filePath = `3b9/hero-${timestamp}.${ext}`;

    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(filePath, imageBytes, { contentType: mimeType });

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

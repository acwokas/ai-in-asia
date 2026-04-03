import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
async function generateAndUploadSignalImages(
  imagePrompts: string[],
  supabase: any,
  googleApiKey: string
): Promise<string[]> {
  const signalImages: string[] = [];

  for (let i = 0; i < Math.min(imagePrompts.length, 3); i++) {
    try {
      console.log(`Generating signal image ${i + 1}: ${imagePrompts[i].substring(0, 80)}...`);

      const geminiResp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": googleApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: imagePrompts[i] }] }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: { aspectRatio: "16:9" },
            },
          }),
        }
      );

      if (!geminiResp.ok) {
        console.error(`Image generation failed for signal ${i + 1}: ${geminiResp.status}`);
        signalImages.push("");
        continue;
      }

      const data = await geminiResp.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData);

      if (!imagePart) {
        console.log(`No image returned for signal ${i + 1}`);
        signalImages.push("");
        continue;
      }

      const mimeType = imagePart.inlineData.mimeType || "image/png";
      const base64Data = imagePart.inlineData.data;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let j = 0; j < binaryString.length; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }
      const blob = new Blob([bytes], { type: mimeType });

      const ext = mimeType.includes("png") ? "png" : "jpg";
      const filePath = `3b9/signal-${i + 1}-${Date.now()}-gemini.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("article-images")
        .upload(filePath, blob, { contentType: mimeType });

      if (uploadError) {
        console.error(`Upload failed for signal ${i + 1}:`, uploadError);
        signalImages.push("");
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("article-images")
        .getPublicUrl(filePath);

      signalImages.push(urlData.publicUrl);
      console.log(`Signal ${i + 1} image generated and uploaded`);
    } catch (err) {
      console.error(`Error generating signal image ${i + 1}:`, err);
      signalImages.push("");
    }
  }

  return signalImages;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!googleApiKey) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin role required" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const requestData = await req.json();
    const { articleId, content, title, articleType } = requestData;
    const is3B9 = articleType === 'three_before_nine';

    let contentText = "";
    if (typeof content === "string") {
      contentText = content;
    } else if (Array.isArray(content)) {
      contentText = content
        .map((block: any) => {
          if (block.type === "paragraph") return block.content;
          if (block.type === "heading") return block.content;
          if (block.type === "list") return block.items?.join(" ") || "";
          return "";
        })
        .filter(Boolean)
        .join(" ");
    }

    console.log("Starting TL;DR generation...");

    const seoExtras = is3B9 ? `
4. "metaTitle": An SEO-optimised page title under 60 characters. Include "3 Before 9" and the date or key theme.
5. "seoTitle": A slightly longer browser tab title under 70 characters.
6. "metaDescription": A compelling meta description under 155 characters summarising the briefing.
7. "focusKeyphrase": A 2-4 word SEO keyphrase for this edition.
8. "keyphraseSynonyms": Comma-separated synonyms or related phrases.
9. "featuredImageAlt": Short descriptive alt text for the hero image.` : '';

    const seoRequiredFields = is3B9 ? ["metaTitle", "seoTitle", "metaDescription", "focusKeyphrase", "keyphraseSynonyms", "featuredImageAlt"] : [];

    const systemPrompt = `You are creating a TL;DR Snapshot for an article.

CRITICAL RULES:
- NEVER use em dashes (Ã¢)
- AVOID AI phrases like: "rapidly evolving", "game changer", "cutting-edge", "revolutionize", "paradigm shift"
- Create EXACTLY 3 bullet points
- Each bullet point must be ONE sentence maximum
- Be specific and highlight key takeaways
- Write naturally and concisely
- Use British English spelling
- No emojis

ALSO GENERATE:
1. "whoShouldPayAttention": A short list of relevant audiences separated by vertical bars (|). Example: "Founders | Platform trust teams | Regulators". Keep under 20 words.
2. "whatChangesNext": One short sentence describing what to watch next or likely implications. Keep under 20 words. If you cannot confidently determine this, return an empty string. For opinion/commentary pieces, use "Debate is likely to intensify" if appropriate.
3. "imagePrompts": For each bullet point, write a Midjourney-quality cinematic image prompt. Each of the 3 prompts must be VISUALLY DISTINCT from the others (different cultural anchors, different compositions, different settings). Each prompt must be tied directly to the specific content and theme of its corresponding bullet point.

STYLE GUIDE for each prompt:
- Anchor in culturally specific Asian imagery (temple gates, longtail boats, pagodas, rice terraces, bullet trains, night markets, calligraphy studios, bamboo forests, etc.)
- Pair with a tech/AI metaphor that reflects the bullet's specific story
- Cinematic composition: wide-angle or dramatic perspective, strong depth, epic scale
- Color palette: neon cyan and magenta energy + golden warm tones + deep dark backgrounds (midnight blue, charcoal, obsidian)
- Include specific style direction (lo-fi anime, volumetric haze, rim lighting, crystalline surfaces, bioluminescent glow, etc.)
- 2-4 sentences long and highly specific
- NO text, words, letters, numbers, logos, or brand names in the image

FEW-SHOT EXAMPLES (match this quality):
"An epic-scale conceptual illustration of a traditional Thai longtail boat navigating a digital storm of swirling, dark monsoon clouds and fragmented paper reports. From the center of the boat, a brilliant pulse of neon cyan light cuts through the chaos, turning the turbulent grey waves into a calm, glowing crystalline path of golden light. High-contrast lo-fi anime style, vibrant pink and cyan highlights, volumetric haze, wide-angle perspective."

"A cinematic wide-angle shot of a massive, glowing traditional Korean palace gate standing as a monumental filter. Streams of neon cyan and magenta liquid energy, representing global AI data, attempt to pass through the gate but are refined into orderly golden geometric patterns. Dramatic midnight blue atmosphere with volumetric golden mist and sharp rim lighting on the intricate wooden architecture."

${seoExtras}

Article: "${title}"
Content: ${contentText.substring(0, 2000)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let tldrBullets: string[] = [];
    let whoShouldPayAttention = "";
    let whatChangesNext = "";
    let signalImages: string[] = [];
    let seoFields: Record<string, string> = {};

    try {
      const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${googleApiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generate 3 concise TL;DR bullet points plus the editorial context lines." }
          ],
          tools: [{
            type: "function",
            function: {
              name: "generate_tldr",
              description: "Generate TL;DR bullet points and editorial context",
              parameters: {
                type: "object",
                properties: {
                  bullets: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of 3 bullet point strings",
                    minItems: 3,
                    maxItems: 3
                  },
                  whoShouldPayAttention: {
                    type: "string",
                    description: "Short list of relevant audiences separated by vertical bars (|)"
                  },
                  whatChangesNext: {
                    type: "string",
                    description: "One short sentence about what to watch next or likely implications. Empty string if uncertain."
                  },
                  imagePrompts: {
                    type: "array",
                    items: { type: "string" },
                    description: "For each bullet point, a Midjourney-quality cinematic image prompt (2-4 sentences). Each prompt must be visually distinct from the others, tied to its specific bullet content, anchored in Asian cultural imagery paired with a tech/AI metaphor, using neon cyan/magenta/golden palette on deep dark backgrounds, with specific style direction (lo-fi anime, volumetric haze, rim lighting, etc.). No text, logos, or brand names. Array must have exactly 3 items.",
                    minItems: 3,
                    maxItems: 3
                  },
                  ...(is3B9 ? {
                    metaTitle: { type: "string", description: "SEO page title under 60 chars" },
                    seoTitle: { type: "string", description: "Browser tab title under 70 chars" },
                    metaDescription: { type: "string", description: "Meta description under 155 chars" },
                    focusKeyphrase: { type: "string", description: "2-4 word SEO keyphrase" },
                    keyphraseSynonyms: { type: "string", description: "Comma-separated synonym phrases" },
                    featuredImageAlt: { type: "string", description: "Short alt text for hero image" },
                  } : {})
                },
                required: ["bullets", "whoShouldPayAttention", "whatChangesNext", "imagePrompts", ...seoRequiredFields],
                additionalProperties: false
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "generate_tldr" } }
        }),
      });

      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI API error:", aiResponse.status, errorText);
        if (aiResponse.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        }
        if (aiResponse.status === 402) {
          throw new Error("Payment required. Please check your Google AI API quota.");
        }
        throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
      }

      console.log("AI response received, parsing...");

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];

      if (!toolCall) {
        console.error("No tool call in response:", JSON.stringify(aiData));
        throw new Error("No tool call in AI response");
      }

      const parsedArgs = JSON.parse(toolCall.function.arguments);

      tldrBullets = parsedArgs.bullets.slice(0, 3);
      whoShouldPayAttention = parsedArgs.whoShouldPayAttention || "";
      whatChangesNext = parsedArgs.whatChangesNext || "";
      const imagePrompts: string[] = parsedArgs.imagePrompts || [];

      // Extract SEO fields for 3B9
      seoFields = is3B9 ? {
        metaTitle: parsedArgs.metaTitle || "",
        seoTitle: parsedArgs.seoTitle || "",
        metaDescription: parsedArgs.metaDescription || "",
        focusKeyphrase: parsedArgs.focusKeyphrase || "",
        keyphraseSynonyms: parsedArgs.keyphraseSynonyms || "",
        featuredImageAlt: parsedArgs.featuredImageAlt || "",
      } : {};

      console.log("TL;DR generated successfully:", tldrBullets.length, "bullets");

      if (tldrBullets.length < 3) {
        throw new Error(`Only ${tldrBullets.length} bullets generated, expected 3`);
      }

      // Generate signal images using Gemini native image API
      if (imagePrompts.length > 0) {
        try {
          signalImages = await generateAndUploadSignalImages(imagePrompts, supabase, googleApiKey);
          console.log(`Generated ${signalImages.filter(Boolean).length} signal images`);
        } catch (imgErr) {
          console.error("Signal image generation failed (non-blocking):", imgErr);
        }
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error("Request timeout after 120 seconds");
        throw new Error("TL;DR generation timed out. Please try again with a shorter article.");
      }
      throw error;
    }

    // Remove existing TL;DR from content if it exists
    let cleanedContent = content;
    if (Array.isArray(content)) {
      cleanedContent = content.filter((block: any) => {
        if (block.type === "heading" && block.content) {
          const headingLower = block.content.toLowerCase();
          return !headingLower.includes("tl;dr") && !headingLower.includes("tldr") && !headingLower.includes("tl dr");
        }
        return true;
      });

      let skipNext = false;
      cleanedContent = cleanedContent.filter((block: any, _index: number) => {
        if (skipNext) {
          skipNext = false;
          if (block.type === "paragraph" || block.type === "list") {
            return false;
          }
        }
        if (block.type === "heading" && block.content) {
          const headingLower = block.content.toLowerCase();
          if (headingLower.includes("tl;dr") || headingLower.includes("tldr") || headingLower.includes("tl dr")) {
            skipNext = true;
            return false;
          }
        }
        return true;
      });
    }

    const tldrSnapshotData: Record<string, any> = {
      bullets: tldrBullets,
      whoShouldPayAttention,
      whatChangesNext,
      ...(signalImages.length > 0 ? { signalImages } : {})
    };

    if (articleId) {
      console.log("Updating article in database...");
      const { error: tldrError } = await supabase
        .from("articles")
        .update({ tldr_snapshot: tldrSnapshotData })
        .eq("id", articleId);

      if (tldrError) {
        console.error("TL;DR update error:", tldrError);
        throw tldrError;
      }
      console.log("TL;DR updated successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        tldr_snapshot: tldrSnapshotData,
        content: cleanedContent,
        ...seoFields,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

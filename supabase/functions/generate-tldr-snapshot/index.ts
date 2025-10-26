import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check authentication and admin role
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

    const { articleId, content, title } = await req.json();

    // Convert content to text for AI processing
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

    // Generate TL;DR using AI
    const systemPrompt = `You are creating a TL;DR Snapshot for an article. 
CRITICAL RULES:
- NEVER use em dashes (—)
- AVOID AI phrases like: "rapidly evolving", "game changer", "cutting-edge", "revolutionize", "paradigm shift"
- Create EXACTLY 3 bullet points
- Each bullet point must be ONE sentence maximum
- Be specific and highlight key takeaways
- Write naturally and concisely
- Return ONLY a JSON array of 3 strings, nothing else

Article: "${title}"
Content: ${contentText.substring(0, 3000)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate 3 concise TL;DR bullet points." }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_tldr",
            description: "Generate TL;DR bullet points",
            parameters: {
              type: "object",
              properties: {
                bullets: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of 3 bullet point strings",
                  minItems: 3,
                  maxItems: 3
                }
              },
              required: ["bullets"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_tldr" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    const tldrBullets = parsedArgs.bullets.slice(0, 3); // Ensure exactly 3

    // Remove existing TL;DR from content if it exists
    let cleanedContent = content;
    if (Array.isArray(content)) {
      cleanedContent = content.filter((block: any) => {
        if (block.type === "heading" && block.content) {
          const headingLower = block.content.toLowerCase();
          return !headingLower.includes("tl;dr") && 
                 !headingLower.includes("tldr") &&
                 !headingLower.includes("tl dr");
        }
        return true;
      });

      // Also filter out TL;DR paragraphs that might follow
      let skipNext = false;
      cleanedContent = cleanedContent.filter((block: any, index: number) => {
        if (skipNext) {
          skipNext = false;
          if (block.type === "paragraph" || block.type === "list") {
            return false;
          }
        }
        if (block.type === "heading" && block.content) {
          const headingLower = block.content.toLowerCase();
          if (headingLower.includes("tl;dr") || 
              headingLower.includes("tldr") ||
              headingLower.includes("tl dr")) {
            skipNext = true;
            return false;
          }
        }
        return true;
      });
    }

    // Update article with TL;DR and cleaned content
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        tldr_snapshot: tldrBullets,
        content: cleanedContent
      })
      .eq("id", articleId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tldr_snapshot: tldrBullets,
        content: cleanedContent
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

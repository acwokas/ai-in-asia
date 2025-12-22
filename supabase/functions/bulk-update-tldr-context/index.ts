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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, articleId, batchId } = await req.json();
    console.log("bulk-update-tldr-context request", { action, articleId, batchId });

    // Preview mode - generate for a single article without saving
    if (action === "preview") {
      if (!articleId) throw new Error("articleId required for preview");

      const { data: article, error: articleError } = await supabase
        .from("articles")
        .select("id, title, content, tldr_snapshot")
        .eq("id", articleId)
        .single();

      if (articleError || !article) throw new Error("Article not found");

      const result = await generateContextForArticle(article, lovableApiKey);

      return new Response(
        JSON.stringify({
          success: true,
          preview: result,
          existingSnapshot: article.tldr_snapshot,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Start a new batch job - collect all article IDs and spawn background processing
    if (action === "start") {
      const pageSize = 1000;
      const allIds: string[] = [];
      let from = 0;

      while (true) {
        const { data: page, error: pageError } = await supabase
          .from("articles")
          .select("id")
          .in("status", ["published", "scheduled"])
          .not("tldr_snapshot", "is", null)
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1);

        if (pageError) throw pageError;
        if (!page || page.length === 0) break;
        
        for (const row of page) allIds.push(row.id);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      const newBatchId = crypto.randomUUID();

      // Create queue entry
      const { error: queueError } = await supabase.from("bulk_operation_queue").insert({
        id: newBatchId,
        operation_type: "tldr_context_update",
        article_ids: allIds,
        total_items: allIds.length,
        status: "queued",
        created_by: user.id,
      });

      if (queueError) throw queueError;

      // Start background processing using waitUntil
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      (globalThis as any).EdgeRuntime.waitUntil(processAllArticles(newBatchId, allIds, supabase, lovableApiKey));

      return new Response(
        JSON.stringify({
          success: true,
          batchId: newBatchId,
          totalItems: allIds.length,
          message: "Background processing started. Subscribe to realtime updates.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cancel a running job
    if (action === "cancel") {
      if (!batchId) throw new Error("batchId required");

      await supabase
        .from("bulk_operation_queue")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", batchId);

      return new Response(
        JSON.stringify({ success: true, message: "Job cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get status of a job
    if (action === "status") {
      if (!batchId) throw new Error("batchId required");

      const { data: queue, error: queueError } = await supabase
        .from("bulk_operation_queue")
        .select("*")
        .eq("id", batchId)
        .single();

      if (queueError) throw queueError;

      return new Response(
        JSON.stringify({ success: true, queue }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Background processing function
async function processAllArticles(
  batchId: string,
  articleIds: string[],
  supabase: any,
  apiKey: string
) {
  console.log(`Starting background processing for batch ${batchId} with ${articleIds.length} articles`);

  // Update status to processing
  await supabase
    .from("bulk_operation_queue")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", batchId);

  let processed = 0;
  let successful = 0;
  let failed = 0;
  const batchSize = 3; // Process 3 at a time

  for (let i = 0; i < articleIds.length; i += batchSize) {
    // Check if job was cancelled
    const { data: queue } = await supabase
      .from("bulk_operation_queue")
      .select("status")
      .eq("id", batchId)
      .single();

    if (queue?.status === "cancelled") {
      console.log(`Job ${batchId} was cancelled`);
      return;
    }

    const batchArticleIds = articleIds.slice(i, i + batchSize);

    // Fetch articles for this mini-batch
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, title, content, tldr_snapshot")
      .in("id", batchArticleIds);

    if (articlesError) {
      console.error("Error fetching articles:", articlesError);
      failed += batchArticleIds.length;
      processed += batchArticleIds.length;
      continue;
    }

    for (const article of articles || []) {
      try {
        // Check if already has the new fields
        const snapshot = article.tldr_snapshot as any;
        if (snapshot && !Array.isArray(snapshot) && snapshot.whoShouldPayAttention) {
          console.log(`Skipping ${article.id} - already has context`);
          successful++;
          processed++;
          continue;
        }

        const result = await generateContextForArticle(article, apiKey);
        
        // Build updated snapshot
        const bullets = Array.isArray(snapshot) ? snapshot : snapshot?.bullets || [];
        const updatedSnapshot = {
          bullets,
          whoShouldPayAttention: result.whoShouldPayAttention,
          whatChangesNext: result.whatChangesNext
        };

        // Update article
        const { error: updateError } = await supabase
          .from("articles")
          .update({ tldr_snapshot: updatedSnapshot })
          .eq("id", article.id);

        if (updateError) throw updateError;

        successful++;
        console.log(`Processed ${article.id} successfully`);
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error(`Error processing ${article.id}:`, err);
        failed++;
      }
      processed++;
    }

    // Update progress in database (realtime will push to clients)
    await supabase
      .from("bulk_operation_queue")
      .update({ 
        processed_items: processed,
        successful_items: successful,
        failed_items: failed,
        updated_at: new Date().toISOString()
      })
      .eq("id", batchId);

    // Small delay between batches
    await new Promise(r => setTimeout(r, 200));
  }

  // Mark as completed
  await supabase
    .from("bulk_operation_queue")
    .update({ 
      status: "completed",
      processed_items: processed,
      successful_items: successful,
      failed_items: failed,
      completed_at: new Date().toISOString()
    })
    .eq("id", batchId);

  console.log(`Batch ${batchId} completed: ${successful} success, ${failed} failed`);
}

async function generateContextForArticle(article: any, apiKey: string) {
  // Extract content text
  let contentText = "";
  const content = article.content;
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

  const systemPrompt = `You are adding editorial context to an article TL;DR.

CRITICAL RULES:
- NEVER use em dashes (—)
- Use British English spelling
- No emojis
- Be factual and restrained

Generate:
1. "whoShouldPayAttention": A short list of relevant audiences separated by vertical bars (|). Example: "Founders | Platform trust teams | Regulators". Keep under 20 words.
2. "whatChangesNext": One short sentence describing what to watch next or likely implications. Keep under 20 words. If you cannot confidently determine this, return an empty string. For opinion/commentary pieces, use "Debate is likely to intensify" if appropriate.

Article: "${article.title}"
Content: ${contentText.substring(0, 2000)}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the editorial context lines for this article." }
      ],
      tools: [{
        type: "function",
        function: {
          name: "generate_context",
          description: "Generate editorial context for an article",
          parameters: {
            type: "object",
            properties: {
              whoShouldPayAttention: {
                type: "string",
                description: "Short list of relevant audiences separated by vertical bars (|)"
              },
              whatChangesNext: {
                type: "string",
                description: "One short sentence about what to watch next. Empty string if uncertain."
              }
            },
            required: ["whoShouldPayAttention", "whatChangesNext"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "generate_context" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Payment required");
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const aiData = await response.json();
  const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) throw new Error("No tool call in AI response");

  const parsedArgs = JSON.parse(toolCall.function.arguments);
  return {
    whoShouldPayAttention: parsedArgs.whoShouldPayAttention || "",
    whatChangesNext: parsedArgs.whatChangesNext || ""
  };
}

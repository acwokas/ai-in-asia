import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    console.log("Checking for queued bulk operations...");

    // Get the oldest queued job
    const { data: queuedJobs, error: queueError } = await supabase
      .from("bulk_operation_queue")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1);

    if (queueError) {
      console.error("Error fetching queued jobs:", queueError);
      throw queueError;
    }

    if (!queuedJobs || queuedJobs.length === 0) {
      console.log("No queued jobs found");
      return new Response(
        JSON.stringify({ message: "No queued jobs to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const job = queuedJobs[0];
    console.log(`Processing job ${job.id}: ${job.operation_type}`);

    // Mark job as processing
    await supabase
      .from("bulk_operation_queue")
      .update({ 
        status: "processing", 
        started_at: new Date().toISOString() 
      })
      .eq("id", job.id);

    try {
      // Process based on operation type
      if (job.operation_type === "add_internal_links") {
        await processInternalLinks(supabase, job, lovableApiKey);
      } else {
        throw new Error(`Unknown operation type: ${job.operation_type}`);
      }

      // Mark job as completed
      await supabase
        .from("bulk_operation_queue")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", job.id);

      console.log(`Job ${job.id} completed successfully`);

    } catch (jobError: any) {
      console.error(`Job ${job.id} failed:`, jobError);
      
      // Mark job as failed
      await supabase
        .from("bulk_operation_queue")
        .update({ 
          status: "failed",
          error_message: jobError.message || "Unknown error",
          completed_at: new Date().toISOString()
        })
        .eq("id", job.id);
    }

    return new Response(
      JSON.stringify({ success: true, jobId: job.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in process-bulk-queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processInternalLinks(supabase: any, job: any, lovableApiKey: string) {
  const articleIds = job.article_ids as string[];
  const options = job.options || {};
  const MAX_BATCH_SIZE = 50;

  console.log(`Processing ${articleIds.length} articles for internal links...`);

  // Update total items
  await supabase
    .from("bulk_operation_queue")
    .update({ total_items: articleIds.length })
    .eq("id", job.id);

  // Fetch all published articles for reference
  const { data: allArticles, error: allArticlesError } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100);

  if (allArticlesError) throw allArticlesError;

  const articlesList = allArticles?.map((a: any) => `- ${a.title} (/${a.slug})`).join("\n") || "";

  const results: any[] = [];
  let processedCount = 0;
  let successCount = 0;
  let failedCount = 0;

  // Process in batches
  for (let i = 0; i < articleIds.length; i += MAX_BATCH_SIZE) {
    const batch = articleIds.slice(i, Math.min(i + MAX_BATCH_SIZE, articleIds.length));
    
    for (const articleId of batch) {
      try {
        // Fetch the article
        const { data: article, error: articleError } = await supabase
          .from("articles")
          .select("id, title, slug, content, excerpt")
          .eq("id", articleId)
          .single();

        if (articleError) throw articleError;
        if (!article) continue;

        // Convert content to string
        let contentString = "";
        if (typeof article.content === "string") {
          contentString = article.content;
        } else if (Array.isArray(article.content)) {
          contentString = article.content.map((block: any) => block.content || "").join("\n\n");
        } else if (article.content && typeof article.content === "object") {
          contentString = JSON.stringify(article.content);
        }

        // Check if article already has links
        const hasInternalLinks = /\[([^\]]+)\]\((\/[^\)]+)\)/.test(contentString);
        const hasExternalLinks = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/.test(contentString);

        if (hasInternalLinks && hasExternalLinks) {
          results.push({
            articleId: article.id,
            title: article.title,
            status: "skipped",
            reason: "Already has internal and external links"
          });
          processedCount++;
          continue;
        }

        // Use AI to add links
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are an SEO expert. Add internal and external links to existing article content.

CRITICAL RULES:
- Add 2-4 internal links from our article list using natural anchor text
- Add at least 1 authoritative external link (research papers, official reports, major publications)
- External links MUST use format: [text](url)^ to open in new tabs
- Internal links use format: [text](/slug)
- Only modify the content to add links - preserve all existing text, formatting, headings, paragraphs
- Make anchor text natural and contextual
- Place links where they genuinely add value

AVAILABLE ARTICLES:
${articlesList}

Return ONLY the updated content with links added. Do not change any other aspect of the article.`,
              },
              {
                role: "user",
                content: `Add relevant internal and external links to this article:\n\nTitle: ${article.title}\n\nContent:\n${contentString.substring(0, 8000)}`,
              },
            ],
            temperature: 0.7,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error("AI gateway error:", aiResponse.status, errorText);
          throw new Error(`AI gateway error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const updatedContent = aiData.choices?.[0]?.message?.content;

        if (!updatedContent) {
          throw new Error("No content generated from AI");
        }

        // Update the article if not a dry run
        if (!options.dryRun) {
          const { error: updateError } = await supabase
            .from("articles")
            .update({ content: updatedContent })
            .eq("id", article.id);

          if (updateError) throw updateError;

          results.push({
            articleId: article.id,
            title: article.title,
            status: "updated"
          });
          successCount++;
        } else {
          results.push({
            articleId: article.id,
            title: article.title,
            status: "preview"
          });
        }

        processedCount++;

        // Update progress
        await supabase
          .from("bulk_operation_queue")
          .update({ 
            processed_items: processedCount,
            successful_items: successCount,
            failed_items: failedCount,
            results: results
          })
          .eq("id", job.id);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error: any) {
        console.error(`Error processing article ${articleId}:`, error);
        results.push({
          articleId,
          status: "failed",
          error: error.message
        });
        failedCount++;
        processedCount++;

        // Update progress
        await supabase
          .from("bulk_operation_queue")
          .update({ 
            processed_items: processedCount,
            failed_items: failedCount,
            results: results
          })
          .eq("id", job.id);
      }
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Completed processing: ${successCount} successful, ${failedCount} failed`);
}

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
      } else if (job.operation_type === "generate_ai_comments") {
        await processAIComments(supabase, job, lovableApiKey);
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
        
        // Try to fetch article title for better error reporting
        let articleTitle = 'Unknown';
        try {
          const { data: article } = await supabase
            .from("articles")
            .select("title")
            .eq("id", articleId)
            .single();
          if (article) articleTitle = article.title;
        } catch {}

        results.push({
          articleId,
          title: articleTitle,
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

async function processAIComments(supabase: any, job: any, lovableApiKey: string) {
  const articleIds = job.article_ids as string[];
  const options = job.options || {};
  const MAX_BATCH_SIZE = 30;

  console.log(`Processing ${articleIds.length} articles for AI comments...`);

  // Update total items
  await supabase
    .from("bulk_operation_queue")
    .update({ total_items: articleIds.length })
    .eq("id", job.id);

  // Fetch all AI comment authors
  const { data: authors, error: authorsError } = await supabase
    .from('ai_comment_authors')
    .select('*');

  if (authorsError) throw authorsError;
  
  if (!authors || authors.length === 0) {
    throw new Error('No AI comment authors found. Please seed the author pool first.');
  }

  const authorsByRegion = {
    singapore: authors.filter((a: any) => a.region === 'singapore'),
    india: authors.filter((a: any) => a.region === 'india'),
    philippines: authors.filter((a: any) => a.region === 'philippines'),
    china_hk: authors.filter((a: any) => a.region === 'china_hk'),
    west: authors.filter((a: any) => a.region === 'west'),
  };

  const powerUsers = authors.filter((a: any) => a.is_power_user);
  const allAuthors = [...authorsByRegion.singapore, ...authorsByRegion.india, 
                     ...authorsByRegion.philippines, ...authorsByRegion.china_hk, 
                     ...authorsByRegion.west];

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
          .select("id, title, excerpt, published_at, updated_at")
          .eq("id", articleId)
          .single();

        if (articleError) throw articleError;
        if (!article) continue;

        // Delete existing AI comments if not a retry or if retry option allows overwrite
        if (!options.retry) {
          await supabase
            .from('ai_generated_comments')
            .delete()
            .eq('article_id', article.id);
        }

        // Determine number of comments (2-4 default, with 20% chance of 5-6)
        const numComments = Math.random() < 0.2 
          ? Math.floor(Math.random() * 2) + 5  // 5-6
          : Math.floor(Math.random() * 3) + 2; // 2-4

        const commentsToGenerate = [];

        for (let j = 0; j < numComments; j++) {
          // 30% chance to use power user
          const usePowerUser = Math.random() < 0.3 && powerUsers.length > 0;
          
          let selectedAuthor;
          if (usePowerUser) {
            selectedAuthor = powerUsers[Math.floor(Math.random() * powerUsers.length)];
          } else {
            // Select author based on regional distribution
            const rand = Math.random();
            let region: 'singapore' | 'india' | 'philippines' | 'china_hk' | 'west';
            if (rand < 0.4) region = 'singapore';
            else if (rand < 0.6) region = 'india';
            else if (rand < 0.7) region = 'philippines';
            else if (rand < 0.8) region = 'china_hk';
            else region = 'west';

            const regionAuthors = authorsByRegion[region];
            if (regionAuthors.length === 0) {
              selectedAuthor = allAuthors[Math.floor(Math.random() * allAuthors.length)];
            } else {
              selectedAuthor = regionAuthors[Math.floor(Math.random() * regionAuthors.length)];
            }
          }

          if (!selectedAuthor) continue;

          // Determine comment length
          const lengthRand = Math.random();
          let targetLength: string;
          if (lengthRand < 0.2) targetLength = '15-40 words';
          else if (lengthRand < 0.8) targetLength = '40-80 words';
          else targetLength = '80-120 words';

          // Check if article is old
          const articleAge = (new Date().getTime() - new Date(article.published_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
          const isOldArticle = articleAge > 12;

          const commentAngles = [
            'Share a personal experience or observation',
            'Ask a thoughtful question about the topic',
            'Add a contrarian or alternative perspective',
            'Connect this to a broader trend or issue',
            'Share how this relates to your region or industry',
            'Question or expand on a specific point',
            'Express agreement and add supporting context',
            'Be mildly skeptical about one aspect',
          ];
          const selectedAngle = commentAngles[Math.floor(Math.random() * commentAngles.length)];

          let temporalInstruction = '';
          if (isOldArticle) {
            const temporalVariations = [
              'Subtly reference that some time has passed but avoid clichés like "still relevant" or "even after"',
              'Don\'t mention the article age at all, just engage with the content naturally',
              'Casually note that you\'re coming back to this topic or just discovered it',
              '',
            ];
            temporalInstruction = temporalVariations[Math.floor(Math.random() * temporalVariations.length)];
          }

          const prompt = `You are ${selectedAuthor.name}, a reader from ${selectedAuthor.region.replace('_', ' ')}. Write a natural, authentic comment on this article.

Article: "${article.title}"
Summary: "${article.excerpt || 'No summary available'}"

Requirements:
- Length: ${targetLength}
- Focus: ${selectedAngle}
${temporalInstruction ? `- ${temporalInstruction}` : ''}
- Be specific and relevant to the article topic
- Use ${selectedAuthor.region === 'west' ? 'British or American' : 'a mix of British and American'} English spelling
- Sound natural and conversational
- Include regional phrasing if appropriate (subtle, not stereotypical)
- NO em rules, NO hyphens for emphasis, NO formulaic phrases
- NO promotional content
- NO contradicting the article's facts
- Mix of constructive, neutral, or mildly critical tone
- Make this comment distinctly different from others on the same article

Write ONLY the comment text, no metadata.`;

          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.9,
            }),
          });

          if (!aiResponse.ok) {
            console.error('AI API error:', await aiResponse.text());
            continue;
          }

          const aiData = await aiResponse.json();
          let commentText = aiData.choices[0].message.content.trim();

          // Generate timestamp
          const published = new Date(article.published_at);
          const now = new Date();
          const articleAgeMonths = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 30);

          let commentDate;
          if (articleAgeMonths > 6) {
            if (Math.random() < 0.3) {
              const daysAgo = Math.floor(Math.random() * 60);
              commentDate = new Date(now);
              commentDate.setDate(commentDate.getDate() - daysAgo);
            } else {
              const weeksAfter = Math.floor(Math.random() * 12) + 1;
              commentDate = new Date(published);
              commentDate.setDate(commentDate.getDate() + (weeksAfter * 7));
            }
          } else {
            const daysAfter = Math.floor(Math.random() * 30) + 1;
            commentDate = new Date(published);
            commentDate.setDate(commentDate.getDate() + daysAfter);
          }

          commentsToGenerate.push({
            article_id: article.id,
            author_id: selectedAuthor.id,
            content: commentText,
            comment_date: commentDate.toISOString(),
          });

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Insert all comments for this article
        if (commentsToGenerate.length > 0) {
          const { error: insertError } = await supabase
            .from('ai_generated_comments')
            .insert(commentsToGenerate);

          if (insertError) throw insertError;

          // Update author comment counts
          const authorCounts = new Map();
          for (const comment of commentsToGenerate) {
            authorCounts.set(comment.author_id, (authorCounts.get(comment.author_id) || 0) + 1);
          }

          for (const [authorId, count] of authorCounts.entries()) {
            const author = authors.find((a: any) => a.id === authorId);
            if (author) {
              await supabase
                .from('ai_comment_authors')
                .update({ comment_count: (author.comment_count || 0) + count })
                .eq('id', authorId);
            }
          }
        }

        results.push({
          articleId: article.id,
          title: article.title,
          status: "success",
          commentsGenerated: commentsToGenerate.length
        });
        successCount++;
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

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error(`Error processing article ${articleId}:`, error);
        
        let articleTitle = 'Unknown';
        try {
          const { data: article } = await supabase
            .from("articles")
            .select("title")
            .eq("id", articleId)
            .single();
          if (article) articleTitle = article.title;
        } catch {}

        results.push({
          articleId,
          title: articleTitle,
          status: "failed",
          error: error.message
        });
        failedCount++;
        processedCount++;

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

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Completed processing: ${successCount} successful, ${failedCount} failed`);
}

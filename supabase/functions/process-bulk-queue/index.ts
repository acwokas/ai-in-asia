import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { requireAdmin, getUserFromAuth } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Check for authorization - support both admin users and internal service calls
    const authHeader = req.headers.get('Authorization');
    let isAuthorized = false;
    
    if (authHeader) {
      // User authentication check
      const authSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const user = await getUserFromAuth(authSupabase, authHeader);
      if (user) {
        try {
          await requireAdmin(authSupabase, user.id);
          isAuthorized = true;
          console.log(`Admin user ${user.id} authorized for bulk queue processing`);
        } catch (adminErr) {
          console.log(`User ${user.id} is not an admin`);
        }
      }
    }
    
    // Also check if there's an active job that needs to continue processing
    // This allows the function to be called without auth for continuation scenarios
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (!isAuthorized) {
      // Check if there's an active processing job that needs continuation
      const { data: activeJob } = await supabase
        .from("bulk_operation_queue")
        .select("id, status, processed_items, total_items")
        .eq("status", "processing")
        .limit(1)
        .single();
      
      if (activeJob && activeJob.processed_items < activeJob.total_items) {
        console.log(`Allowing continuation for active job ${activeJob.id}`);
        isAuthorized = true;
      } else {
        return new Response(
          JSON.stringify({ error: "Authentication required. Please click 'Resume Now' to start processing." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Checking for queued bulk operations...");

    // CRITICAL: Ensure only ONE job can be processing at a time
    // First, get ALL processing jobs and keep only the oldest one
    const { data: allProcessingJobs } = await supabase
      .from("bulk_operation_queue")
      .select("id, operation_type, started_at, created_at")
      .eq("status", "processing")
      .order("started_at", { ascending: true });

    if (allProcessingJobs && allProcessingJobs.length > 1) {
      console.log(`WARNING: Found ${allProcessingJobs.length} processing jobs. Resetting extras to queued...`);
      const oldestProcessingJob = allProcessingJobs[0];
      
      // Reset all other processing jobs back to queued
      for (let i = 1; i < allProcessingJobs.length; i++) {
        await supabase
          .from("bulk_operation_queue")
          .update({ status: "queued", started_at: null })
          .eq("id", allProcessingJobs[i].id);
        console.log(`Reset extra processing job ${allProcessingJobs[i].id} to queued`);
      }
    }

    // Check for stalled jobs (processing for more than 10 minutes with no progress)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stalledJobs } = await supabase
      .from("bulk_operation_queue")
      .select("id, operation_type, processed_items, started_at")
      .eq("status", "processing")
      .lt("started_at", tenMinutesAgo);

    if (stalledJobs && stalledJobs.length > 0) {
      console.log(`Found ${stalledJobs.length} stalled jobs, resetting to queued...`);
      for (const stalledJob of stalledJobs) {
        await supabase
          .from("bulk_operation_queue")
          .update({ status: "queued", started_at: null })
          .eq("id", stalledJob.id);
        console.log(`Reset stalled job ${stalledJob.id}`);
      }
    }

    // Now get the job to process: oldest queued job OR the one processing job
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

    // If no queued jobs, check for THE processing job
    let job = queuedJobs?.[0];
    
    if (!job) {
      const { data: processingJobs } = await supabase
        .from("bulk_operation_queue")
        .select("*")
        .eq("status", "processing")
        .order("started_at", { ascending: true })
        .limit(1);
      
      job = processingJobs?.[0];
    }

    if (!job) {
      console.log("No queued or processing jobs found");
      return new Response(
        JSON.stringify({ message: "No queued jobs to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing job ${job.id}: ${job.operation_type}, status: ${job.status}, progress: ${job.processed_items || 0}/${job.total_items || '?'}`);

    // CRITICAL: Before marking a queued job as processing, verify NO other job is currently processing
    if (job.status === 'queued') {
      const { data: currentlyProcessing } = await supabase
        .from("bulk_operation_queue")
        .select("id")
        .eq("status", "processing")
        .limit(1);

      if (currentlyProcessing && currentlyProcessing.length > 0) {
        console.log(`Another job is already processing (${currentlyProcessing[0].id}). Skipping this job.`);
        return new Response(
          JSON.stringify({ message: "Another job is already being processed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Safe to mark as processing
      await supabase
        .from("bulk_operation_queue")
        .update({ 
          status: "processing", 
          started_at: new Date().toISOString() 
        })
        .eq("id", job.id);
      
      console.log(`Marked job ${job.id} as processing`);
    }

    try {
      // Process based on operation type
      if (job.operation_type === "add_internal_links") {
        await processInternalLinks(supabase, job, lovableApiKey);
      } else if (job.operation_type === "generate_ai_comments") {
        await processAIComments(supabase, job, lovableApiKey);
      } else if (job.operation_type === "generate_seo") {
        await processSEOGeneration(supabase, job, lovableApiKey);
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
      console.error(`Job ${job.id} error:`, jobError);
      
      // Special case: if it's a continue processing signal, leave job in processing state
      if (jobError.message === 'CONTINUE_PROCESSING') {
        console.log(`Job ${job.id} continues processing in next run`);
        // Keep status as 'processing' - do nothing
      } else {
        // Mark job as failed for real errors
        await supabase
          .from("bulk_operation_queue")
          .update({ 
            status: "failed",
            error_message: jobError.message || "Unknown error",
            completed_at: new Date().toISOString()
          })
          .eq("id", job.id);
      }
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
  const ARTICLES_PER_RUN = 15; // Process 15 articles per invocation to avoid timeout
  const processedSoFar = job.processed_items || 0;

  console.log(`Processing internal links: ${processedSoFar}/${articleIds.length} articles completed`);

  // Update total items on first run
  if (processedSoFar === 0) {
    await supabase
      .from("bulk_operation_queue")
      .update({ total_items: articleIds.length })
      .eq("id", job.id);
  }

  // Fetch all published articles for reference with category slugs
  const { data: allArticles, error: allArticlesError } = await supabase
    .from("articles")
    .select(`
      id, 
      title, 
      slug, 
      excerpt,
      primary_category_id,
      categories!articles_primary_category_id_fkey (slug)
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100);

  if (allArticlesError) throw allArticlesError;

  const articlesList = allArticles?.map((a: any) => {
    const categorySlug = a.categories?.slug || 'news';
    return `- ${a.title} (/${categorySlug}/${a.slug})`;
  }).join("\n") || "";

  // Get existing results or initialize
  const results: any[] = job.results || [];
  let processedCount = processedSoFar;
  let successCount = job.successful_items || 0;
  let failedCount = job.failed_items || 0;

  // Process only the next chunk of articles
  const startIdx = processedSoFar;
  const endIdx = Math.min(startIdx + ARTICLES_PER_RUN, articleIds.length);
  const articlesToProcess = articleIds.slice(startIdx, endIdx);

  console.log(`Processing articles ${startIdx + 1} to ${endIdx} of ${articleIds.length}`);

  for (const articleId of articlesToProcess) {
      try {
        // Fetch the article with category
        const { data: article, error: articleError } = await supabase
          .from("articles")
          .select(`
            id, 
            title, 
            slug, 
            content, 
            excerpt,
            primary_category_id,
            categories!articles_primary_category_id_fkey (slug)
          `)
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

        // Check if article already has properly formatted links
        const categorySlug = article.categories?.slug || 'news';
        const hasInternalLinks = /\[([^\]]+)\]\((\/[a-z-]+\/[a-z0-9-]+)\)/.test(contentString);
        const hasExternalLinks = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/.test(contentString);

        if (hasInternalLinks && hasExternalLinks && !options.retry) {
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
- Internal links MUST use the FULL PATH format from the list: [text](/category-slug/article-slug)
- NEVER use just /article-slug - always include the category: /category-slug/article-slug
- Only modify the content to add links - preserve all existing text, formatting, headings, paragraphs
- Make anchor text natural and contextual
- Place links where they genuinely add value

AVAILABLE ARTICLES (use the EXACT paths shown):
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

  // Check if all articles have been processed
  if (processedCount >= articleIds.length) {
    console.log(`All articles processed: ${successCount} successful, ${failedCount} failed`);
    // Job will be marked as completed by the main handler
  } else {
    console.log(`Chunk complete: ${processedCount}/${articleIds.length} articles processed`);
    // Keep job in processing state - it will be picked up again
    throw new Error('CONTINUE_PROCESSING'); // Special error to indicate job should continue
  }
}

async function processAIComments(supabase: any, job: any, lovableApiKey: string) {
  const articleIds = job.article_ids as string[];
  const options = job.options || {};
  const ARTICLES_PER_RUN = 5; // Process 5 articles per invocation (each article = 3-5 AI calls)
  const processedSoFar = job.processed_items || 0;

  console.log(`Processing AI comments: ${processedSoFar}/${articleIds.length} articles completed`);

  // Update total items on first run
  if (processedSoFar === 0) {
    await supabase
      .from("bulk_operation_queue")
      .update({ total_items: articleIds.length })
      .eq("id", job.id);
  }

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

  // Get existing results or initialize
  const results: any[] = job.results || [];
  let processedCount = processedSoFar;
  let successCount = job.successful_items || 0;
  let failedCount = job.failed_items || 0;

  // Process only the next chunk of articles
  const startIdx = processedSoFar;
  const endIdx = Math.min(startIdx + ARTICLES_PER_RUN, articleIds.length);
  const articlesToProcess = articleIds.slice(startIdx, endIdx);

  console.log(`Processing articles ${startIdx + 1} to ${endIdx} of ${articleIds.length}`);

  for (const articleId of articlesToProcess) {
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

  // Check if all articles have been processed
  if (processedCount >= articleIds.length) {
    console.log(`All articles processed: ${successCount} successful, ${failedCount} failed`);
    // Job will be marked as completed by the main handler
  } else {
    console.log(`Chunk complete: ${processedCount}/${articleIds.length} articles processed`);
    // Keep job in processing state - it will be picked up again
    throw new Error('CONTINUE_PROCESSING'); // Special error to indicate job should continue
  }
}

async function processSEOGeneration(supabase: any, job: any, lovableApiKey: string) {
  const articleIds = job.article_ids as string[];
  const ARTICLES_PER_RUN = 30; // Process 30 articles per invocation
  const processedSoFar = job.processed_items || 0;

  console.log(`Processing SEO generation: ${processedSoFar}/${articleIds.length} articles completed`);

  // Update total items on first run
  if (processedSoFar === 0) {
    await supabase
      .from("bulk_operation_queue")
      .update({ total_items: articleIds.length })
      .eq("id", job.id);
  }

  // Get existing results or initialize
  const results: any[] = job.results || [];
  let processedCount = processedSoFar;
  let successCount = job.successful_items || 0;
  let failedCount = job.failed_items || 0;

  // Process only the next chunk of articles
  const startIdx = processedSoFar;
  const endIdx = Math.min(startIdx + ARTICLES_PER_RUN, articleIds.length);
  const articlesToProcess = articleIds.slice(startIdx, endIdx);

  console.log(`Processing articles ${startIdx + 1} to ${endIdx} of ${articleIds.length}`);

  for (const articleId of articlesToProcess) {
    try {
      // Fetch the article
      const { data: article, error: articleError } = await supabase
        .from("articles")
        .select("id, title, content, excerpt")
        .eq("id", articleId)
        .single();

      if (articleError) throw articleError;
      if (!article) continue;

      // Extract text content
      let textContent = "";
      if (typeof article.content === "string") {
        textContent = article.content;
      } else if (Array.isArray(article.content)) {
        textContent = article.content.map((block: any) => block.content || "").join(" ");
      }

      const fullText = `${article.title}\n\n${article.excerpt || ""}\n\n${textContent}`.substring(0, 3000);

      // Generate SEO metadata
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
              content: `You are an expert SEO specialist. Generate SEO metadata for articles about AI, technology, and innovation in Asia-Pacific. Return ONLY valid JSON with these exact fields:
{
  "meta_title": "60 character HTML title tag with main keyword",
  "seo_title": "60 character optimized title with main keyword",
  "focus_keyphrase": "main keyword phrase (2-4 words)",
  "keyphrase_synonyms": "synonym1, synonym2, synonym3",
  "meta_description": "155 character compelling description with keyword"
}`,
            },
            {
              role: "user",
              content: `Generate SEO metadata for this article:\n\n${fullText}`,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI error for article ${article.id}:`, aiResponse.status);
        throw new Error(`AI generation failed: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const generatedText = aiData.choices?.[0]?.message?.content;

      if (!generatedText) {
        throw new Error("No content generated from AI");
      }

      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid JSON response from AI");
      }

      const seoData = JSON.parse(jsonMatch[0]);

      // Update article
      const { error: updateError } = await supabase
        .from("articles")
        .update({
          meta_title: seoData.meta_title,
          seo_title: seoData.seo_title,
          focus_keyphrase: seoData.focus_keyphrase,
          keyphrase_synonyms: seoData.keyphrase_synonyms,
          meta_description: seoData.meta_description || article.excerpt,
        })
        .eq("id", article.id);

      if (updateError) throw updateError;

      results.push({
        articleId: article.id,
        title: article.title,
        status: "success"
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

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 500));

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

  // Check if all articles have been processed
  if (processedCount >= articleIds.length) {
    console.log(`All SEO generation complete: ${successCount} successful, ${failedCount} failed`);
  } else {
    console.log(`Chunk complete: ${processedCount}/${articleIds.length} articles processed`);
    throw new Error('CONTINUE_PROCESSING');
  }
}

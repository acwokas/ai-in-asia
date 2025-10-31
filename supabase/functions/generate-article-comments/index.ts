import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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

    // Validate input
    const requestSchema = z.object({
      articleId: z.string().uuid(),
      batchMode: z.boolean().optional().default(false)
    });

    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { articleId, batchMode } = validationResult.data;

    // Get article details with full content
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, excerpt, content, published_at")
      .eq("id", articleId)
      .single();
    
    if (articleError || !article) {
      throw new Error("Article not found");
    }
    
    // Extract meaningful content snippet (first 500 chars of content for context)
    // Ensure content is a string before processing
    let contentPreview = article.excerpt || article.title;
    if (article.content && typeof article.content === 'string') {
      contentPreview = article.content.replace(/<[^>]*>/g, '').substring(0, 500);
    }

    // Check if article already has comments
    const { data: existingComments } = await supabase
      .from("comments")
      .select("id")
      .eq("article_id", articleId);

    if (existingComments && existingComments.length > 0 && !batchMode) {
      return new Response(
        JSON.stringify({ message: "Article already has comments" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate random number of comments (3-6)
    const numComments = Math.floor(Math.random() * 4) + 3;
    
    const now = new Date();
    const publishedAt = new Date(article.published_at);
    const daysSincePublished = Math.max(0, (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Create pending comment generation jobs with scheduled times
    const pendingComments = [];
    
    for (let i = 0; i < numComments; i++) {
      // Distribute comments over time relative to publish date
      // 40% within first 3 days, 30% between 3-30 days, 30% after 30 days
      const rand = Math.random();
      let daysAfterPublish;
      
      if (rand < 0.4) {
        // Within first 3 days
        daysAfterPublish = Math.random() * 3;
      } else if (rand < 0.7) {
        // Between 3-30 days
        daysAfterPublish = 3 + (Math.random() * 27);
      } else {
        // After 30 days
        daysAfterPublish = 30 + (Math.random() * 30);
      }
      
      let scheduledFor = new Date(publishedAt.getTime() + daysAfterPublish * 24 * 60 * 60 * 1000);
      
      // For articles published recently, schedule future comments
      // For older articles where the scheduled time is in the past, process immediately
      if (scheduledFor < now && daysSincePublished < 3) {
        // Recent article - push to future (within next 7-30 days)
        scheduledFor = new Date(now.getTime() + (7 + Math.random() * 23) * 24 * 60 * 60 * 1000);
      } else if (scheduledFor > now) {
        // Future date - keep as is
      } else {
        // Past date for old article - process soon (within next hour)
        scheduledFor = new Date(now.getTime() + Math.random() * 60 * 60 * 1000);
      }
      
      // Calculate the historical "posted" date (when comment should appear to be from)
      const historicalDate = new Date(publishedAt.getTime() + daysAfterPublish * 24 * 60 * 60 * 1000);
      
      pendingComments.push({
        article_id: articleId,
        scheduled_for: scheduledFor.toISOString(),
        comment_date: historicalDate.toISOString(),
        comment_prompt: `You're writing ONE authentic reader comment on this article. Be natural and AVOID repeating patterns other commenters might use.

ARTICLE: "${article.title}"
CONTENT: ${contentPreview}

CRITICAL - NO TWO COMMENTS SHOULD SOUND ALIKE:

WHAT TO COMMENT ON (pick ONE randomly - BE SPECIFIC):
1. A surprising statistic or number mentioned
2. The main person/company featured
3. The timeline or date mentioned
4. A quote that stood out
5. The implications or future impact
6. Something missing or unexplained
7. Personal connection ("my company does this", "i saw this happen")
8. Regional angle ("how does this affect asia", "different in singapore vs us")
9. A side detail most would miss
10. Comparison to similar news/events

START YOUR COMMENT DIFFERENTLY (never start with the same phrase twice):
- "honestly..." / "tbh..." / "ngl..." / "wait..."
- "so..." / "lol..." / "damn..." / "huh..."
- Direct reaction: "this changes everything" / "finally" / "not surprised"
- Question: "how is..." / "why would..." / "who's..."
- Personal: "i work in this and..." / "my friend said..."
- Opinion jump: "seems like..." / "feels like..." / "looks like..."
- No start, just dive in: "big deal for..." / "interesting timing..."

LENGTH VARIETY (be random):
- VERY SHORT (20%): 3-10 words only. "wild", "makes sense", "about time", "not buying it"
- SHORT (30%): 10-20 words. Quick reaction.
- MEDIUM (30%): 20-40 words. 1-2 sentences.
- LONG (20%): 40-80 words. Multiple thoughts or explanation.

TONE MIX (pick ONE clearly):
✓ Excited: "this is huge!", "omg finally"
✓ Analytical: "makes sense bc...", "the key thing is..."
✓ Skeptical: "feels overhyped", "idk about this", "seems sketchy"
✓ Critical: "but what about...", "they're ignoring...", "wrong bc..."
✓ Questioning: "how does this work?", "source?", "is this real?"
✓ Casual: "cool", "interesting", "neat"
✓ Unimpressed: "meh", "nothing new", "old news"
✓ Surprised: "wait what", "didnt see coming", "no way"
✓ Personal experience: "i tried this", "similar thing happened when..."
✓ Practical concern: "what about the cost", "timeline seems off"

FORBIDDEN (makes you sound like AI):
- NEVER start multiple comments the same way
- NO: "$X is a lot of money, wonder about..." / "$X is crazy, makes you wonder..."
- NO: "fascinating", "intriguing", "compelling", "thought-provoking"
- NO: "This article", "The piece", "The author"
- NO: starting every sentence similarly
- NO: using the same phrase structure as other comments
- NO: generic reactions without specifics from article

WRITING LIKE REAL PEOPLE:
- lowercase starts common
- dropped letters: "gonna", "wanna", "kinda", "sorta"  
- common abbreviations: tbh, imo, ngl, btw, tho, bc, idk, prob, def
- real typos sometimes: "teh", "recieve", "your/youre", "its/it's"
- fragments ok: "Wow.", "Interesting.", "Not bad."
- casual speech: "i mean", "like", "literally", "basically", "honestly"
- ellipses for trailing thought: "seems like..."
- punctuation varies (some use it, some don't)

EXAMPLES OF GOOD VARIETY:

Example 1 (surprised, short): "wait the timeline on this seems crazy fast. 2 years?"
Example 2 (skeptical, medium): "idk feels like we've heard these promises before. what makes this different from the last 5 attempts"
Example 3 (personal, long): "work in this space and honestly the thing everyone's missing is the regulatory side. saw similar rollout in singapore and took 3x longer than announced bc of compliance issues nobody thought about"
Example 4 (analytical, medium): "key thing is whether they can scale it. proof of concept is one thing but production is totally different"
Example 5 (casual, very short): "about time"
Example 6 (critical, medium): "but theyre not addressing the cost issue at all. who's paying for this lol"
Example 7 (questioning, short): "source on those numbers? seem high"
Example 8 (unimpressed, short): "old news. this was announced months ago"

PICK DIVERSE NAMES (mix regions):
- Southeast Asia: Wei, Siti, Boon, Devi, Khaled  
- North Asia: Chen, Yuki, Park, Li, Tanaka
- South Asia: Raj, Priya, Arjun, Neha, Ravi
- Western: Alex, Jordan, Sam, Riley, Morgan
- Middle East: Omar, Layla, Yusuf, Zara
- Africa: Kofi, Amara, Tendai

Format EXACTLY as:
Name: [pick name]
Comment: [unique reaction - NO PATTERN REPETITION]`
      });
    }
    
    // Insert pending comment jobs
    const { error: insertError } = await supabase
      .from('pending_comments')
      .insert(pendingComments);
    
    if (insertError) {
      console.error('Error creating pending comments:', insertError);
      throw insertError;
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        pendingComments: pendingComments.length,
        message: `${pendingComments.length} comments scheduled for generation`,
        articleId: articleId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

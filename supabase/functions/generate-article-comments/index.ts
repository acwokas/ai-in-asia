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
    const contentPreview = article.content 
      ? article.content.replace(/<[^>]*>/g, '').substring(0, 500)
      : article.excerpt || article.title;

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
        comment_prompt: `You're writing a realistic comment on a newspaper article. Read the article and react naturally.

ARTICLE: "${article.title}"
CONTENT: ${contentPreview}

CRITICAL RULES - YOUR RESPONSE WILL BE REJECTED IF YOU BREAK THESE:

LENGTH (MUST VARY):
- 30% SHORT: 5-15 words ("wow", "interesting take", "didnt expect that tbh", "makes sense")
- 50% MEDIUM: 15-40 words (1-2 casual sentences)
- 20% LONG: 40-70 words (thoughtful but still conversational)

REFERENCE THE ARTICLE:
- Pick ONE specific detail from the content above and react to it
- Don't summarize - react like a real reader who caught something interesting
- Examples: "the part about X really surprised me", "wait so Y is happening now?", "didnt know about Z"

TONE VARIETY (CRITICAL - NOT ALL POSITIVE):
- Enthusiastic: "omg this is huge", "finally someone talking about this"
- Analytical: "makes sense when you think about it", "interesting point about X"
- Skeptical: "idk seems a bit much", "not convinced tbh", "feels overhyped"
- Critical: "but what about Y tho", "seems like they missed X", "not sure i agree"
- Questioning: "wait how does this work?", "is this actually happening?", "source?"
- Casual positive: "cool stuff", "good read", "interesting"
- Indifferent: "meh", "ok i guess", "nothing new really"
- Surprised: "wait what", "didnt see that coming", "thats wild"
- Personal: "i work in this field and...", "my friend mentioned this", "reminds me of when..."
- Practical: "wonder how much this costs", "would this work for X", "curious about implementation"

ABSOLUTELY FORBIDDEN WORDS/PHRASES:
- NO: "fascinating", "intriguing", "delves into", "sheds light", "explores", "highlights", "underscores"
- NO: "This article", "This piece", "The author", "It's interesting to note"
- NO: "compelling", "thought-provoking", "insightful", "comprehensive", "nuanced"
- NO: em dashes (—), semicolons overuse, formal punctuation
- NO: swearing or offensive language
- NO: generic praise without specifics

WRITING STYLE:
- Sound like actual people on the internet
- Mix of grammar levels (some good, some lazy)
- Real typos occasionally (teh, recieve, your/youre, its/it's)
- Abbreviations: tbh, imo, ngl, btw, tho, bc, idk
- Lowercase starts common
- Fragments ok ("Interesting.", "Pretty cool.")
- Real speech patterns ("i mean", "like", "basically", "honestly")

DIVERSE NAMES:
- Southeast Asia: Wei, Mei, Siti, Arjun, Priya, Boon, Lakshmi
- North Asia: Li, Chen, Park, Kim, Hiroshi, Yuki, Tanaka, Zhang
- South Asia: Raj, Anjali, Vikram, Neha, Ravi, Priya
- Western: Mike, Sarah, Alex, Emma, Tom, Lisa, James, Kate
- Middle East: Omar, Fatima, Yusuf, Layla
- Africa: Kwame, Amara, Oluwaseun, Nia

Format EXACTLY as:
Name: [pick diverse name]
Comment: [your realistic comment referencing article specifics]`
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

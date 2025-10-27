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

    // Get article details
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, excerpt, content, published_at")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      throw new Error("Article not found");
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
      
      pendingComments.push({
        article_id: articleId,
        scheduled_for: scheduledFor.toISOString(),
        comment_prompt: `Generate a realistic, casual comment for this article titled "${article.title}". 
The article is about: ${article.excerpt || article.title}

CRITICAL RULES:
- NEVER use em dashes (—) or hyphens for emphasis
- AVOID AI clichés like: "rapidly evolving", "game changer", "cutting-edge", "revolutionize", "paradigm shift", "truly exciting", "promising"
- Write naturally like a real person commenting online - casual, sometimes skeptical, sometimes enthusiastic
- Include occasional typos, abbreviations (tbh, imo, ngl, btw, lol, lmao), slang, lowercase starts
- VARY LENGTH DRAMATICALLY: 30% should be super short (5-15 words), 50% medium (15-40 words), 20% longer (40-70 words)
- Vary the tone dramatically: some excited, some critical, some questioning, some brief reactions
- Be specific to the topic when possible
- Use diverse names from: Southeast Asia (Wei, Mei, Siti, Arjun, Priya, Hiroshi, Yuki, Nguyen, Anh), North Asia (Li, Chen, Park, Kim, Tanaka, Sato), India (Raj, Anjali, Vikram, Neha), and Western (Mike, Sarah, Alex, Emma, Tom, Lisa)

Format your response as:
Name: [realistic diverse name]
Comment: [your casual comment with natural imperfections and varied length]`
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

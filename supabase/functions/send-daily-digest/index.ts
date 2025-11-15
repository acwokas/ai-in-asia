import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get users with daily digest enabled
    const { data: users, error: usersError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("daily_digest", true);

    if (usersError) throw usersError;

    // Get top articles from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select(`
        id,
        title,
        slug,
        excerpt,
        view_count,
        categories:primary_category_id (name, slug)
      `)
      .eq("status", "published")
      .gte("published_at", yesterday.toISOString())
      .order("view_count", { ascending: false })
      .limit(5);

    if (articlesError) throw articlesError;

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No articles to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email HTML
    const articlesHtml = articles
      .map(
        (article: any) => `
        <div style="margin-bottom: 20px; padding: 15px; border-left: 3px solid #0f62fe;">
          <h3 style="margin: 0 0 8px 0;">
            <a href="https://aiinasia.com/${article.categories?.slug}/${article.slug}" 
               style="color: #0f62fe; text-decoration: none;">
              ${article.title}
            </a>
          </h3>
          <p style="margin: 0; color: #666; font-size: 14px;">
            ${article.excerpt || ""}
          </p>
        </div>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f62fe;">AI in ASIA Daily Digest</h1>
            <p style="color: #666;">Top AI stories from the past 24 hours</p>
          </div>
          
          ${articlesHtml}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
            <p>You're receiving this because you enabled daily digest notifications.</p>
            <p>
              <a href="https://aiinasia.com" style="color: #0f62fe;">Visit AI in ASIA</a> | 
              <a href="https://aiinasia.com/profile" style="color: #0f62fe;">Manage Preferences</a>
            </p>
          </div>
        </body>
      </html>
    `;

    let sentCount = 0;

    // Send emails via Resend
    if (resendApiKey) {
      for (const userPref of users) {
        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userPref.user_id)
          .single();

        if (!profile) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(
          userPref.user_id
        );

        if (!authUser?.user?.email) continue;

        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "AI in ASIA <digest@aiinasia.com>",
              to: authUser.user.email,
              subject: `Your Daily AI Digest - ${new Date().toLocaleDateString()}`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            sentCount++;
          }
        } catch (error) {
          console.error(`Failed to send email to ${authUser.user.email}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Daily digest sent",
        sent: sentCount,
        total: users.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

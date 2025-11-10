import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArticleWithFreshness {
  id: string;
  title: string;
  slug: string;
  published_at: string;
  freshnessScore: number;
  articleAgeMonths: number;
  externalLinksCount: number;
}

const calculateFreshnessScore = (article: any) => {
  const content = typeof article.content === 'string' 
    ? article.content 
    : JSON.stringify(article.content);
  
  // Extract external links
  const externalLinks = Array.from(
    content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g)
  );
  
  // Calculate article age
  const publishedDate = new Date(article.published_at);
  const now = new Date();
  const monthsOld = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  
  // Calculate freshness score (0-100, higher is better)
  let freshnessScore = 100;
  
  // Deduct points for article age
  if (monthsOld > 18) freshnessScore -= 40;
  else if (monthsOld > 12) freshnessScore -= 30;
  else if (monthsOld > 6) freshnessScore -= 20;
  else if (monthsOld > 3) freshnessScore -= 10;
  
  // Deduct points for lack of external links
  if (externalLinks.length === 0) freshnessScore -= 20;
  else if (externalLinks.length < 2) freshnessScore -= 10;
  
  // Bonus points for recent updates
  const lastUpdated = new Date(article.updated_at);
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceUpdate < 30) freshnessScore += 10;
  
  return {
    score: freshnessScore,
    monthsOld,
    externalLinksCount: externalLinks.length
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!resendApiKey) {
      throw new Error('Missing Resend API key');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    console.log('Fetching published articles...');

    // Fetch all published articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, slug, published_at, updated_at, content')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (articlesError) {
      console.error('Error fetching articles:', articlesError);
      throw articlesError;
    }

    console.log(`Analyzing ${articles?.length || 0} articles...`);

    // Calculate freshness scores and filter articles below threshold
    const THRESHOLD = 60; // Articles with score < 60 need attention
    const staleArticles: ArticleWithFreshness[] = [];
    const criticalArticles: ArticleWithFreshness[] = [];

    articles?.forEach(article => {
      const { score, monthsOld, externalLinksCount } = calculateFreshnessScore(article);
      
      if (score < THRESHOLD) {
        const articleData = {
          id: article.id,
          title: article.title,
          slug: article.slug,
          published_at: article.published_at,
          freshnessScore: score,
          articleAgeMonths: monthsOld,
          externalLinksCount
        };

        if (score < 40) {
          criticalArticles.push(articleData);
        } else {
          staleArticles.push(articleData);
        }
      }
    });

    console.log(`Found ${criticalArticles.length} critical and ${staleArticles.length} stale articles`);

    // If no articles need attention, log and exit
    if (criticalArticles.length === 0 && staleArticles.length === 0) {
      console.log('No articles below freshness threshold. No emails sent.');
      return new Response(
        JSON.stringify({ message: 'No stale articles found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ message: 'No admin users to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin emails
    const adminIds = adminRoles.map(r => r.user_id);
    const { data: adminUsers, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching admin users:', usersError);
      throw usersError;
    }

    const adminEmails = adminUsers.users
      .filter(user => adminIds.includes(user.id))
      .map(user => user.email)
      .filter(email => email);

    console.log(`Sending alerts to ${adminEmails.length} admins`);

    // Generate email HTML
    const generateArticleList = (articles: ArticleWithFreshness[], level: string) => {
      if (articles.length === 0) return '';
      
      const color = level === 'critical' ? '#dc2626' : '#f59e0b';
      const rows = articles.map(article => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${article.title}</strong><br/>
            <span style="font-size: 12px; color: #6b7280;">
              Age: ${article.articleAgeMonths} months | 
              Links: ${article.externalLinksCount} | 
              Score: <strong style="color: ${color};">${article.freshnessScore}</strong>
            </span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <a href="${supabaseUrl.replace('https://pbmtnvxywplgpldmlygv.supabase.co', 'https://aiinasia.com')}/article/${article.slug}" 
               style="color: #3b82f6; text-decoration: none;">View</a> | 
            <a href="${supabaseUrl.replace('https://pbmtnvxywplgpldmlygv.supabase.co', 'https://aiinasia.com')}/editor?id=${article.id}" 
               style="color: #10b981; text-decoration: none;">Edit</a>
          </td>
        </tr>
      `).join('');

      return `
        <h2 style="color: ${color}; margin-top: 24px; margin-bottom: 12px;">
          ${level === 'critical' ? '🚨' : '⚠️'} ${level === 'critical' ? 'Critical' : 'Stale'} Content (${articles.length})
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${rows}
        </table>
      `;
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Content Freshness Alert</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px;">📊 Content Freshness Alert</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Articles requiring your attention</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-top: 0;">
              Hello Admin,
            </p>
            
            <p>
              Our automated content freshness monitor has identified <strong>${criticalArticles.length + staleArticles.length}</strong> 
              articles that need updating. Articles are scored on age, external links, and recent updates.
            </p>

            ${generateArticleList(criticalArticles, 'critical')}
            ${generateArticleList(staleArticles, 'stale')}

            <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin-top: 24px;">
              <h3 style="margin-top: 0; color: #374151;">📈 Scoring System</h3>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li><strong>Fresh (80-100):</strong> Recent and well-referenced</li>
                <li><strong>Needs Review (60-79):</strong> Minor updates recommended</li>
                <li><strong>Stale (40-59):</strong> Should be updated soon</li>
                <li><strong>Critical (&lt;40):</strong> Urgent updates required</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <a href="${supabaseUrl.replace('https://pbmtnvxywplgpldmlygv.supabase.co', 'https://aiinasia.com')}/admin/content-freshness" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Full Freshness Report
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              This is an automated alert from your Content Freshness Tracker. 
              To adjust alert settings, visit the admin dashboard.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send emails to all admins
    for (const email of adminEmails) {
      if (!email) continue; // Skip if email is undefined
      
      try {
        await resend.emails.send({
          from: 'AI in ASIA <onboarding@resend.dev>',
          to: [email],
          subject: `🔔 Content Alert: ${criticalArticles.length + staleArticles.length} Articles Need Updating`,
          html: emailHtml,
        });
        console.log(`Email sent successfully to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent alerts to ${adminEmails.length} admins`,
        stats: {
          critical: criticalArticles.length,
          stale: staleArticles.length,
          total: criticalArticles.length + staleArticles.length
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in check-content-freshness function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

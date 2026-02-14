import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const SITE_URL = 'https://aiinasia.com';

// Send 3-Before-9 briefing to subscribers
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Sending 3-Before-9 briefing...');

    // Check if it's a weekday
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return new Response(
        JSON.stringify({ message: 'Weekend - briefing not sent', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const todayStr = today.toISOString().split('T')[0];

    // Find today's briefing article
    const { data: briefing } = await supabase
      .from('articles')
      .select('*, top_list_items, tldr_snapshot')
      .eq('article_type', 'three_before_nine')
      .gte('created_at', todayStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!briefing) {
      console.log('No briefing found for today');
      return new Response(
        JSON.stringify({ message: 'No briefing to send', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active briefing subscribers
    const { data: subscribers } = await supabase
      .from('briefing_subscriptions')
      .select('email')
      .eq('briefing_type', 'three_before_nine')
      .eq('is_active', true);

    if (!subscribers || subscribers.length === 0) {
      console.log('No active subscribers');
      return new Response(
        JSON.stringify({ message: 'No subscribers', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending to ${subscribers.length} subscribers`);

    const dateFormatted = today.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const topListItems = briefing.top_list_items as any[] || [];
    const tldrSnapshot = briefing.tldr_snapshot as any || {};

    // Build email HTML
    const signalsHtml = topListItems.map((item: any, index: number) => `
      <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: ${index < topListItems.length - 1 ? '1px solid #f0f0f0' : 'none'};">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          <div style="background: linear-gradient(135deg, #d4af37, #b8860b); color: #000; font-weight: 700; font-size: 18px; width: 32px; height: 32px; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${item.rank}
          </div>
          <div style="flex: 1;">
            <h3 style="font-size: 17px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.3;">
              <a href="${SITE_URL}${item.link}" style="color: #1a1a1a; text-decoration: none;">${item.name}</a>
            </h3>
            <p style="font-size: 15px; color: #555555; margin: 0; line-height: 1.6;">${item.description}</p>
          </div>
        </div>
      </div>
    `).join('');

    const tldrBullets = (tldrSnapshot.bullets || []).map((bullet: string) => 
      `<li style="margin-bottom: 8px; color: #333;">${bullet}</li>`
    ).join('');

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3-Before-9</title>
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a;">
  <div style="background: #1a1a1a; padding: 32px; border-radius: 8px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #d4af37;">
      <h1 style="font-size: 32px; font-weight: 700; color: #d4af37; margin: 0 0 8px 0; letter-spacing: -1px;">3-Before-9</h1>
      <p style="font-size: 14px; color: #888888; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${dateFormatted}</p>
      <p style="font-size: 15px; color: #aaaaaa; margin: 8px 0 0 0; font-style: italic;">Your morning AI briefing from AI in ASIA</p>
    </div>

    <!-- TL;DR -->
    ${tldrBullets ? `
    <div style="background: #252525; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
      <h2 style="font-size: 14px; font-weight: 600; color: #d4af37; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">TL;DR</h2>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px;">
        ${tldrBullets}
      </ul>
    </div>
    ` : ''}

    <!-- Signals -->
    <div style="background: #ffffff; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
      <h2 style="font-size: 14px; font-weight: 600; color: #666; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 0.5px;">Today's Signals</h2>
      ${signalsHtml}
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #333;">
      <p style="font-size: 13px; color: #888888; margin: 0 0 8px 0;">
        <a href="${SITE_URL}" style="color: #d4af37; text-decoration: none;">AI in ASIA</a>
      </p>
      <p style="font-size: 12px; color: #666666; margin: 0;">
        <a href="${SITE_URL}/unsubscribe?type=briefing" style="color: #666666; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    let sentCount = 0;
    let failedCount = 0;

    for (const subscriber of subscribers) {
      try {
        await resend.emails.send({
          from: 'AI in ASIA <contact@aiinasia.com>',
          to: subscriber.email,
          subject: `3-Before-9 · ${dateFormatted}`,
          html: emailHtml,
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        failedCount++;
      }

      // Rate limiting
      if (sentCount % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Log automation
    await supabase.from('newsletter_automation_log').insert({
      job_name: 'send-three-before-nine',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      details: { sent: sentCount, failed: failedCount, article_id: briefing.id },
    });

    console.log(`3-Before-9 sent: ${sentCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: subscribers.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error sending 3-Before-9:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const SITE_URL = 'https://aiinasia.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    console.log(`[streak-reminders] Checking for streaks at risk. Today: ${today}, Looking for last_read: ${yesterday}`);

    // Find users with streak >= 3 who read yesterday but not today
    const { data: atRiskStreaks, error: streakError } = await supabase
      .from('reading_streaks')
      .select('user_id, current_streak, streak_reminder_sent_at')
      .gte('current_streak', 3)
      .eq('last_read_date', yesterday);

    if (streakError) throw streakError;

    if (!atRiskStreaks?.length) {
      console.log('[streak-reminders] No at-risk streaks found');
      return new Response(
        JSON.stringify({ message: 'No streaks at risk', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out users who already received a reminder for this streak period
    const usersToRemind = atRiskStreaks.filter(s => {
      if (!s.streak_reminder_sent_at) return true;
      const sentDate = new Date(s.streak_reminder_sent_at).toISOString().split('T')[0];
      return sentDate !== today;
    });

    console.log(`[streak-reminders] ${usersToRemind.length} users to remind out of ${atRiskStreaks.length} at risk`);

    if (!usersToRemind.length) {
      return new Response(
        JSON.stringify({ message: 'All reminders already sent today', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user emails via auth admin API
    const userIds = usersToRemind.map(s => s.user_id);
    const emailMap = new Map<string, string>();

    for (const userId of userIds) {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(userId);
        if (user?.email) emailMap.set(userId, user.email);
      } catch (e) {
        console.warn(`[streak-reminders] Could not fetch user ${userId}:`, e);
      }
    }

    // Find today's 3B9 for the CTA link
    const { data: todayBriefing } = await supabase
      .from('articles')
      .select('slug, categories:primary_category_id(slug)')
      .eq('article_type', 'three_before_nine')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const ctaUrl = todayBriefing
      ? `${SITE_URL}/${(todayBriefing as any).categories?.slug || 'news'}/${todayBriefing.slug}`
      : SITE_URL;
    const ctaLabel = todayBriefing ? "Read Today's Briefing" : 'Read Something New';

    let sent = 0;
    let failed = 0;

    for (const streak of usersToRemind) {
      const email = emailMap.get(streak.user_id);
      if (!email) continue;

      const unsubUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(email)}&type=streak-reminders`;

      try {
        await resend.emails.send({
          from: 'AI in ASIA <hello@aiinasia.com>',
          to: [email],
          subject: `🔥 Don't lose your ${streak.current_streak}-day reading streak!`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <tr><td>
      <div style="background:#0f172a;border-radius:12px;padding:32px;color:#fff;">
        <p style="font-size:32px;margin:0 0 16px;">🔥</p>
        <h1 style="font-size:20px;margin:0 0 12px;color:#fff;">
          Your ${streak.current_streak}-day streak is at risk
        </h1>
        <p style="font-size:15px;color:#94a3b8;line-height:1.6;margin:0 0 24px;">
          You've been reading AI in ASIA for <strong style="color:#fbbf24;">${streak.current_streak} days straight</strong> — impressive! Read just one article today to keep it alive.
        </p>
        <a href="${ctaUrl}" style="display:inline-block;background:#f59e0b;color:#0f172a;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
          ${ctaLabel} →
        </a>
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:24px;">
        <a href="${unsubUrl}" style="color:#94a3b8;">Unsubscribe from streak reminders</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`,
        });

        // Mark reminder as sent
        await supabase
          .from('reading_streaks')
          .update({ streak_reminder_sent_at: new Date().toISOString() })
          .eq('user_id', streak.user_id);

        sent++;
        console.log(`[streak-reminders] Sent to ${email} (streak: ${streak.current_streak})`);
      } catch (e) {
        failed++;
        console.error(`[streak-reminders] Failed to send to ${email}:`, e);
      }
    }

    console.log(`[streak-reminders] Done. Sent: ${sent}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ sent, failed, total_at_risk: atRiskStreaks.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[streak-reminders] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

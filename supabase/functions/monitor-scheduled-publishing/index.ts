import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OverdueArticle {
  id: string;
  title: string;
  scheduled_for: string;
  minutes_overdue: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Running scheduled publishing health check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const nowIso = now.toISOString();
    
    // Check for articles that should have been published but weren't
    // Look for scheduled articles where scheduled_for is in the past
    const { data: overdueArticles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, scheduled_for')
      .eq('status', 'scheduled')
      .not('scheduled_for', 'is', null)
      .lt('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true });

    if (fetchError) {
      console.error('Error checking scheduled articles:', fetchError);
      throw fetchError;
    }

    const overdueCount = overdueArticles?.length || 0;
    console.log(`Found ${overdueCount} overdue scheduled articles`);

    if (overdueCount === 0) {
      // All good - no overdue articles
      console.log('✅ All scheduled articles are on track');
      
      // Log the health check
      await supabase.from('system_logs').insert({
        event_type: 'publish_health_check',
        details: { status: 'healthy', checked_at: nowIso, overdue_count: 0 },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'healthy',
          overdue_count: 0,
          message: 'All scheduled articles are on track'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // We have overdue articles - this is a problem!
    console.error('⚠️ ALERT: Found overdue scheduled articles!');

    const overdueDetails: OverdueArticle[] = overdueArticles.map((article: any) => {
      const scheduledTime = new Date(article.scheduled_for);
      const minutesOverdue = Math.floor((now.getTime() - scheduledTime.getTime()) / (1000 * 60));
      return {
        id: article.id,
        title: article.title,
        scheduled_for: article.scheduled_for,
        minutes_overdue: minutesOverdue,
      };
    });

    // Log each overdue article
    for (const article of overdueDetails) {
      console.error(`- "${article.title}" is ${article.minutes_overdue} minutes overdue (scheduled: ${article.scheduled_for})`);
    }

    // Log the alert
    await supabase.from('system_logs').insert({
      event_type: 'publish_alert',
      details: { 
        status: 'alert',
        checked_at: nowIso, 
        overdue_count: overdueCount,
        overdue_articles: overdueDetails,
      },
    });

    // Send email alert
    if (resendApiKey) {
      const articleList = overdueDetails
        .map(a => `• "${a.title}" - ${a.minutes_overdue} mins overdue (scheduled: ${new Date(a.scheduled_for).toLocaleString('en-GB', { timeZone: 'Asia/Singapore' })} SGT)`)
        .join('\n');

      const emailHtml = `
        <h2>⚠️ Scheduled Publishing Alert</h2>
        <p>The following articles were scheduled to publish but haven't been published:</p>
        <ul>
          ${overdueDetails.map(a => `
            <li>
              <strong>${a.title}</strong><br>
              <span style="color: #e53e3e;">⏰ ${a.minutes_overdue} minutes overdue</span><br>
              <span style="color: #718096;">Scheduled: ${new Date(a.scheduled_for).toLocaleString('en-GB', { timeZone: 'Asia/Singapore' })} SGT</span>
            </li>
          `).join('')}
        </ul>
        <p style="margin-top: 20px;">
          <strong>Possible causes:</strong>
        </p>
        <ul>
          <li>The <code>publish-scheduled-articles</code> edge function may not be deployed</li>
          <li>The cron job may have stopped running</li>
          <li>There may be a database connection issue</li>
        </ul>
        <p>
          <a href="https://ai-in-asia.lovable.app/admin/calendar" style="color: #3182ce;">
            View Content Calendar →
          </a>
        </p>
      `;

      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'AI in ASIA <alerts@aiinasia.com>',
            to: ['me@adrianwatkins.com'],
            subject: `🚨 ALERT: ${overdueCount} article${overdueCount > 1 ? 's' : ''} failed to publish`,
            html: emailHtml,
            text: `SCHEDULED PUBLISHING ALERT\n\nThe following articles were scheduled to publish but haven't been published:\n\n${articleList}\n\nPlease check the publish-scheduled-articles edge function and cron job.`,
          }),
        });

        if (emailResponse.ok) {
          console.log('✅ Alert email sent successfully');
        } else {
          const errorText = await emailResponse.text();
          console.error('Failed to send alert email:', errorText);
        }
      } catch (emailError) {
        console.error('Error sending alert email:', emailError);
      }
    } else {
      console.warn('RESEND_API_KEY not configured - cannot send alert emails');
    }

    // Try to fix the issue by calling the publish function
    console.log('Attempting to auto-fix by triggering publish-scheduled-articles...');
    
    try {
      const publishResponse = await fetch(`${supabaseUrl}/functions/v1/publish-scheduled-articles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (publishResponse.ok) {
        const result = await publishResponse.json();
        console.log('Auto-fix attempt result:', result);
        
        if (result.successCount > 0) {
          // Send follow-up email that issue was auto-fixed
          if (resendApiKey) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'AI in ASIA <alerts@aiinasia.com>',
                to: ['me@adrianwatkins.com'],
                subject: `✅ AUTO-FIXED: ${result.successCount} article${result.successCount > 1 ? 's' : ''} published`,
                html: `
                  <h2>✅ Issue Auto-Resolved</h2>
                  <p>The monitoring system detected overdue articles and successfully published them:</p>
                  <ul>
                    ${result.results?.filter((r: any) => r.success).map((r: any) => `<li>${r.title}</li>`).join('') || ''}
                  </ul>
                `,
              }),
            });
          }
        }
      } else {
        console.error('Auto-fix failed - publish function returned error');
      }
    } catch (autoFixError) {
      console.error('Auto-fix attempt failed:', autoFixError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: 'alert',
        overdue_count: overdueCount,
        overdue_articles: overdueDetails,
        message: `Found ${overdueCount} overdue articles - alert sent`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in monitor-scheduled-publishing:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

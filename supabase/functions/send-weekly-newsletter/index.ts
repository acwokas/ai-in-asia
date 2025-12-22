import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const SITE_URL = 'https://aiinasia.com';

async function generateNewsletterHTML(
  edition: any,
  subscriber: any,
  trackingId: string,
  supabase: any
): Promise<string> {
  // Fetch top stories for "This Week's Signals" section
  const { data: topStories } = await supabase
    .from('newsletter_top_stories')
    .select('article_id, position, articles(id, title, slug, excerpt)')
    .eq('edition_id', edition.id)
    .order('position')
    .limit(4);

  // Fetch a random policy atlas page for "From the AI Policy Atlas" section
  const { data: policyArticle } = await supabase
    .from('articles')
    .select('id, title, slug, country, region')
    .eq('article_type', 'policy')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const editionDateFormatted = new Date(edition.edition_date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Newsletter HTML following the exact editorial structure
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI in ASIA Weekly Brief</title>
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <!-- Tracking pixel -->
  <img src="${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/article-images/tracking-pixel.gif?id=${trackingId}" width="1" height="1" alt="" style="display: none;" />
  
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e5e5e5;">
    <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px 0; letter-spacing: -0.5px;">AI in ASIA Weekly Brief</h1>
    <p style="font-size: 16px; color: #666666; margin: 0; font-style: italic;">What matters in artificial intelligence across Asia.</p>
  </div>

  <!-- Editor's Note -->
  ${edition.editor_note ? `
  <div style="margin-bottom: 32px;">
    <h2 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">Editor's Note</h2>
    <p style="font-size: 16px; color: #333333; margin: 0; line-height: 1.8;">${edition.editor_note}</p>
  </div>
  ` : ''}

  <!-- This Week's Signals -->
  ${topStories && topStories.length > 0 ? `
  <div style="margin-bottom: 32px;">
    <h2 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">This Week's Signals</h2>
    ${topStories.map((story: any) => `
    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
      <h3 style="font-size: 17px; font-weight: 600; margin: 0 0 8px 0;">
        <a href="${SITE_URL}/article/${story.articles.slug}" style="color: #1a1a1a; text-decoration: none;">${story.articles.title}</a>
      </h3>
      <p style="font-size: 15px; color: #555555; margin: 0; line-height: 1.6;">${story.articles.excerpt || ''}</p>
    </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Worth Watching -->
  ${edition.worth_watching ? `
  <div style="margin-bottom: 32px;">
    <h2 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">Worth Watching</h2>
    <p style="font-size: 16px; color: #333333; margin: 0; line-height: 1.8;">${edition.worth_watching}</p>
  </div>
  ` : ''}

  <!-- From the AI Policy Atlas -->
  ${policyArticle ? `
  <div style="margin-bottom: 32px; padding: 20px; background-color: #f8f9fa; border-left: 3px solid #1a1a1a;">
    <h2 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">From the AI Policy Atlas</h2>
    <p style="font-size: 16px; margin: 0;">
      <a href="${SITE_URL}/article/${policyArticle.slug}" style="color: #1a1a1a; text-decoration: underline;">${policyArticle.title}</a>
    </p>
    ${policyArticle.country || policyArticle.region ? `
    <p style="font-size: 14px; color: #666666; margin: 8px 0 0 0;">Explore the latest regulatory developments${policyArticle.country ? ` in ${policyArticle.country}` : ''}${policyArticle.region ? ` across ${policyArticle.region}` : ''}.</p>
    ` : ''}
  </div>
  ` : ''}

  <!-- Before You Go -->
  <div style="margin-bottom: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
    <h2 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">Before You Go</h2>
    <p style="font-size: 15px; color: #555555; margin: 0 0 12px 0; line-height: 1.7;">AI in ASIA publishes independent, Asia-first coverage of how artificial intelligence is built, regulated, and used across the region.</p>
    <p style="font-size: 15px; color: #555555; margin: 0; line-height: 1.7;">New articles are published throughout the week.</p>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e5e5;">
    <p style="font-size: 13px; color: #888888; margin: 0 0 8px 0;">
      <a href="${SITE_URL}" style="color: #1a1a1a; text-decoration: none;">AI in ASIA</a>
    </p>
    <p style="font-size: 12px; color: #aaaaaa; margin: 0;">
      <a href="${Deno.env.get('SUPABASE_URL')}/functions/v1/track-newsletter-engagement?tid=${trackingId}&action=unsubscribe" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const user = await getUserFromAuth(supabase, authHeader);
    
    if (user) {
      await requireAdmin(supabase, user.id);
    }

    const { edition_id, test_email } = await req.json();

    // Fetch edition
    const { data: edition, error: editionError } = await supabase
      .from('newsletter_editions')
      .select('*')
      .eq('id', edition_id)
      .single();

    if (editionError || !edition) {
      throw new Error('Edition not found');
    }

    // Test send mode
    if (test_email) {
      console.log(`Sending test email to ${test_email}`);
      
      const testSubscriber = { email: test_email };
      const trackingId = crypto.randomUUID();
      const html = await generateNewsletterHTML(edition, testSubscriber, trackingId, supabase);

      await resend.emails.send({
        from: 'AI in ASIA <newsletter@aiinasia.com>',
        to: test_email,
        subject: `[TEST] ${edition.subject_line}`,
        html,
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Test email sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Production send
    console.log(`Starting production send for edition ${edition_id}`);

    // Fetch all active subscribers
    const { data: subscribers } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('confirmed', true)
      .is('unsubscribed_at', null);

    if (!subscribers || subscribers.length === 0) {
      throw new Error('No active subscribers found');
    }

    console.log(`Found ${subscribers.length} active subscribers`);

    // A/B test: split first 20% into two groups of 10% each
    const totalSubscribers = subscribers.length;
    const testGroupSize = Math.floor(totalSubscribers * 0.1);
    
    const shuffled = [...subscribers].sort(() => Math.random() - 0.5);
    const groupA = shuffled.slice(0, testGroupSize);
    const groupB = shuffled.slice(testGroupSize, testGroupSize * 2);
    const remaining = shuffled.slice(testGroupSize * 2);

    let sentCount = 0;
    let failedCount = 0;

    // Send to group A
    for (const subscriber of groupA) {
      try {
        const trackingId = crypto.randomUUID();
        const html = await generateNewsletterHTML(edition, subscriber, trackingId, supabase);

        await resend.emails.send({
          from: 'AI in ASIA <newsletter@aiinasia.com>',
          to: subscriber.email,
          subject: edition.subject_line,
          html,
        });

        await supabase.from('newsletter_sends').insert({
          edition_id: edition.id,
          subscriber_id: subscriber.id,
          variant: 'A',
          sent_at: new Date().toISOString(),
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        failedCount++;
      }
    }

    // Send to group B
    for (const subscriber of groupB) {
      try {
        const trackingId = crypto.randomUUID();
        const html = await generateNewsletterHTML(edition, subscriber, trackingId, supabase);

        await resend.emails.send({
          from: 'AI in ASIA <newsletter@aiinasia.com>',
          to: subscriber.email,
          subject: edition.subject_line_variant_b || edition.subject_line,
          html,
        });

        await supabase.from('newsletter_sends').insert({
          edition_id: edition.id,
          subscriber_id: subscriber.id,
          variant: 'B',
          sent_at: new Date().toISOString(),
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        failedCount++;
      }
    }

    // Send remaining with variant A
    console.log(`Sending to remaining ${remaining.length} subscribers`);

    for (const subscriber of remaining) {
      try {
        const trackingId = crypto.randomUUID();
        const html = await generateNewsletterHTML(edition, subscriber, trackingId, supabase);

        await resend.emails.send({
          from: 'AI in ASIA <newsletter@aiinasia.com>',
          to: subscriber.email,
          subject: edition.subject_line,
          html,
        });

        await supabase.from('newsletter_sends').insert({
          edition_id: edition.id,
          subscriber_id: subscriber.id,
          variant: 'winner',
          sent_at: new Date().toISOString(),
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        failedCount++;
      }

      // Batch delay
      if (sentCount % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update edition
    await supabase
      .from('newsletter_editions')
      .update({
        status: 'sent',
        total_sent: sentCount,
      })
      .eq('id', edition_id);

    console.log(`Newsletter send complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: subscribers.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error sending newsletter:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

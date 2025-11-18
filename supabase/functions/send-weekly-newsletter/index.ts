import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

async function generateNewsletterHTML(
  edition: any,
  subscriber: any,
  trackingId: string,
  supabase: any
): Promise<string> {
  // Fetch all content for the edition
  const { data: topStories } = await supabase
    .from('newsletter_top_stories')
    .select('article_id, position, articles(*)')
    .eq('edition_id', edition.id)
    .order('position');

  const { data: heroArticle } = await supabase
    .from('articles')
    .select('*')
    .eq('id', edition.hero_article_id)
    .single();

  const { data: quickTakes } = await supabase
    .from('newsletter_quick_takes')
    .select('*')
    .eq('edition_id', edition.id)
    .order('display_order');

  const { data: toolsPrompts } = await supabase
    .from('newsletter_tools_prompts')
    .select('*')
    .eq('is_active', true)
    .limit(3);

  const { data: sponsor } = await supabase
    .from('newsletter_sponsors')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle();

  const greeting = subscriber.first_name ? `Hi ${subscriber.first_name}!` : 'Hi there!';
  
  // Comprehensive HTML newsletter template
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI in Asia Newsletter - ${edition.edition_date}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <img src="${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/article-images/tracking-pixel.gif?id=${trackingId}" width="1" height="1" alt="" />
  
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #8B5CF6;">AI in Asia Weekly</h1>
    <p style="color: #666;">${new Date(edition.edition_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <p style="font-size: 18px; margin-bottom: 20px;">${greeting}</p>

  ${edition.editor_note ? `
  <div style="background: #f9fafb; padding: 20px; border-left: 4px solid #8B5CF6; margin-bottom: 30px;">
    <h3 style="margin-top: 0;">📝 Editor's Note</h3>
    <p style="margin: 0;">${edition.editor_note}</p>
  </div>
  ` : ''}

  <div style="margin-bottom: 40px;">
    <h2 style="color: #8B5CF6;">🌟 This Week's Hero Story</h2>
    ${heroArticle ? `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      ${heroArticle.featured_image_url ? `<img src="${heroArticle.featured_image_url}" alt="${heroArticle.title}" style="width: 100%; height: auto;" />` : ''}
      <div style="padding: 20px;">
        <h3 style="margin-top: 0;">${heroArticle.title}</h3>
        <p>${heroArticle.excerpt || ''}</p>
        <a href="${Deno.env.get('SUPABASE_URL')}/functions/v1/track-newsletter-engagement?tid=${trackingId}&aid=${heroArticle.id}&section=hero" style="display: inline-block; background: #8B5CF6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Read More</a>
      </div>
    </div>
    ` : ''}
  </div>

  ${quickTakes && quickTakes.length > 0 ? `
  <div style="margin-bottom: 40px;">
    <h2 style="color: #8B5CF6;">⚡ Quick Takes</h2>
    <div style="background: #fafafa; padding: 20px; border-radius: 8px;">
      ${quickTakes.map((take: any) => `
      <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb;">
        <h4 style="margin: 0 0 5px 0; font-size: 16px;">${take.headline}</h4>
        <p style="margin: 0; font-size: 14px; color: #666;">${take.insight}</p>
        ${take.source_url ? `<a href="${take.source_url}" style="font-size: 12px; color: #8B5CF6;">Read more →</a>` : ''}
      </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div style="margin-bottom: 40px;">
    <h2 style="color: #8B5CF6;">📚 Top Stories This Week</h2>
    ${topStories?.map((story: any, index: number) => `
    <div style="border-bottom: 1px solid #e5e7eb; padding: 15px 0;">
      <div style="display: flex; align-items: start; gap: 10px;">
        <span style="font-weight: bold; color: #8B5CF6; font-size: 20px;">${index + 1}</span>
        <div>
          <h4 style="margin: 0 0 10px 0;"><a href="${Deno.env.get('SUPABASE_URL')}/functions/v1/track-newsletter-engagement?tid=${trackingId}&aid=${story.articles.id}&section=top${index + 1}" style="color: #333; text-decoration: none;">${story.articles.title}</a></h4>
          <p style="color: #666; margin: 0; font-size: 14px;">${story.articles.excerpt || ''}</p>
          <a href="${Deno.env.get('SUPABASE_URL')}/functions/v1/track-newsletter-engagement?tid=${trackingId}&aid=${story.articles.id}&section=top${index + 1}" style="color: #8B5CF6; font-size: 14px; text-decoration: none;">Read more →</a>
        </div>
      </div>
    </div>
    `).join('') || ''}
  </div>

  ${toolsPrompts && toolsPrompts.length > 0 ? `
  <div style="margin-bottom: 40px;">
    <h2 style="color: #8B5CF6;">🛠️ Tools & Prompts Worth Trying</h2>
    ${toolsPrompts.map((item: any) => `
    <div style="margin-bottom: 15px; padding: 15px; background: #f9fafb; border-radius: 8px;">
      <h4 style="margin: 0 0 5px 0;">${item.title}</h4>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">${item.description}</p>
      <a href="${item.url}" style="color: #8B5CF6; text-decoration: none; font-size: 14px;">Try it now →</a>
    </div>
    `).join('')}
  </div>
  ` : ''}

  ${sponsor ? `
  <div style="margin-bottom: 40px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; text-align: center;">
    <p style="color: white; font-size: 12px; margin: 0 0 10px 0; opacity: 0.8;">SPONSORED</p>
    ${sponsor.banner_image_url ? `<img src="${sponsor.banner_image_url}" alt="${sponsor.name}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;" />` : ''}
    <h3 style="color: white; margin: 0 0 10px 0;">${sponsor.name}</h3>
    <a href="${sponsor.website_url}" style="display: inline-block; background: white; color: #764ba2; padding: 10px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">${sponsor.cta_text || 'Learn More'}</a>
  </div>
  ` : ''}

  ${edition.mini_case_study ? `
  <div style="margin-bottom: 40px; padding: 20px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
    <h3 style="margin-top: 0; color: #3b82f6;">💡 Mini Case Study</h3>
    <p style="margin: 0;">${edition.mini_case_study}</p>
  </div>
  ` : ''}

  <div style="text-align: center; margin: 40px 0; padding: 20px; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); border-radius: 10px;">
    <p style="color: white; font-size: 16px; margin: 0;">💪 Opening this email earned you <strong>+5 points</strong>!</p>
    <p style="color: white; font-size: 14px; margin: 10px 0 0 0;">Click any article to earn <strong>+2 more points</strong> each.</p>
  </div>

  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
    <p style="color: #666; font-size: 12px;">Part of the <strong>You.WithThePowerOf.AI Collective</strong></p>
    <p style="color: #666; font-size: 12px;">#DemocratisingAI to empower everyone to explore, learn, and create with AI.</p>
    <p style="margin-top: 20px;"><a href="${Deno.env.get('SUPABASE_URL')}/functions/v1/track-newsletter-engagement?tid=${trackingId}&action=unsubscribe" style="color: #8B5CF6; font-size: 12px;">Unsubscribe</a></p>
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
      
      const testSubscriber = { email: test_email, first_name: 'Test' };
      const trackingId = crypto.randomUUID();
      const html = await generateNewsletterHTML(edition, testSubscriber, trackingId, supabase);

      await resend.emails.send({
        from: 'AI in Asia <newsletter@aiinasia.com>',
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
          from: 'AI in Asia <newsletter@aiinasia.com>',
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
          from: 'AI in Asia <newsletter@aiinasia.com>',
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

    // Wait 2 hours for A/B test results (in production, this would be a separate scheduled function)
    // For now, send remaining with variant A
    console.log(`Sending to remaining ${remaining.length} subscribers`);

    for (const subscriber of remaining) {
      try {
        const trackingId = crypto.randomUUID();
        const html = await generateNewsletterHTML(edition, subscriber, trackingId, supabase);

        await resend.emails.send({
          from: 'AI in Asia <newsletter@aiinasia.com>',
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

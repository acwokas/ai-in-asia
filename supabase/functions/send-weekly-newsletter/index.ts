import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const SITE_URL = 'https://aiinasia.com';

// Helper to create tracked links
function createTrackedLink(
  baseUrl: string,
  sendId: string,
  editionId: string,
  subscriberId: string,
  linkType: string,
  articleId?: string
): string {
  const trackingUrl = new URL(`${Deno.env.get('SUPABASE_URL')}/functions/v1/track-newsletter-click`);
  trackingUrl.searchParams.set('sid', sendId);
  trackingUrl.searchParams.set('eid', editionId);
  trackingUrl.searchParams.set('sub', subscriberId);
  trackingUrl.searchParams.set('type', linkType);
  trackingUrl.searchParams.set('url', baseUrl);
  if (articleId) {
    trackingUrl.searchParams.set('aid', articleId);
  }
  return trackingUrl.toString();
}

// Helper to create open tracking pixel URL
function createOpenTrackingPixel(sendId: string, editionId: string): string {
  const pixelUrl = new URL(`${Deno.env.get('SUPABASE_URL')}/functions/v1/track-newsletter-click`);
  pixelUrl.searchParams.set('action', 'open');
  pixelUrl.searchParams.set('sid', sendId);
  pixelUrl.searchParams.set('eid', editionId);
  return pixelUrl.toString();
}

// Helper to create unsubscribe URL
function createUnsubscribeUrl(sendId: string, editionId: string, subscriberId: string): string {
  const unsubUrl = new URL(`${Deno.env.get('SUPABASE_URL')}/functions/v1/track-newsletter-click`);
  unsubUrl.searchParams.set('action', 'unsubscribe');
  unsubUrl.searchParams.set('sid', sendId);
  unsubUrl.searchParams.set('eid', editionId);
  unsubUrl.searchParams.set('sub', subscriberId);
  return unsubUrl.toString();
}

interface WorthWatchingSection {
  title: string;
  content: string;
}

interface WorthWatching {
  trends?: WorthWatchingSection | null;
  events?: WorthWatchingSection | null;
  spotlight?: WorthWatchingSection | null;
  policy?: WorthWatchingSection | null;
}

async function generateNewsletterHTML(
  edition: any,
  subscriber: any,
  sendId: string,
  supabase: any
): Promise<string> {
  const editionId = edition.id;
  const subscriberId = subscriber.id;

  // Fetch top stories for "This Week's Signals" section
  const { data: topStories } = await supabase
    .from('newsletter_top_stories')
    .select('article_id, position, ai_summary, articles(id, title, slug, excerpt)')
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

  // Parse worth_watching sections
  const worthWatching: WorthWatching = edition.worth_watching || {};

  // Generate article cards HTML with tracking
  const articlesHtml = topStories?.map((story: any, index: number) => `
    <tr>
      <td style="padding: 0 0 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Signal ${index + 1}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px;">
                    <a href="${createTrackedLink(`${SITE_URL}/article/${story.articles.slug}`, sendId, editionId, subscriberId, 'article', story.articles.id)}" style="color: #0f172a; text-decoration: none; font-size: 20px; font-weight: 700; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block;">${story.articles.title}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px;">
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0; font-family: Georgia, 'Times New Roman', serif;">${story.ai_summary || story.articles.excerpt || ''}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px;">
                    <a href="${createTrackedLink(`${SITE_URL}/article/${story.articles.slug}`, sendId, editionId, subscriberId, 'article', story.articles.id)}" style="display: inline-block; color: #6366f1; font-size: 14px; font-weight: 600; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Read full story →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('') || '';

  // Worth Watching cards
  const worthWatchingCards = [];
  if (worthWatching.trends) {
    worthWatchingCards.push({ icon: '📈', color: '#3b82f6', bgColor: '#eff6ff', ...worthWatching.trends });
  }
  if (worthWatching.events) {
    worthWatchingCards.push({ icon: '📅', color: '#f59e0b', bgColor: '#fffbeb', ...worthWatching.events });
  }
  if (worthWatching.spotlight) {
    worthWatchingCards.push({ icon: '🏢', color: '#22c55e', bgColor: '#f0fdf4', ...worthWatching.spotlight });
  }
  if (worthWatching.policy) {
    worthWatchingCards.push({ icon: '⚖️', color: '#a855f7', bgColor: '#faf5ff', ...worthWatching.policy });
  }

  const worthWatchingHtml = worthWatchingCards.length > 0 ? `
    <tr>
      <td style="padding: 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom: 20px;">
              <h2 style="margin: 0; font-size: 13px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Worth Watching</h2>
            </td>
          </tr>
          ${worthWatchingCards.map(card => `
          <tr>
            <td style="padding-bottom: 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${card.bgColor}; border-radius: 12px; border-left: 4px solid ${card.color};">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <span style="font-size: 16px; margin-right: 8px;">${card.icon}</span>
                          <span style="font-size: 14px; font-weight: 700; color: ${card.color}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${card.title}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 8px;">
                          <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5; font-family: Georgia, 'Times New Roman', serif;">${card.content}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `).join('')}
        </table>
      </td>
    </tr>
  ` : '';

  // Newsletter HTML with sexy design and tracking
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>AI in ASIA Weekly Brief</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .fallback-font { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <!-- Tracking pixel for opens -->
  <img src="${createOpenTrackingPixel(sendId, editionId)}" width="1" height="1" alt="" style="display: none;" />
  
  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Hero Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); border-radius: 16px 16px 0 0; padding: 48px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${createTrackedLink(SITE_URL, sendId, editionId, subscriberId, 'header')}" style="text-decoration: none;">
                      <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        AI in <span style="color: #a78bfa;">ASIA</span>
                      </h1>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <p style="margin: 0; font-size: 15px; color: #94a3b8; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">Weekly Brief</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <span style="display: inline-block; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px; padding: 8px 16px; border-radius: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${editionDateFormatted}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="background: #f8fafc; padding: 40px 32px;">
              
              <!-- Editor's Note -->
              ${edition.editor_note ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 40px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                      <tr>
                        <td style="background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); height: 4px;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td>
                                <span style="font-size: 13px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Editor's Note</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-top: 16px;">
                                <p style="margin: 0; font-size: 16px; color: #334155; line-height: 1.8; font-family: Georgia, 'Times New Roman', serif;">${edition.editor_note}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- This Week's Signals -->
              ${topStories && topStories.length > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 13px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">This Week's Signals</h2>
                  </td>
                </tr>
                ${articlesHtml}
              </table>
              ` : ''}

              <!-- Worth Watching -->
              ${worthWatchingHtml}

              <!-- Policy Atlas Feature -->
              ${policyArticle ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; overflow: hidden;">
                      <tr>
                        <td style="padding: 28px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td>
                                <span style="font-size: 12px; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">🗺️ From the AI Policy Atlas</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-top: 12px;">
                                <a href="${createTrackedLink(`${SITE_URL}/article/${policyArticle.slug}`, sendId, editionId, subscriberId, 'policy_atlas', policyArticle.id)}" style="color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${policyArticle.title}</a>
                              </td>
                            </tr>
                            ${policyArticle.country || policyArticle.region ? `
                            <tr>
                              <td style="padding-top: 8px;">
                                <p style="margin: 0; font-size: 14px; color: #94a3b8; font-family: Georgia, 'Times New Roman', serif;">Explore the latest regulatory developments${policyArticle.country ? ` in ${policyArticle.country}` : ''}${policyArticle.region ? ` across ${policyArticle.region}` : ''}.</p>
                              </td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td style="padding-top: 16px;">
                                <a href="${createTrackedLink(`${SITE_URL}/article/${policyArticle.slug}`, sendId, editionId, subscriberId, 'policy_atlas', policyArticle.id)}" style="display: inline-block; background: linear-gradient(135deg, #a78bfa 0%, #f472b6 100%); color: #ffffff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Explore Policy →</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- CTA Section -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 32px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <h3 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Stay ahead of the curve</h3>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <p style="margin: 0; font-size: 15px; color: rgba(255,255,255,0.85); font-family: Georgia, 'Times New Roman', serif;">Explore more coverage on AI across Asia.</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right: 12px;">
                          <a href="${createTrackedLink(`${SITE_URL}/articles`, sendId, editionId, subscriberId, 'cta')}" style="display: inline-block; background: #ffffff; color: #6366f1; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Read Articles</a>
                        </td>
                        <td>
                          <a href="${createTrackedLink(`${SITE_URL}/guides`, sendId, editionId, subscriberId, 'cta')}" style="display: inline-block; background: rgba(255,255,255,0.15); color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; border: 1px solid rgba(255,255,255,0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Explore Guides</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #0f172a; border-radius: 0 0 16px 16px; padding: 32px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${createTrackedLink(SITE_URL, sendId, editionId, subscriberId, 'footer')}" style="color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">AI in ASIA</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Independent, Asia-first AI coverage.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <a href="${createUnsubscribeUrl(sendId, editionId, subscriberId)}" style="color: #94a3b8; font-size: 12px; text-decoration: underline; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

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
      
      const testSendId = crypto.randomUUID();
      const testSubscriber = { id: 'test-subscriber', email: test_email };
      const html = await generateNewsletterHTML(edition, testSubscriber, testSendId, supabase);

      console.log('Calling Resend API...');
      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: 'AI in ASIA <newsletter@aiinasia.com>',
        to: test_email,
        subject: `[TEST] ${edition.subject_line}`,
        html,
      });

      if (emailError) {
        console.error('Resend API error:', emailError);
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      console.log('Test email sent successfully:', emailResult);

      return new Response(
        JSON.stringify({ success: true, message: 'Test email sent', emailId: emailResult?.id }),
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

    // Helper function to send to a subscriber
    const sendToSubscriber = async (subscriber: any, variant: string, subjectLine: string) => {
      try {
        // Create send record first to get ID
        const { data: sendRecord } = await supabase
          .from('newsletter_sends')
          .insert({
            edition_id: edition.id,
            subscriber_id: subscriber.id,
            variant,
            sent_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (!sendRecord) {
          throw new Error('Failed to create send record');
        }

        const html = await generateNewsletterHTML(edition, subscriber, sendRecord.id, supabase);

        await resend.emails.send({
          from: 'AI in ASIA <newsletter@aiinasia.com>',
          to: subscriber.email,
          subject: subjectLine,
          html,
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        failedCount++;
      }
    };

    // Send to group A
    for (const subscriber of groupA) {
      await sendToSubscriber(subscriber, 'A', edition.subject_line);
    }

    // Send to group B
    for (const subscriber of groupB) {
      await sendToSubscriber(subscriber, 'B', edition.subject_line_variant_b || edition.subject_line);
    }

    // Send remaining with variant A (winner - in future could auto-select based on early results)
    console.log(`Sending to remaining ${remaining.length} subscribers`);

    for (const subscriber of remaining) {
      await sendToSubscriber(subscriber, 'winner', edition.subject_line);

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

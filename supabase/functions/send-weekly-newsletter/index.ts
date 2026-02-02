import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const SITE_URL = 'https://aiinasia.com';
const LOGO_URL = 'https://aiinasia.com/icons/aiinasia-512.png';

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

  // Fetch top stories with featured images
  const { data: topStories } = await supabase
    .from('newsletter_top_stories')
    .select('article_id, position, ai_summary, articles(id, title, slug, excerpt, featured_image_url)')
    .eq('edition_id', edition.id)
    .order('position')
    .limit(4);

  // Fetch a policy article
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

  const worthWatching: WorthWatching = edition.worth_watching || {};

  // Generate featured story (first article - full width with image)
  const featuredStory = topStories?.[0];
  const remainingStories = topStories?.slice(1) || [];

  const featuredHtml = featuredStory ? `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          ${featuredStory.articles.featured_image_url ? `
          <tr>
            <td>
              <a href="${createTrackedLink(`${SITE_URL}/article/${featuredStory.articles.slug}`, sendId, editionId, subscriberId, 'article', featuredStory.articles.id)}" style="display: block;">
                <img src="${featuredStory.articles.featured_image_url}" alt="${featuredStory.articles.title}" width="100%" style="display: block; width: 100%; height: auto; max-height: 280px; object-fit: cover;" />
              </a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">🔥 Lead Story</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px;">
                    <a href="${createTrackedLink(`${SITE_URL}/article/${featuredStory.articles.slug}`, sendId, editionId, subscriberId, 'article', featuredStory.articles.id)}" style="color: #0f172a; text-decoration: none; font-size: 24px; font-weight: 800; line-height: 1.25; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block;">${featuredStory.articles.title}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0; font-family: Georgia, 'Times New Roman', serif;">${featuredStory.ai_summary || featuredStory.articles.excerpt || ''}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <a href="${createTrackedLink(`${SITE_URL}/article/${featuredStory.articles.slug}`, sendId, editionId, subscriberId, 'article', featuredStory.articles.id)}" style="display: inline-block; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Read Full Story →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // Generate remaining article cards with thumbnails
  const articlesHtml = remainingStories.map((story: any, index: number) => `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            ${story.articles.featured_image_url ? `
            <td width="140" style="vertical-align: top;">
              <a href="${createTrackedLink(`${SITE_URL}/article/${story.articles.slug}`, sendId, editionId, subscriberId, 'article', story.articles.id)}" style="display: block;">
                <img src="${story.articles.featured_image_url}" alt="" width="140" height="140" style="display: block; width: 140px; height: 140px; object-fit: cover;" />
              </a>
            </td>
            ` : ''}
            <td style="padding: 20px; vertical-align: top;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background: #f1f5f9; color: #6366f1; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Signal ${index + 2}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 8px;">
                    <a href="${createTrackedLink(`${SITE_URL}/article/${story.articles.slug}`, sendId, editionId, subscriberId, 'article', story.articles.id)}" style="color: #0f172a; text-decoration: none; font-size: 17px; font-weight: 700; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block;">${story.articles.title}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 8px;">
                    <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0; font-family: Georgia, 'Times New Roman', serif;">${(story.ai_summary || story.articles.excerpt || '').slice(0, 120)}...</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  // Worth Watching cards with icons
  const worthWatchingCards = [];
  if (worthWatching.trends) {
    worthWatchingCards.push({ icon: '📈', color: '#3b82f6', bgColor: '#eff6ff', borderColor: '#3b82f6', ...worthWatching.trends });
  }
  if (worthWatching.events) {
    worthWatchingCards.push({ icon: '📅', color: '#f59e0b', bgColor: '#fffbeb', borderColor: '#f59e0b', ...worthWatching.events });
  }
  if (worthWatching.spotlight) {
    worthWatchingCards.push({ icon: '🚀', color: '#22c55e', bgColor: '#f0fdf4', borderColor: '#22c55e', ...worthWatching.spotlight });
  }
  if (worthWatching.policy) {
    worthWatchingCards.push({ icon: '⚖️', color: '#a855f7', bgColor: '#faf5ff', borderColor: '#a855f7', ...worthWatching.policy });
  }

  const worthWatchingHtml = worthWatchingCards.length > 0 ? `
    <tr>
      <td style="padding: 32px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 24px; vertical-align: middle;">👀</span>
                    <span style="font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; vertical-align: middle; margin-left: 8px;">Worth Watching</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${worthWatchingCards.map(card => `
          <tr>
            <td style="padding-bottom: 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${card.bgColor}; border-radius: 12px; border-left: 4px solid ${card.borderColor};">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" style="vertical-align: top;">
                          <span style="font-size: 24px;">${card.icon}</span>
                        </td>
                        <td style="vertical-align: top;">
                          <span style="font-size: 15px; font-weight: 700; color: ${card.color}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block;">${card.title}</span>
                          <p style="margin: 6px 0 0 0; font-size: 14px; color: #374151; line-height: 1.6; font-family: Georgia, 'Times New Roman', serif;">${card.content}</p>
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
<body style="margin: 0; padding: 0; background-color: #0f172a; -webkit-font-smoothing: antialiased;">
  <!-- Tracking pixel for opens -->
  <img src="${createOpenTrackingPixel(sendId, editionId)}" width="1" height="1" alt="" style="display: none;" />
  
  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Hero Header with Logo -->
          <tr>
            <td style="background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); padding: 40px 40px 48px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${createTrackedLink(SITE_URL, sendId, editionId, subscriberId, 'header')}" style="text-decoration: none;">
                      <img src="${LOGO_URL}" alt="AI in ASIA" width="80" height="80" style="display: block; width: 80px; height: 80px; border-radius: 20px; margin: 0 auto;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <a href="${createTrackedLink(SITE_URL, sendId, editionId, subscriberId, 'header')}" style="text-decoration: none;">
                      <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        Weekly Brief
                      </h1>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <p style="margin: 0; font-size: 15px; color: #94a3b8; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">What matters in artificial intelligence across Asia</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 24px;">
                    <span style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; font-size: 12px; font-weight: 600; padding: 10px 20px; border-radius: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${editionDateFormatted}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Editor's Note - Distinctive styling -->
          ${edition.editor_note ? `
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✍️ Editor's Note</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <p style="margin: 0; font-size: 17px; color: #ffffff; line-height: 1.75; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">"${edition.editor_note}"</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Main Content Area -->
          <tr>
            <td style="background: #f1f5f9; padding: 32px 24px;">
              
              <!-- Section Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td>
                    <span style="font-size: 24px; vertical-align: middle;">📡</span>
                    <span style="font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; vertical-align: middle; margin-left: 8px;">This Week's Signals</span>
                  </td>
                </tr>
              </table>

              <!-- Featured Story -->
              ${featuredHtml}

              <!-- Remaining Stories -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${articlesHtml}
              </table>

              <!-- Worth Watching -->
              ${worthWatchingHtml}

            </td>
          </tr>

          <!-- Policy Atlas Feature -->
          ${policyArticle ? `
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 12px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">🗺️ From the AI Policy Atlas</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px;">
                    <a href="${createTrackedLink(`${SITE_URL}/article/${policyArticle.slug}`, sendId, editionId, subscriberId, 'policy_atlas', policyArticle.id)}" style="color: #ffffff; text-decoration: none; font-size: 20px; font-weight: 700; line-height: 1.35; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block;">${policyArticle.title}</a>
                  </td>
                </tr>
                ${policyArticle.country || policyArticle.region ? `
                <tr>
                  <td style="padding-top: 10px;">
                    <p style="margin: 0; font-size: 14px; color: #c7d2fe; font-family: Georgia, 'Times New Roman', serif;">Explore the latest regulatory developments${policyArticle.country ? ` in ${policyArticle.country}` : ''}${policyArticle.region ? ` across ${policyArticle.region}` : ''}.</p>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding-top: 20px;">
                    <a href="${createTrackedLink(`${SITE_URL}/article/${policyArticle.slug}`, sendId, editionId, subscriberId, 'policy_atlas', policyArticle.id)}" style="display: inline-block; background: #ffffff; color: #312e81; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Explore Policy →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Section -->
          <tr>
            <td style="background: #ffffff; padding: 40px 32px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 32px;">🚀</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <h3 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Stay ahead of the curve</h3>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <p style="margin: 0; font-size: 15px; color: #64748b; font-family: Georgia, 'Times New Roman', serif;">Explore more AI coverage from across Asia.</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right: 12px;">
                          <a href="${createTrackedLink(`${SITE_URL}/articles`, sendId, editionId, subscriberId, 'cta')}" style="display: inline-block; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Read Articles</a>
                        </td>
                        <td>
                          <a href="${createTrackedLink(`${SITE_URL}/guides`, sendId, editionId, subscriberId, 'cta')}" style="display: inline-block; background: #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Explore Guides</a>
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
                    <img src="${LOGO_URL}" alt="AI in ASIA" width="48" height="48" style="display: block; width: 48px; height: 48px; border-radius: 12px; margin: 0 auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <a href="${createTrackedLink(SITE_URL, sendId, editionId, subscriberId, 'footer')}" style="color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">AI in ASIA</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
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

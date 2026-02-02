import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://aiinasia.com';

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

    const { edition_id } = await req.json();

    if (!edition_id) {
      throw new Error('edition_id is required');
    }

    // Fetch edition
    const { data: edition, error: editionError } = await supabase
      .from('newsletter_editions')
      .select('*')
      .eq('id', edition_id)
      .single();

    if (editionError || !edition) {
      throw new Error('Edition not found');
    }

    // Fetch top stories
    const { data: topStories } = await supabase
      .from('newsletter_top_stories')
      .select('article_id, position, ai_summary, articles(id, title, slug, excerpt)')
      .eq('edition_id', edition_id)
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

    // Build Worth Watching HTML
    let worthWatchingHtml = '';
    if (worthWatching.trends || worthWatching.events || worthWatching.spotlight || worthWatching.policy) {
      worthWatchingHtml = `
      <div style="margin-bottom: 32px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; font-family: Arial, sans-serif;">Worth Watching</h2>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${worthWatching.trends ? `
            <td width="50%" style="padding: 10px; vertical-align: top;">
              <div style="background: #eff6ff; border-left: 3px solid #3b82f6; padding: 12px; border-radius: 4px;">
                <h4 style="font-size: 14px; font-weight: 600; color: #1d4ed8; margin: 0 0 8px 0;">📈 ${worthWatching.trends.title}</h4>
                <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.5;">${worthWatching.trends.content}</p>
              </div>
            </td>
            ` : '<td width="50%"></td>'}
            ${worthWatching.events ? `
            <td width="50%" style="padding: 10px; vertical-align: top;">
              <div style="background: #fffbeb; border-left: 3px solid #f59e0b; padding: 12px; border-radius: 4px;">
                <h4 style="font-size: 14px; font-weight: 600; color: #b45309; margin: 0 0 8px 0;">📅 ${worthWatching.events.title}</h4>
                <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.5;">${worthWatching.events.content}</p>
              </div>
            </td>
            ` : '<td width="50%"></td>'}
          </tr>
          <tr>
            ${worthWatching.spotlight ? `
            <td width="50%" style="padding: 10px; vertical-align: top;">
              <div style="background: #f0fdf4; border-left: 3px solid #22c55e; padding: 12px; border-radius: 4px;">
                <h4 style="font-size: 14px; font-weight: 600; color: #15803d; margin: 0 0 8px 0;">🏢 ${worthWatching.spotlight.title}</h4>
                <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.5;">${worthWatching.spotlight.content}</p>
              </div>
            </td>
            ` : '<td width="50%"></td>'}
            ${worthWatching.policy ? `
            <td width="50%" style="padding: 10px; vertical-align: top;">
              <div style="background: #faf5ff; border-left: 3px solid #a855f7; padding: 12px; border-radius: 4px;">
                <h4 style="font-size: 14px; font-weight: 600; color: #7e22ce; margin: 0 0 8px 0;">⚖️ ${worthWatching.policy.title}</h4>
                <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.5;">${worthWatching.policy.content}</p>
              </div>
            </td>
            ` : '<td width="50%"></td>'}
          </tr>
        </table>
      </div>
      `;
    }

    // Generate preview HTML (without tracking pixels)
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI in ASIA Weekly Brief - Preview</title>
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e5e5e5;">
    <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px 0; letter-spacing: -0.5px;">AI in ASIA Weekly Brief</h1>
    <p style="font-size: 16px; color: #666666; margin: 0; font-style: italic;">What matters in artificial intelligence across Asia.</p>
    <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">${editionDateFormatted}</p>
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
    ${topStories.map((story: any, index: number) => `
    <div style="margin-bottom: 20px; padding-bottom: 20px; ${index < topStories.length - 1 ? 'border-bottom: 1px solid #f0f0f0;' : ''}">
      <h3 style="font-size: 17px; font-weight: 600; margin: 0 0 8px 0;">
        <a href="${SITE_URL}/article/${story.articles.slug}" style="color: #1a1a1a; text-decoration: none;">${story.articles.title}</a>
      </h3>
      <p style="font-size: 15px; color: #555555; margin: 0; line-height: 1.6;">${story.ai_summary || story.articles.excerpt || ''}</p>
    </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Worth Watching -->
  ${worthWatchingHtml}

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
    <p style="font-size: 15px; color: #555555; margin: 0; line-height: 1.7;">
      <a href="${SITE_URL}/articles" style="color: #1a1a1a; text-decoration: underline;">Read more articles</a> or 
      <a href="${SITE_URL}/guides" style="color: #1a1a1a; text-decoration: underline;">explore our guides</a>.
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e5e5;">
    <p style="font-size: 13px; color: #888888; margin: 0 0 8px 0;">
      <a href="${SITE_URL}" style="color: #1a1a1a; text-decoration: none;">AI in ASIA</a>
    </p>
    <p style="font-size: 12px; color: #aaaaaa; margin: 0;">
      <a href="#" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
    `;

    return new Response(
      JSON.stringify({ success: true, html }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error generating newsletter preview:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

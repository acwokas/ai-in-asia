import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://aiinasia.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // Extract tracking parameters
    const sendId = params.get('sid'); // newsletter_sends.id
    const editionId = params.get('eid'); // newsletter_editions.id
    const subscriberId = params.get('sub'); // newsletter_subscribers.id
    const linkType = params.get('type') || 'article'; // article, policy, external, unsubscribe
    const articleId = params.get('aid'); // article.id if applicable
    const targetUrl = params.get('url'); // The actual destination URL
    const action = params.get('action'); // open, click, unsubscribe

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userAgent = req.headers.get('user-agent') || '';
    
    // Hash IP for privacy
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const ip = forwardedFor.split(',')[0].trim();
    const ipHash = ip ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + 'salt'))
      .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16))
      : null;

    // Generate a session ID for journey tracking
    const sessionId = `nl_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Handle email open tracking (invisible pixel)
    if (action === 'open' && sendId) {
      console.log(`Tracking email open for send ${sendId}`);
      
      // Get the send record to check variant before updating
      const { data: sendRecord } = await supabase
        .from('newsletter_sends')
        .select('variant, opened_at')
        .eq('id', sendId)
        .single();

      // Only update if not already opened
      if (sendRecord && !sendRecord.opened_at) {
        await supabase
          .from('newsletter_sends')
          .update({ opened_at: new Date().toISOString() })
          .eq('id', sendId);

        // Update edition open count
        if (editionId) {
          await supabase.rpc('increment_newsletter_opens', { edition_uuid: editionId });

          // Also update variant-specific opens for A/B testing
          if (sendRecord.variant === 'A' || sendRecord.variant === 'B') {
            await supabase.rpc('increment_variant_opens', { 
              edition_uuid: editionId, 
              variant_letter: sendRecord.variant 
            });
          }
        }
      }

      // Return 1x1 transparent gif
      const gif = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
        0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
        0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3b
      ]);

      return new Response(gif, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Handle unsubscribe
    if (action === 'unsubscribe' && subscriberId) {
      console.log(`Processing unsubscribe for subscriber ${subscriberId}`);
      
      await supabase
        .from('newsletter_subscribers')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('id', subscriberId);

      if (sendId) {
        await supabase
          .from('newsletter_sends')
          .update({ unsubscribed_at: new Date().toISOString() })
          .eq('id', sendId);
      }

      // Redirect to unsubscribe confirmation page
      return Response.redirect(`${SITE_URL}/newsletter?unsubscribed=true`, 302);
    }

    // Handle link clicks
    if (targetUrl) {
      console.log(`Tracking click: ${linkType} -> ${targetUrl}`);

      // Record the click
      const { data: clickData } = await supabase
        .from('newsletter_link_clicks')
        .insert({
          send_id: sendId || null,
          edition_id: editionId,
          subscriber_id: subscriberId || null,
          link_url: targetUrl,
          link_type: linkType,
          article_id: articleId || null,
          user_agent: userAgent,
          ip_hash: ipHash,
          session_id: sessionId,
        })
        .select('id')
        .single();

      // Update send record with first click
      if (sendId) {
        await supabase
          .from('newsletter_sends')
          .update({ 
            clicked_at: new Date().toISOString(),
          })
          .eq('id', sendId)
          .is('clicked_at', null);
      }

      // Create journey tracking record
      if (clickData?.id && editionId) {
        await supabase
          .from('newsletter_user_journeys')
          .insert({
            click_id: clickData.id,
            edition_id: editionId,
            subscriber_id: subscriberId || null,
            session_id: sessionId,
            landing_page: targetUrl,
          });
      }

      // Build redirect URL with tracking params
      const redirectUrl = new URL(targetUrl.startsWith('http') ? targetUrl : `${SITE_URL}${targetUrl}`);
      redirectUrl.searchParams.set('utm_source', 'newsletter');
      redirectUrl.searchParams.set('utm_medium', 'email');
      redirectUrl.searchParams.set('utm_campaign', `edition_${editionId}`);
      redirectUrl.searchParams.set('nl_session', sessionId);
      
      if (linkType) {
        redirectUrl.searchParams.set('utm_content', linkType);
      }

      return Response.redirect(redirectUrl.toString(), 302);
    }

    // Fallback
    return Response.redirect(SITE_URL, 302);

  } catch (error: any) {
    console.error('Error tracking newsletter click:', error);
    // On error, still redirect to site
    return Response.redirect(SITE_URL, 302);
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const { type, data } = payload;

    console.log(`Resend webhook received: ${type}`, JSON.stringify(data?.email_id || data?.to));

    if (!data?.email_id) {
      console.warn('No email_id in webhook payload');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendEmailId = data.email_id;

    // Find the send record by resend_email_id
    const { data: sendRecord, error: findError } = await supabase
      .from('newsletter_sends')
      .select('id, edition_id, opened_at, clicked_at, bounced, variant')
      .eq('resend_email_id', resendEmailId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding send record:', findError);
    }

    if (!sendRecord) {
      console.log(`No send record found for resend_email_id: ${resendEmailId}`);
      return new Response(JSON.stringify({ received: true, matched: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (type) {
      case 'email.opened': {
        if (!sendRecord.opened_at) {
          await supabase
            .from('newsletter_sends')
            .update({ opened_at: new Date().toISOString() })
            .eq('id', sendRecord.id);

          // Update edition-level open count
          if (sendRecord.edition_id) {
            await supabase.rpc('increment_newsletter_opens', { edition_uuid: sendRecord.edition_id });

            if (sendRecord.variant === 'A' || sendRecord.variant === 'B') {
              await supabase.rpc('increment_variant_opens', {
                edition_uuid: sendRecord.edition_id,
                variant_letter: sendRecord.variant,
              });
            }
          }

          console.log(`Tracked open for send ${sendRecord.id}`);
        }
        break;
      }

      case 'email.clicked': {
        const clickUrl = data.click?.url || data.url || '';
        
        if (!sendRecord.clicked_at) {
          await supabase
            .from('newsletter_sends')
            .update({ clicked_at: new Date().toISOString() })
            .eq('id', sendRecord.id);
        }

        // Record the click in newsletter_link_clicks
        if (clickUrl && sendRecord.edition_id) {
          await supabase
            .from('newsletter_link_clicks')
            .insert({
              edition_id: sendRecord.edition_id,
              send_id: sendRecord.id,
              link_url: clickUrl,
              link_type: 'resend_webhook',
            });

          // Update edition total_clicked
          await supabase
            .from('newsletter_editions')
            .update({
              total_clicked: supabase.rpc ? undefined : 1, // handled below
            })
            .eq('id', sendRecord.edition_id);
        }

        console.log(`Tracked click for send ${sendRecord.id}: ${clickUrl}`);
        break;
      }

      case 'email.bounced': {
        await supabase
          .from('newsletter_sends')
          .update({ bounced: true })
          .eq('id', sendRecord.id);

        console.log(`Tracked bounce for send ${sendRecord.id}`);
        break;
      }

      case 'email.complained': {
        await supabase
          .from('newsletter_sends')
          .update({ bounced: true })
          .eq('id', sendRecord.id);

        console.log(`Tracked complaint for send ${sendRecord.id}`);
        break;
      }

      case 'email.delivered': {
        console.log(`Email delivered for send ${sendRecord.id}`);
        break;
      }

      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return new Response(JSON.stringify({ received: true, matched: true, type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is called by a cron job every Friday to auto-send the newsletter
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Auto-send newsletter triggered');

    // Find the latest edition that is ready to send (draft status, has content)
    const { data: edition, error: editionError } = await supabase
      .from('newsletter_editions')
      .select('*')
      .eq('status', 'draft')
      .not('editor_note', 'is', null)
      .order('edition_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (editionError) {
      console.error('Error finding edition:', editionError);
      throw editionError;
    }

    if (!edition) {
      console.log('No draft edition ready to send');
      return new Response(
        JSON.stringify({ message: 'No draft edition ready to send', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this edition is for today or earlier (don't send future editions)
    const editionDate = new Date(edition.edition_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    editionDate.setHours(0, 0, 0, 0);

    if (editionDate > today) {
      console.log('Edition is for a future date, skipping');
      return new Response(
        JSON.stringify({ message: 'Edition is scheduled for future', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Invoking send-weekly-newsletter for edition: ${edition.id}`);

    // Call the existing send function
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-weekly-newsletter', {
      body: { edition_id: edition.id },
    });

    if (sendError) {
      console.error('Error sending newsletter:', sendError);
      throw sendError;
    }

    // Log the automation run
    await supabase.from('newsletter_automation_log').insert({
      job_name: 'auto-send-newsletter',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      details: { edition_id: edition.id, result: sendResult },
    });

    console.log('Newsletter auto-send completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        edition_id: edition.id,
        result: sendResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in auto-send newsletter:', error);

    // Log failed automation
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from('newsletter_automation_log').insert({
        job_name: 'auto-send-newsletter',
        status: 'failed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        details: { error: error.message },
      });
    } catch (logError) {
      console.error('Failed to log automation error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

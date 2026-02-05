 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 interface UnsubscribeRequest {
   email: string;
   reason?: string;
   feedback?: string;
 }
 
 // Simple email validation
 function isValidEmail(email: string): boolean {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return emailRegex.test(email) && email.length <= 255;
 }
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseKey);
 
     const { email, reason, feedback }: UnsubscribeRequest = await req.json();
 
     // Validate email
     if (!email) {
       return new Response(
         JSON.stringify({ error: 'Email is required' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
       );
     }
 
     const normalizedEmail = email.toLowerCase().trim();
 
     if (!isValidEmail(normalizedEmail)) {
       return new Response(
         JSON.stringify({ error: 'Invalid email format' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
       );
     }
 
     console.log(`Processing unsubscribe for: ${normalizedEmail}`);
 
     // Check if email exists in newsletter_subscribers
     const { data: subscriber } = await supabase
       .from('newsletter_subscribers')
       .select('id, email')
       .eq('email', normalizedEmail)
       .single();
 
     // Also check briefing_subscriptions
     const { data: briefingSub } = await supabase
       .from('briefing_subscriptions')
       .select('id, email')
       .eq('email', normalizedEmail)
       .eq('is_active', true)
       .maybeSingle();
 
     if (!subscriber && !briefingSub) {
       // Email not found in any list - still record the unsubscribe attempt
       console.log(`Email not found in subscription lists: ${normalizedEmail}`);
     }
 
     // Delete from newsletter_subscribers
     if (subscriber) {
       const { error: deleteError } = await supabase
         .from('newsletter_subscribers')
         .delete()
         .eq('email', normalizedEmail);
 
       if (deleteError) {
         console.error('Error deleting from newsletter_subscribers:', deleteError);
       } else {
         console.log('Removed from newsletter_subscribers');
       }
     }
 
     // Deactivate briefing subscriptions
     if (briefingSub) {
       const { error: updateError } = await supabase
         .from('briefing_subscriptions')
         .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
         .eq('email', normalizedEmail);
 
       if (updateError) {
         console.error('Error deactivating briefing subscription:', updateError);
       } else {
         console.log('Deactivated briefing subscription');
       }
     }
 
     // Record the unsubscription
     const { error: insertError } = await supabase
       .from('newsletter_unsubscribes')
       .insert({
         email: normalizedEmail,
         reason: reason || null,
         feedback: feedback?.slice(0, 500) || null,
         source: 'website',
       });
 
     if (insertError) {
       console.error('Error recording unsubscribe:', insertError);
       // Don't fail the request if we can't record it
     }
 
     console.log(`Unsubscribe completed for: ${normalizedEmail}`);
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         message: 'Successfully unsubscribed' 
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
     );
   } catch (error: any) {
     console.error('Error processing unsubscribe:', error);
     return new Response(
       JSON.stringify({ error: error.message || 'Failed to unsubscribe' }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
     );
   }
 });
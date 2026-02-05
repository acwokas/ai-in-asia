 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 const SITE_URL = 'https://aiinasia.com';
 
 interface ForwardRequest {
   edition_id: string;
   sender_name: string;
   recipient_email: string;
 }
 
 // Simple email validation
 function isValidEmail(email: string): boolean {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return emailRegex.test(email) && email.length <= 255;
 }
 
 // Simple name validation - no scripts or dangerous characters
 function sanitizeName(name: string): string {
   return name
     .slice(0, 100) // Max 100 chars
     .replace(/[<>'"&]/g, '') // Remove dangerous chars
     .trim();
 }
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const resendApiKey = Deno.env.get('RESEND_API_KEY');
     const supabase = createClient(supabaseUrl, supabaseKey);
 
     if (!resendApiKey) {
       throw new Error('RESEND_API_KEY is not configured');
     }
 
     const { edition_id, sender_name, recipient_email }: ForwardRequest = await req.json();
 
     // Validate inputs
     if (!edition_id || !sender_name || !recipient_email) {
       return new Response(
         JSON.stringify({ error: 'Missing required fields: edition_id, sender_name, recipient_email' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
       );
     }
 
     // Validate email format
     if (!isValidEmail(recipient_email)) {
       return new Response(
         JSON.stringify({ error: 'Invalid email address format' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
       );
     }
 
     const sanitizedName = sanitizeName(sender_name);
     if (!sanitizedName) {
       return new Response(
         JSON.stringify({ error: 'Invalid sender name' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
       );
     }
 
     // Fetch the edition
     const { data: edition, error: editionError } = await supabase
       .from('newsletter_editions')
       .select('*')
       .eq('id', edition_id)
       .eq('status', 'sent')
       .single();
 
     if (editionError || !edition) {
       return new Response(
         JSON.stringify({ error: 'Newsletter edition not found or not yet published' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
       );
     }
 
     // Build the newsletter URL
     const newsletterUrl = edition.permalink_url || `${SITE_URL}/newsletter/archive/${edition.edition_date}`;
     const editionDateFormatted = new Date(edition.edition_date).toLocaleDateString('en-GB', {
       weekday: 'long',
       day: 'numeric',
       month: 'long',
       year: 'numeric',
     });
 
     // Create forwarded email HTML
     const html = `
 <!DOCTYPE html>
 <html lang="en">
 <head>
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <title>Forwarded: AI in ASIA Weekly Brief</title>
 </head>
 <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
   <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
     <tr>
       <td align="center" style="padding: 40px 20px;">
         <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
           
           <!-- Personal Message Card -->
           <tr>
             <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px 16px 0 0;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                   <td>
                     <span style="font-size: 32px;">💌</span>
                   </td>
                 </tr>
                 <tr>
                   <td style="padding-top: 16px;">
                     <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                       ${sanitizedName} thought you'd enjoy this
                     </h1>
                   </td>
                 </tr>
                 <tr>
                   <td style="padding-top: 12px;">
                     <p style="margin: 0; font-size: 16px; color: rgba(255,255,255,0.9); line-height: 1.6;">
                       They've forwarded this edition of the AI in ASIA Weekly Brief to you.
                     </p>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
 
           <!-- Newsletter Preview Card -->
           <tr>
             <td style="background: #ffffff; padding: 32px;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                   <td>
                     <span style="display: inline-block; background: #f1f5f9; color: #6366f1; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                       ${editionDateFormatted}
                     </span>
                   </td>
                 </tr>
                 <tr>
                   <td style="padding-top: 16px;">
                     <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                       ${edition.subject_line || 'AI in ASIA Weekly Brief'}
                     </h2>
                   </td>
                 </tr>
                 <tr>
                   <td style="padding-top: 12px;">
                     <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">
                       Get the latest insights on artificial intelligence developments across Asia.
                     </p>
                   </td>
                 </tr>
                 <tr>
                   <td style="padding-top: 24px;">
                     <a href="${newsletterUrl}" style="display: inline-block; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 10px; text-decoration: none;">
                       Read the Full Newsletter →
                     </a>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
 
           <!-- Subscribe CTA -->
           <tr>
             <td style="background: #0f172a; padding: 32px; border-radius: 0 0 16px 16px;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                   <td align="center">
                     <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                       Want to receive these directly?
                     </h3>
                   </td>
                 </tr>
                 <tr>
                   <td align="center" style="padding-top: 12px;">
                     <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                       Subscribe to get weekly AI insights delivered to your inbox.
                     </p>
                   </td>
                 </tr>
                 <tr>
                   <td align="center" style="padding-top: 20px;">
                     <a href="${SITE_URL}/newsletter?ref=forwarded" style="display: inline-block; background: #6366f1; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                       Subscribe Free
                     </a>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
 
           <!-- Privacy Notice -->
           <tr>
             <td style="padding: 24px; text-align: center;">
               <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                 This email was forwarded to you by ${sanitizedName}.<br/>
                 Your email address was only used to deliver this message and is not stored or subscribed to any list.
               </p>
             </td>
           </tr>
 
         </table>
       </td>
     </tr>
   </table>
 </body>
 </html>
     `;
 
     // Send the email via Resend
     const resend = new Resend(resendApiKey);
     const emailResult = await resend.emails.send({
       from: 'AI in ASIA <newsletter@aiinasia.com>',
       to: [recipient_email],
       subject: `${sanitizedName} forwarded: ${edition.subject_line || 'AI in ASIA Weekly Brief'}`,
       html,
     });
 
     console.log('Forward email sent:', emailResult);
 
     return new Response(
       JSON.stringify({ success: true, message: 'Newsletter forwarded successfully' }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
     );
   } catch (error: any) {
     console.error('Error forwarding newsletter:', error);
     return new Response(
       JSON.stringify({ error: error.message || 'Failed to forward newsletter' }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
     );
   }
 });
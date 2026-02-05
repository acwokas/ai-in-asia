 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
 import { getUserFromAuth, requireAdmin } from '../_shared/requireAdmin.ts';
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 const SITE_URL = 'https://aiinasia.com';
 const LOGO_URL = 'https://pbmtnvxywplgpldmlygv.supabase.co/storage/v1/object/public/article-images/aiinasia-wordmark.png';
 
 // ============================================
 // AI IN ASIA WEEKLY BRIEF - BASE LAYOUT
 // ============================================
 // PURPOSE: Consistent, Asia-first, signal-led weekly email
 // VOICE: Confident, reflective, slightly sceptical, Asia-first
 // RULES: British English, no em dashes, no generic AI buzzwords
 // SECTION ORDER IS FIXED - DO NOT REORDER
 // ============================================
 
 interface ToolPrompt {
   id: string;
   category: string;
   title: string;
   description: string;
   url: string;
 }
 
 interface MysteryLink {
   id: string;
   title: string;
   url: string;
   description: string;
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
 
 function generateNewsletterHTML(
   edition: any,
   topStories: any[],
   toolsPrompts: ToolPrompt[],
   mysteryLinks: MysteryLink[]
 ): string {
   const editionDateFormatted = new Date(edition.edition_date).toLocaleDateString('en-GB', {
     weekday: 'long',
     day: 'numeric',
     month: 'long',
     year: 'numeric',
   });
 
   const permalinkUrl = edition.permalink_url || `/newsletter/archive/${edition.edition_date}`;
   const fullPermalinkUrl = `${SITE_URL}${permalinkUrl}`;
 
   // Extract variable placeholders from edition (do not fill if empty)
   const worthWatching: WorthWatching = edition.worth_watching || {};
   const weeklyPromiseLine = edition.weekly_promise || '';
   const editorsNote = edition.editor_note || '';
  const adriansTake = edition.adrians_take || '';
  const continuityLine = edition.continuity_line || '';
   const roadmapBody = edition.roadmap_body || '';
   const roadmapWorthItIf = edition.roadmap_worth_it_if || '';
   const roadmapSkipIf = edition.roadmap_skip_if || '';
   const readerLoopTitle = edition.reader_loop_title || '';
   const readerLoopBody = edition.reader_loop_body || '';
   const guidesBridgeLine = edition.guides_bridge_line || '';
   const collectiveOneLiner = edition.collective_one_liner || 'Proudly part of the WithThePowerOf.AI Collective';
 
   // SECTION 6: LEAD STORY
   const featuredStory = topStories?.[0];
   const remainingStories = topStories?.slice(1) || [];
 
   const featuredHtml = featuredStory ? `
     <tr>
       <td style="padding: 0 0 24px 0;">
         <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
           ${featuredStory.articles.featured_image_url ? `
           <tr>
             <td>
               <a href="${SITE_URL}/article/${featuredStory.articles.slug}" style="display: block;">
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
                     <a href="${SITE_URL}/article/${featuredStory.articles.slug}" style="color: #0f172a; text-decoration: none; font-size: 24px; font-weight: 800; line-height: 1.25; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block;">${featuredStory.articles.title}</a>
                   </td>
                 </tr>
                 <tr>
                   <td style="padding-top: 14px;">
                     <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0; font-family: Georgia, 'Times New Roman', serif;">${featuredStory.ai_summary || featuredStory.articles.excerpt || ''}</p>
                   </td>
                 </tr>
                 <tr>
                   <td style="padding-top: 20px;">
                     <a href="${SITE_URL}/article/${featuredStory.articles.slug}" style="display: inline-block; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
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
 
   // SECTION 6 CONTINUED: SIGNAL CARDS
   const articlesHtml = remainingStories.map((story: any, index: number) => `
     <tr>
       <td style="padding: 0 0 16px 0;">
         <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
           <tr>
             ${story.articles.featured_image_url ? `
             <td width="140" style="vertical-align: top;">
               <a href="${SITE_URL}/article/${story.articles.slug}" style="display: block;">
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
                     <a href="${SITE_URL}/article/${story.articles.slug}" style="color: #0f172a; text-decoration: none; font-size: 17px; font-weight: 700; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: block;">${story.articles.title}</a>
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
 
   // SECTION 7: WORTH WATCHING (2x2 grid style cards)
   const worthWatchingCards = [];
   if (worthWatching.trends) {
     worthWatchingCards.push({ icon: '📈', color: '#1e40af', bgColor: '#eff6ff', borderColor: '#3b82f6', textColor: '#1e3a5f', ...worthWatching.trends });
   }
   if (worthWatching.events) {
     worthWatchingCards.push({ icon: '📅', color: '#b45309', bgColor: '#fffbeb', borderColor: '#f59e0b', textColor: '#78350f', ...worthWatching.events });
   }
   if (worthWatching.spotlight) {
     worthWatchingCards.push({ icon: '🚀', color: '#166534', bgColor: '#f0fdf4', borderColor: '#22c55e', textColor: '#14532d', ...worthWatching.spotlight });
   }
   if (worthWatching.policy) {
     worthWatchingCards.push({ icon: '⚖️', color: '#7e22ce', bgColor: '#faf5ff', borderColor: '#a855f7', textColor: '#581c87', ...worthWatching.policy });
   }
 
   const worthWatchingHtml = worthWatchingCards.length > 0 ? `
     <tr>
       <td style="padding: 32px 24px; background: #f1f5f9;">
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr>
             <td style="padding-bottom: 20px; background: #f1f5f9;">
               <span style="font-size: 24px; vertical-align: middle;">👀</span>
               <span style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; vertical-align: middle; margin-left: 8px;">Worth Watching</span>
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
                           <p style="margin: 6px 0 0 0; font-size: 14px; color: ${card.textColor}; line-height: 1.6; font-family: Georgia, 'Times New Roman', serif;">${card.content}</p>
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
 
   // SECTION 8: ROADMAP (hide section if empty)
   const roadmapHtml = roadmapBody ? `
     <tr>
       <td style="background: linear-gradient(135deg, #0c4a6e 0%, #075985 100%); padding: 32px;">
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr>
             <td>
               <span style="font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">🗺️ Roadmap</span>
             </td>
           </tr>
           <tr>
             <td style="padding-top: 16px;">
               <p style="margin: 0; font-size: 16px; color: #ffffff; line-height: 1.7; font-family: Georgia, 'Times New Roman', serif;">${roadmapBody}</p>
             </td>
           </tr>
           ${roadmapWorthItIf ? `
           <tr>
             <td style="padding-top: 16px;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(255,255,255,0.1); border-radius: 8px;">
                 <tr>
                   <td style="padding: 12px 16px;">
                     <span style="font-size: 13px; font-weight: 700; color: #86efac; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✓ Worth it if:</span>
                     <p style="margin: 4px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.5; font-family: Georgia, 'Times New Roman', serif;">${roadmapWorthItIf}</p>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
           ` : ''}
           ${roadmapSkipIf ? `
           <tr>
             <td style="padding-top: 8px;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(255,255,255,0.1); border-radius: 8px;">
                 <tr>
                   <td style="padding: 12px 16px;">
                     <span style="font-size: 13px; font-weight: 700; color: #fca5a5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✗ Skip if:</span>
                     <p style="margin: 4px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.5; font-family: Georgia, 'Times New Roman', serif;">${roadmapSkipIf}</p>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
           ` : ''}
         </table>
       </td>
     </tr>
   ` : '';
 
   // SECTION 9: TOOLS & PROMPTS
   const toolsPromptsHtml = toolsPrompts.length > 0 ? `
     <tr>
       <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px;">
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr>
             <td>
               <span style="font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">🛠️ Tools & Prompts</span>
             </td>
           </tr>
           <tr>
             <td style="padding-top: 8px;">
               <p style="margin: 0; font-size: 15px; color: rgba(255,255,255,0.9); font-family: Georgia, 'Times New Roman', serif; font-style: italic;">Practical resources to enhance your AI workflow</p>
             </td>
           </tr>
           <tr>
             <td style="padding-top: 20px;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 ${toolsPrompts.map((item, idx) => `
                 <tr>
                   <td style="padding-bottom: ${idx < toolsPrompts.length - 1 ? '12px' : '0'};">
                     <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(255,255,255,0.15); border-radius: 10px;">
                       <tr>
                         <td style="padding: 16px;">
                           <table width="100%" cellpadding="0" cellspacing="0" border="0">
                             <tr>
                               <td>
                                 <span style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin-bottom: 6px;">${item.category}</span>
                               </td>
                             </tr>
                             <tr>
                               <td style="padding-top: 6px;">
                                 <a href="${item.url}" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${item.title}</a>
                               </td>
                             </tr>
                             <tr>
                               <td style="padding-top: 6px;">
                                 <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.85); line-height: 1.5; font-family: Georgia, 'Times New Roman', serif;">${item.description || ''}</p>
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
         </table>
       </td>
     </tr>
   ` : '';
 
   // SECTION 10: MYSTERY LINK
   const randomMysteryLink = mysteryLinks.length > 0 ? mysteryLinks[Math.floor(Math.random() * mysteryLinks.length)] : null;
   const mysteryLinksHtml = randomMysteryLink ? `
     <tr>
       <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 40px 32px;">
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr>
             <td align="center">
               <span style="font-size: 48px;">🔮</span>
             </td>
           </tr>
           <tr>
             <td align="center" style="padding-top: 16px;">
               <span style="font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 2px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">The Mystery Link</span>
             </td>
           </tr>
           <tr>
             <td align="center" style="padding-top: 12px;">
               <p style="margin: 0; font-size: 22px; color: #ffffff; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">This could link to<br/>absolutely anything.</p>
             </td>
           </tr>
           <tr>
             <td align="center" style="padding-top: 10px;">
               <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.5); font-family: Georgia, 'Times New Roman', serif; font-style: italic;">Feeling lucky?</p>
             </td>
           </tr>
           <tr>
             <td align="center" style="padding-top: 24px;">
               <a href="${randomMysteryLink.url}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color: #ffffff; font-size: 16px; font-weight: 700; padding: 14px 32px; border-radius: 30px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">
                 Take Me There →
               </a>
             </td>
           </tr>
         </table>
       </td>
     </tr>
   ` : '';
 
   // SECTION 12: READER PARTICIPATION LOOP (hide if empty)
   const readerLoopHtml = readerLoopTitle || readerLoopBody ? `
     <tr>
       <td style="background: #fef3c7; padding: 32px;">
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr>
             <td align="center">
               <span style="font-size: 32px;">💬</span>
             </td>
           </tr>
           <tr>
             <td align="center" style="padding-top: 12px;">
               <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: #92400e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${readerLoopTitle || 'Your turn'}</h3>
             </td>
           </tr>
           ${readerLoopBody ? `
           <tr>
             <td align="center" style="padding-top: 10px;">
               <p style="margin: 0; font-size: 15px; color: #78350f; line-height: 1.6; font-family: Georgia, 'Times New Roman', serif; max-width: 400px;">${readerLoopBody}</p>
             </td>
           </tr>
           ` : ''}
           <tr>
             <td align="center" style="padding-top: 20px;">
               <a href="mailto:hello@aiinasia.com?subject=Reader%20Response" style="display: inline-block; background: #92400e; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                 Reply to this email →
               </a>
             </td>
           </tr>
         </table>
       </td>
     </tr>
   ` : '';
 
   // ============================================
   // MAIN HTML TEMPLATE - FIXED SECTION ORDER
   // ============================================
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
   
   <!-- Wrapper -->
   <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a;">
     <tr>
       <td align="center" style="padding: 40px 20px;">
         
         <!-- Container -->
         <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
           
           <!-- ================================ -->
           <!-- SECTION 1: HEADER -->
           <!-- Logo, Weekly Brief title, date -->
           <!-- ================================ -->
           <tr>
             <td style="background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); padding: 40px 40px 32px 40px; text-align: center;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                   <td align="center">
                     <a href="${SITE_URL}" style="text-decoration: none;">
                       <img src="${LOGO_URL}" alt="AI in ASIA" width="280" style="display: block; width: 280px; max-width: 100%; height: auto; margin: 0 auto;" />
                     </a>
                   </td>
                 </tr>
                 <tr>
                  <td align="center" style="padding-top: 12px;">
                     <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                       Weekly Brief
                     </h1>
                   </td>
                 </tr>
                 <tr>
                   <td align="center" style="padding-top: 8px;">
                     <p style="margin: 0; font-size: 15px; color: #94a3b8; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">What matters in artificial intelligence across Asia</p>
                   </td>
                 </tr>
                 <tr>
                   <td align="center" style="padding-top: 20px;">
                     <span style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; font-size: 12px; font-weight: 600; padding: 10px 20px; border-radius: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${editionDateFormatted}</span>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
 
           <!-- ================================ -->
           <!-- SECTION 2: WELCOME INTRO -->
           <!-- ================================ -->
           <tr>
             <td style="background: #ffffff; padding: 32px 40px; border-bottom: 1px solid #e2e8f0;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                   <td>
                     <p style="margin: 0; font-size: 17px; color: #334155; line-height: 1.7; font-family: Georgia, 'Times New Roman', serif;">
                       👋 <strong style="color: #0f172a;">Welcome back.</strong> Here is your curated roundup of the most significant AI developments shaping Asia this week. From groundbreaking research to policy shifts, we have distilled the noise into signals that matter.
                     </p>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
 
           <!-- ================================ -->
           <!-- SECTION 3: WEEKLY PROMISE -->
           <!-- (hide if empty) -->
           <!-- ================================ -->
           ${weeklyPromiseLine ? `
           <tr>
             <td style="background: #f8fafc; padding: 24px 40px; border-bottom: 1px solid #e2e8f0;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                   <td align="center">
                     <p style="margin: 0; font-size: 16px; color: #6366f1; font-weight: 600; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
                       "${weeklyPromiseLine}"
                     </p>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
           ` : ''}
 
           <!-- ================================ -->
           <!-- SECTION 4: EDITOR'S NOTE -->
           <!-- ================================ -->
           ${editorsNote ? `
           <tr>
             <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 36px 40px;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                   <td>
                     <span style="font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✍️ Editor's Note</span>
                   </td>
                 </tr>
                 <tr>
                   <td style="padding-top: 18px;">
                     ${editorsNote.split(/\n\n|\. (?=[A-Z])/).slice(0, 3).map((paragraph: string, idx: number) => `
                       <p style="margin: ${idx === 0 ? '0' : '16px 0 0 0'}; font-size: 16px; color: #ffffff; line-height: 1.8; font-family: Georgia, 'Times New Roman', serif; ${idx === 0 ? 'font-style: italic;' : ''}">${idx === 0 ? '"' : ''}${paragraph.trim()}${idx === 0 ? '"' : ''}</p>
                     `).join('')}
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
           ` : ''}
 

          <!-- ================================ -->
          <!-- CONTINUITY LINE -->
          <!-- (hide if empty) -->
          <!-- ================================ -->
          ${continuityLine ? `
          <tr>
            <td style="background: #f8fafc; padding: 16px 40px; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 14px; color: #64748b; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
                      ${continuityLine}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
 
           <!-- ================================ -->
           <!-- SECTION 6: THIS WEEK'S SIGNALS -->
           <!-- Lead Story + Signal Cards -->
           <!-- ================================ -->
           <tr>
             <td style="background: #f1f5f9; padding: 32px 24px;">
               
               <!-- Section Header -->
               <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                 <tr>
                   <td style="background: #f1f5f9;">
                     <span style="font-size: 24px; vertical-align: middle;">📡</span>
                     <span style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; vertical-align: middle; margin-left: 8px;">This Week's Signals</span>
                   </td>
                 </tr>
               </table>
 
               <!-- Lead Story -->
               ${featuredHtml}
 
               <!-- Signal Cards -->
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 ${articlesHtml}
               </table>
 
             </td>
           </tr>
 
           <!-- ================================ -->
           <!-- SECTION 7: WORTH WATCHING -->
           <!-- ================================ -->
           ${worthWatchingHtml}
 
           <!-- ================================ -->
           <!-- SECTION 8: ROADMAP -->
           <!-- ================================ -->
           ${roadmapHtml}
 
           <!-- ================================ -->
           <!-- SECTION 9: TOOLS & PROMPTS -->
           <!-- ================================ -->
           ${toolsPromptsHtml}
 
          <!-- ================================ -->
          <!-- SECTION 9.5: ADRIAN'S TAKE (POV) -->
          <!-- (moved after Tools & Prompts) -->
          <!-- ================================ -->
          ${adriansTake ? `
          <tr>
            <td style="background: #fef9c3; padding: 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 12px; font-weight: 700; color: #a16207; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">💡 Adrian's Take</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px;">
                    <p style="margin: 0; font-size: 16px; color: #92400e; line-height: 1.7; font-family: Georgia, 'Times New Roman', serif;">${adriansTake}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

           <!-- ================================ -->
           <!-- SECTION 10: MYSTERY LINK -->
           <!-- ================================ -->
           ${mysteryLinksHtml}
 
           <!-- ================================ -->
           <!-- SECTION 11: STAY AHEAD OF THE CURVE -->
           <!-- Articles / Guides CTAs -->
           <!-- ================================ -->
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
                     <h3 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Stay Ahead of the Curve</h3>
                   </td>
                 </tr>
                 <tr>
                   <td align="center" style="padding-top: 10px;">
                     <p style="margin: 0; font-size: 15px; color: #64748b; font-family: Georgia, 'Times New Roman', serif;">${guidesBridgeLine || 'Explore more AI coverage from across Asia.'}</p>
                   </td>
                 </tr>
                 <tr>
                   <td align="center" style="padding-top: 24px;">
                     <table cellpadding="0" cellspacing="0" border="0">
                       <tr>
                         <td style="padding-right: 12px;">
                           <a href="${SITE_URL}/articles" style="display: inline-block; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Read Articles</a>
                         </td>
                         <td>
                           <a href="${SITE_URL}/guides" style="display: inline-block; background: #f1f5f9; color: #0f172a; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Explore Guides</a>
                         </td>
                       </tr>
                     </table>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
 
           <!-- ================================ -->
           <!-- SECTION 12: READER PARTICIPATION LOOP -->
           <!-- ================================ -->
           ${readerLoopHtml}
 
           <!-- ================================ -->
           <!-- SECTION 13: FORWARD / SUBSCRIBE CTAs -->
           <!-- ================================ -->
           <tr>
             <td style="background: #0f172a; padding: 40px 32px; text-align: center;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <!-- Forward to a Friend -->
                 <tr>
                   <td style="padding-bottom: 32px; border-bottom: 1px solid #1e293b;">
                     <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #1e293b; border-radius: 12px;">
                       <tr>
                         <td style="padding: 24px;">
                           <table width="100%" cellpadding="0" cellspacing="0" border="0">
                             <tr>
                               <td align="center">
                                 <span style="font-size: 28px;">📨</span>
                               </td>
                             </tr>
                             <tr>
                               <td align="center" style="padding-top: 12px;">
                                 <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                   Know someone who would enjoy this?
                                 </h3>
                               </td>
                             </tr>
                             <tr>
                               <td align="center" style="padding-top: 8px;">
                                 <p style="margin: 0; font-size: 14px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                   Share the AI in ASIA Weekly Brief with a colleague or friend.
                                 </p>
                               </td>
                             </tr>
                             <tr>
                               <td align="center" style="padding-top: 16px;">
                                 <a href="${SITE_URL}/newsletter/forward?edition=${edition.id}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                   Forward This Newsletter →
                                 </a>
                               </td>
                             </tr>
                           </table>
                         </td>
                       </tr>
                     </table>
                   </td>
                 </tr>
 
                 <!-- Someone sent you this? CTA -->
                 <tr>
                   <td style="padding: 32px 0; border-bottom: 1px solid #1e293b;">
                     <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px;">
                       <tr>
                         <td style="padding: 24px;">
                           <table width="100%" cellpadding="0" cellspacing="0" border="0">
                             <tr>
                               <td align="center">
                                 <span style="font-size: 24px;">💡</span>
                               </td>
                             </tr>
                             <tr>
                               <td align="center" style="padding-top: 12px;">
                                 <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                   Someone sent you this?
                                 </h3>
                               </td>
                             </tr>
                             <tr>
                               <td align="center" style="padding-top: 8px;">
                                 <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                   Get AI in ASIA delivered to your inbox every week.
                                 </p>
                               </td>
                             </tr>
                             <tr>
                               <td align="center" style="padding-top: 16px;">
                                 <a href="${SITE_URL}/newsletter?ref=forwarded" style="display: inline-block; background: #ffffff; color: #6366f1; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                   Subscribe Free
                                 </a>
                               </td>
                             </tr>
                           </table>
                         </td>
                       </tr>
                     </table>
                   </td>
                 </tr>
               </table>
             </td>
           </tr>
 
           <!-- ================================ -->
           <!-- SECTION 14: WITHTHEPOWEROF.AI COLLECTIVE FOOTER -->
           <!-- ================================ -->
           <tr>
             <td style="background: #0f172a; border-radius: 0 0 16px 16px; padding: 32px 32px 40px 32px; text-align: center;">
               <table width="100%" cellpadding="0" cellspacing="0" border="0">
                 <tr>
                   <td align="center">
                     <a href="${SITE_URL}" style="text-decoration: none;">
                       <img src="${LOGO_URL}" alt="AI in ASIA" width="160" style="display: block; width: 160px; max-width: 100%; height: auto; margin: 0 auto;" />
                     </a>
                   </td>
                 </tr>
                 <tr>
                   <td align="center" style="padding-top: 12px;">
                     <p style="margin: 0; font-size: 14px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                       ${collectiveOneLiner}
                     </p>
                   </td>
                 </tr>
                 <tr>
                   <td align="center" style="padding-top: 16px;">
                     <a href="https://withthepowerof.ai" style="display: inline-block; background: rgba(255,255,255,0.1); color: #94a3b8; font-size: 11px; font-weight: 500; padding: 6px 14px; border-radius: 16px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border: 1px solid rgba(255,255,255,0.15);">
                       Part of the WithThePowerOf.AI Collective
                     </a>
                   </td>
                 </tr>
                 <tr>
                   <td align="center" style="padding-top: 24px;">
                     <a href="${SITE_URL}/newsletter/unsubscribe" style="color: #64748b; font-size: 12px; text-decoration: underline; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Unsubscribe</a>
                     <span style="color: #475569; margin: 0 8px;">•</span>
                     <a href="${SITE_URL}/privacy" style="color: #64748b; font-size: 12px; text-decoration: underline; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Privacy</a>
                     <span style="color: #475569; margin: 0 8px;">•</span>
                     <a href="${fullPermalinkUrl}" style="color: #64748b; font-size: 12px; text-decoration: underline; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">View in browser</a>
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
     return new Response('ok', { headers: corsHeaders });
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
 
     // Fetch edition with all variable fields
     const { data: edition, error: editionError } = await supabase
       .from('newsletter_editions')
       .select('*')
       .eq('id', edition_id)
       .single();
 
     if (editionError || !edition) {
       throw new Error('Edition not found');
     }
 
     // Fetch top stories with featured images
     const { data: topStories } = await supabase
       .from('newsletter_top_stories')
       .select('article_id, position, ai_summary, articles(id, title, slug, excerpt, featured_image_url)')
       .eq('edition_id', edition_id)
       .order('position')
       .limit(4);
 
     // Fetch active tools & prompts
     const { data: toolsPrompts } = await supabase
       .from('newsletter_tools_prompts')
       .select('id, category, title, description, url')
       .eq('is_active', true)
       .limit(4);
 
     // Fetch active mystery links
     const { data: mysteryLinks } = await supabase
       .from('newsletter_mystery_links')
       .select('id, title, url, description')
       .eq('is_active', true)
       .limit(3);
 
     const html = generateNewsletterHTML(
       edition, 
       topStories || [], 
       toolsPrompts || [],
       mysteryLinks || []
     );
 
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
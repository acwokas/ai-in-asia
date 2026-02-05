 import { Link } from "react-router-dom";
 import { Card } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
import { Mail, Share2, TrendingUp, Calendar, Building2, Scale, Wrench, Sparkles, ExternalLink, Map, User } from "lucide-react";
 import { getOptimizedHeroImage, getOptimizedThumbnail } from "@/lib/imageOptimization";
 
 interface WorthWatchingItem {
   title?: string;
   content?: string;
 }
 
 interface WorthWatching {
   trends?: WorthWatchingItem;
   events?: WorthWatchingItem;
   spotlight?: WorthWatchingItem;
   policy?: WorthWatchingItem;
 }
 
 interface ToolPrompt {
   id: string;
   category: string;
   title: string;
   description: string;
   url?: string;
 }
 
 interface MysteryLink {
   id: string;
   title: string;
   url: string;
   description?: string;
 }
 
 interface TopStory {
   article_id: string;
   position: number;
   ai_summary?: string;
   articles?: {
     id: string;
     title: string;
     slug: string;
     excerpt?: string;
     featured_image_url?: string;
     categories?: { slug: string };
   };
 }
 
 interface HeroArticle {
   id: string;
   title: string;
   slug: string;
   excerpt?: string;
   featured_image_url?: string;
   categories?: { slug: string };
 }
 
 export interface NewsletterEditionData {
   id: string;
   edition_date: string;
   subject_line: string;
   editor_note?: string;
  weekly_promise?: string;
  adrians_take?: string;
  continuity_line?: string;
  collective_one_liner?: string;
  roadmap_body?: string;
  roadmap_worth_it_if?: string;
  roadmap_skip_if?: string;
   worth_watching?: WorthWatching;
   heroArticle?: HeroArticle;
   newsletter_top_stories?: TopStory[];
   toolsPrompts?: ToolPrompt[];
   mysteryLink?: MysteryLink;
 }
 
 interface NewsletterPreviewContentProps {
   edition: NewsletterEditionData;
   showHeader?: boolean;
   onShare?: () => void;
   isCompact?: boolean;
 }
 
 export function NewsletterPreviewContent({ 
   edition, 
   showHeader = true, 
   onShare,
   isCompact = false 
 }: NewsletterPreviewContentProps) {
   const containerClass = isCompact ? "space-y-4" : "space-y-8";
   const headingClass = isCompact ? "text-xl font-bold mb-3" : "text-2xl font-bold mb-4";
   const cardPadding = isCompact ? "p-4" : "p-6";
 
   return (
     <div className={containerClass}>
       {/* Header */}
       {showHeader && (
         <div className={isCompact ? "mb-4" : "mb-8"}>
           <div className="flex items-center justify-between mb-4">
             <div>
               <h1 className={`headline ${isCompact ? 'text-2xl' : 'text-3xl md:text-4xl'} mb-2`}>
                 {edition.subject_line}
               </h1>
               <p className="text-muted-foreground">
                 {new Date(edition.edition_date).toLocaleDateString('en-US', {
                   weekday: 'long',
                   year: 'numeric',
                   month: 'long',
                   day: 'numeric',
                 })}
               </p>
             </div>
             {onShare && (
               <Button variant="outline" size="icon" onClick={onShare}>
                 <Share2 className="h-4 w-4" />
               </Button>
             )}
           </div>
         </div>
       )}
 
       {/* Editor's Note */}
       {edition.editor_note && (
         <Card className={`${cardPadding} border-l-4 border-primary`}>
           <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold mb-3`}>📝 Editor's Note</h2>
           <p className="text-muted-foreground">{edition.editor_note}</p>
         </Card>
       )}

      {/* Weekly Promise */}
      {edition.weekly_promise && (
        <Card className={`${cardPadding} bg-muted/30 border-none text-center`}>
          <p className="text-lg italic text-primary font-medium">"{edition.weekly_promise}"</p>
        </Card>
      )}


      {/* Continuity Line */}
      {edition.continuity_line && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground italic">{edition.continuity_line}</p>
        </div>
      )}
 
       {/* Hero Article */}
       {edition.heroArticle && (
         <Card className="overflow-hidden">
           {edition.heroArticle.featured_image_url && (
             <img
               src={getOptimizedHeroImage(edition.heroArticle.featured_image_url)}
               alt={edition.heroArticle.title}
               className={`w-full ${isCompact ? 'h-48' : 'h-64'} object-cover`}
             />
           )}
           <div className={cardPadding}>
             <h2 className={`${isCompact ? 'text-xl' : 'text-2xl'} font-bold mb-3`}>
               🌟 {edition.heroArticle.title}
             </h2>
             <p className="text-muted-foreground mb-4">
               {edition.heroArticle.excerpt}
             </p>
             <Button asChild>
               <Link to={`/${edition.heroArticle.categories?.slug || 'article'}/${edition.heroArticle.slug}`}>
                 Read More
               </Link>
             </Button>
           </div>
         </Card>
       )}
 
       {/* Top Stories */}
       {edition.newsletter_top_stories && Array.isArray(edition.newsletter_top_stories) && edition.newsletter_top_stories.length > 0 && (
         <div>
           <h2 className={headingClass}>📚 This Week's Signals</h2>
           <div className="space-y-4">
             {edition.newsletter_top_stories
               .sort((a, b) => a.position - b.position)
               .map((story) => story.articles && (
                 <Card key={story.article_id} className="overflow-hidden">
                   <div className="flex flex-col sm:flex-row">
                     {story.articles.featured_image_url && (
                       <img
                         src={getOptimizedThumbnail(story.articles.featured_image_url, 300, 200)}
                         alt={story.articles.title}
                         className={`w-full sm:w-48 ${isCompact ? 'h-24' : 'h-32'} object-cover`}
                       />
                     )}
                     <div className="p-4 flex-1">
                       <Link to={`/${story.articles.categories?.slug || 'article'}/${story.articles.slug}`}>
                         <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold hover:text-primary transition-colors mb-2`}>
                           {story.articles.title}
                         </h3>
                       </Link>
                       <p className="text-sm text-muted-foreground">
                         {story.ai_summary || story.articles.excerpt}
                       </p>
                       <Button asChild variant="link" className="px-0 mt-2">
                         <Link to={`/${story.articles.categories?.slug || 'article'}/${story.articles.slug}`}>
                           Read Full Article →
                         </Link>
                       </Button>
                     </div>
                   </div>
                 </Card>
               ))}
           </div>
         </div>
       )}
 
       {/* Mystery Link */}
       {edition.mysteryLink && (
         <Card className={`${cardPadding} bg-gradient-to-br from-primary/5 to-primary/10 border-dashed`}>
           <div className="text-center">
             <h3 className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold mb-2`}>🎲 Mystery Link</h3>
             <p className="text-muted-foreground mb-4">
               This could link to absolutely anything...
             </p>
             <Button asChild variant="outline">
               <a href={edition.mysteryLink.url} target="_blank" rel="noopener noreferrer">
                 Take a Chance <ExternalLink className="ml-2 h-4 w-4" />
               </a>
             </Button>
           </div>
         </Card>
       )}
 
       {/* Worth Watching */}
       {edition.worth_watching && (
         <div>
           <h2 className={headingClass}>👀 Worth Watching</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {edition.worth_watching.trends && (
               <Card className="p-4 border-l-4 border-l-primary">
                 <div className="flex items-center gap-2 mb-2">
                   <TrendingUp className="h-5 w-5 text-primary" />
                   <h3 className="font-semibold">{edition.worth_watching.trends.title || 'Emerging Trends'}</h3>
                 </div>
                 <p className="text-sm text-muted-foreground">{edition.worth_watching.trends.content}</p>
               </Card>
             )}
             {edition.worth_watching.events && (
               <Card className="p-4 border-l-4 border-l-accent">
                 <div className="flex items-center gap-2 mb-2">
                   <Calendar className="h-5 w-5 text-accent-foreground" />
                   <h3 className="font-semibold">{edition.worth_watching.events.title || 'Upcoming Events'}</h3>
                 </div>
                 <p className="text-sm text-muted-foreground">{edition.worth_watching.events.content}</p>
                 <Button asChild variant="link" className="px-0 mt-2">
                   <Link to="/events">
                     View All Events →
                   </Link>
                 </Button>
               </Card>
             )}
             {edition.worth_watching.spotlight && (
               <Card className="p-4 border-l-4 border-l-secondary">
                 <div className="flex items-center gap-2 mb-2">
                   <Building2 className="h-5 w-5 text-secondary-foreground" />
                   <h3 className="font-semibold">{edition.worth_watching.spotlight.title || 'Company Spotlight'}</h3>
                 </div>
                 <p className="text-sm text-muted-foreground">{edition.worth_watching.spotlight.content}</p>
               </Card>
             )}
             {edition.worth_watching.policy && (
               <Card className="p-4 border-l-4 border-l-muted">
                 <div className="flex items-center gap-2 mb-2">
                   <Scale className="h-5 w-5 text-muted-foreground" />
                   <h3 className="font-semibold">{edition.worth_watching.policy.title || 'Policy Watch'}</h3>
                 </div>
                 <p className="text-sm text-muted-foreground">{edition.worth_watching.policy.content}</p>
                 <Button asChild variant="link" className="px-0 mt-2">
                   <Link to="/policy-atlas">
                     Explore Policy Atlas →
                   </Link>
                 </Button>
               </Card>
             )}
           </div>
         </div>
       )}

    {/* Roadmap */}
    {edition.roadmap_body && (
      <Card className={`${cardPadding} bg-gradient-to-br from-sky-900 to-sky-800 text-white`}>
        <div className="flex items-center gap-2 mb-3">
          <Map className="h-5 w-5" />
          <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold`}>🗺️ Roadmap</h2>
        </div>
        <p className="mb-4 opacity-90">{edition.roadmap_body}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {edition.roadmap_worth_it_if && (
            <div className="bg-white/10 rounded-lg p-3">
              <span className="text-green-300 font-semibold text-sm">✓ Worth it if:</span>
              <p className="text-sm mt-1 opacity-90">{edition.roadmap_worth_it_if}</p>
            </div>
          )}
          {edition.roadmap_skip_if && (
            <div className="bg-white/10 rounded-lg p-3">
              <span className="text-red-300 font-semibold text-sm">✗ Skip if:</span>
              <p className="text-sm mt-1 opacity-90">{edition.roadmap_skip_if}</p>
            </div>
          )}
        </div>
      </Card>
    )}
 
       {/* Tools & Prompts */}
       {edition.toolsPrompts && edition.toolsPrompts.length > 0 && (
         <div>
           <h2 className={headingClass}>🛠️ Tools & Prompts</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {edition.toolsPrompts.map((item) => (
               <Card key={item.id} className="p-4">
                 <div className="flex items-center gap-2 mb-2">
                   {item.category === 'tool' ? (
                     <Wrench className="h-4 w-4 text-primary" />
                   ) : (
                     <Sparkles className="h-4 w-4 text-primary" />
                   )}
                   <span className="text-xs uppercase tracking-wider text-muted-foreground">
                     {item.category}
                   </span>
                 </div>
                 <h3 className="font-semibold mb-1">{item.title}</h3>
                 <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                 {item.url && (
                   <Button asChild variant="outline" size="sm">
                     <a 
                       href={item.url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                     >
                       {item.category === 'tool' ? 'Try It Out' : 'Copy Prompt'} <ExternalLink className="ml-2 h-3 w-3" />
                     </a>
                   </Button>
                 )}
               </Card>
             ))}
           </div>
           <div className="text-center mt-4">
             <Button asChild variant="ghost">
               <Link to="/tools">
                 Browse All AI Tools →
               </Link>
             </Button>
           </div>
         </div>
       )}

      {/* Adrian's Take - positioned after Tools & Prompts */}
      {edition.adrians_take && (
        <Card className={`${cardPadding} border-l-4 border-accent`}>
          <div className="flex items-center gap-2 mb-3">
            <User className="h-5 w-5 text-accent-foreground" />
            <h2 className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold`}>💡 Adrian's Take</h2>
          </div>
          <p className="text-muted-foreground">{edition.adrians_take}</p>
        </Card>
      )}
     </div>
   );
 }
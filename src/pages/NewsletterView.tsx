import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Helmet } from "react-helmet";
import { Mail, Share2, TrendingUp, Calendar, Building2, Scale, Wrench, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getOptimizedHeroImage, getOptimizedThumbnail } from "@/lib/imageOptimization";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

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

export default function NewsletterView() {
  const { date } = useParams<{ date: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const { data: edition, isLoading } = useQuery({
    queryKey: ["newsletter-edition", date, isPreview],
    queryFn: async () => {
      let query = supabase
        .from("newsletter_editions")
        .select(`
          *,
          newsletter_top_stories(
            article_id,
            position,
            ai_summary,
            articles(id, title, slug, excerpt, featured_image_url, primary_category_id, categories:primary_category_id(slug))
          )
        `)
        .eq("edition_date", date);

      // Only filter by sent status if not in preview mode
      if (!isPreview) {
        query = query.eq("status", "sent");
      }

      const { data, error } = await query.single();

      if (error) throw error;

      // Also fetch hero article
      let heroArticle = null;
      if (data?.hero_article_id) {
        const { data: hero } = await supabase
          .from("articles")
          .select("id, title, slug, excerpt, featured_image_url, primary_category_id, categories:primary_category_id(slug)")
          .eq("id", data.hero_article_id)
          .single();

        heroArticle = hero;
      }

      // Fetch tools & prompts
      const { data: toolsPrompts } = await supabase
        .from('newsletter_tools_prompts')
        .select('id, category, title, description, url')
        .eq('is_active', true)
        .limit(4);

      // Fetch a random mystery link
      const { data: mysteryLinks } = await supabase
        .from('newsletter_mystery_links')
        .select('id, title, url, description')
        .eq('is_active', true);
      
      const randomMysteryLink = mysteryLinks && mysteryLinks.length > 0 
        ? mysteryLinks[Math.floor(Math.random() * mysteryLinks.length)]
        : null;

      return { ...data, heroArticle, toolsPrompts, mysteryLink: randomMysteryLink };
    },
  });

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-12 min-h-screen">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!edition) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-12 min-h-screen">
          <Card className="p-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Newsletter Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This newsletter edition doesn't exist or hasn't been published yet.
            </p>
            <Button asChild>
              <Link to="/newsletter/archive">View Archive</Link>
            </Button>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{edition.subject_line} | AI in ASIA Newsletter</title>
        <meta name="description" content={`Read the AI in ASIA newsletter from ${new Date(edition.edition_date).toLocaleDateString()}`} />
        <link rel="canonical" href={`https://aiinasia.com/newsletter/archive/${date}`} />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/newsletter">Newsletter</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/newsletter/archive">Archive</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{date}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="headline text-3xl md:text-4xl mb-2">
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
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Editor's Note */}
          {edition.editor_note && (
            <Card className="p-6 mb-8 border-l-4 border-primary">
              <h2 className="text-xl font-semibold mb-3">📝 Editor's Note</h2>
              <p className="text-muted-foreground">{edition.editor_note}</p>
            </Card>
          )}

          {/* Hero Article */}
          {edition?.heroArticle && (
            <Card className="mb-8 overflow-hidden">
              {edition.heroArticle.featured_image_url && (
                <img
                  src={getOptimizedHeroImage(edition.heroArticle.featured_image_url)}
                  alt={edition.heroArticle.title}
                  className="w-full h-64 object-cover"
                />
              )}
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-3">
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
          {edition?.newsletter_top_stories && Array.isArray(edition.newsletter_top_stories) && edition.newsletter_top_stories.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">📚 This Week's Signals</h2>
              <div className="space-y-4">
                {edition.newsletter_top_stories
                  .sort((a: any, b: any) => a.position - b.position)
                  .map((story: any) => story.articles && (
                    <Card key={story.article_id} className="overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        {story.articles.featured_image_url && (
                          <img
                            src={getOptimizedThumbnail(story.articles.featured_image_url, 300, 200)}
                            alt={story.articles.title}
                            className="w-full sm:w-48 h-32 object-cover"
                          />
                        )}
                        <div className="p-4 flex-1">
                          <Link to={`/${story.articles.categories?.slug || 'article'}/${story.articles.slug}`}>
                            <h3 className="text-lg font-semibold hover:text-primary transition-colors mb-2">
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

          {/* Worth Watching */}
          {edition?.worth_watching && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">👀 Worth Watching</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(edition.worth_watching as WorthWatching).trends && (
                  <Card className="p-4 border-l-4 border-l-primary">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{(edition.worth_watching as WorthWatching).trends?.title || 'Emerging Trends'}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{(edition.worth_watching as WorthWatching).trends?.content}</p>
                  </Card>
                )}
                {(edition.worth_watching as WorthWatching).events && (
                  <Card className="p-4 border-l-4 border-l-accent">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-accent-foreground" />
                      <h3 className="font-semibold">{(edition.worth_watching as WorthWatching).events?.title || 'Upcoming Events'}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{(edition.worth_watching as WorthWatching).events?.content}</p>
                    <Button asChild variant="link" className="px-0 mt-2">
                      <Link to="/events">
                        View All Events →
                      </Link>
                    </Button>
                  </Card>
                )}
                {(edition.worth_watching as WorthWatching).spotlight && (
                  <Card className="p-4 border-l-4 border-l-secondary">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-secondary-foreground" />
                      <h3 className="font-semibold">{(edition.worth_watching as WorthWatching).spotlight?.title || 'Company Spotlight'}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{(edition.worth_watching as WorthWatching).spotlight?.content}</p>
                  </Card>
                )}
                {(edition.worth_watching as WorthWatching).policy && (
                  <Card className="p-4 border-l-4 border-l-muted">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">{(edition.worth_watching as WorthWatching).policy?.title || 'Policy Watch'}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{(edition.worth_watching as WorthWatching).policy?.content}</p>
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

          {/* Tools & Prompts */}
          {edition?.toolsPrompts && edition.toolsPrompts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">🛠️ Tools & Prompts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {edition.toolsPrompts.map((item: any) => (
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

          {/* Mystery Link */}
          {edition?.mysteryLink && (
            <Card className="mb-8 p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-dashed">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">🎲 Mystery Link</h3>
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

          {/* Subscribe CTA */}
          <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">
              Don't Miss Future Editions
            </h3>
            <p className="text-muted-foreground mb-6">
              Get weekly AI insights delivered straight to your inbox
            </p>
            <Button asChild size="lg">
              <Link to="/newsletter">Subscribe Now</Link>
            </Button>
          </Card>
        </main>
        
        <Footer />
      </div>
    </>
  );
}

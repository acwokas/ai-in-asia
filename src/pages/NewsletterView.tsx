import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Helmet } from "react-helmet";
import { Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

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
            articles(id, title, slug, excerpt, featured_image_url)
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
          .select("id, title, slug, excerpt, featured_image_url")
          .eq("id", data.hero_article_id)
          .single();

        heroArticle = hero;
      }

      return { ...data, heroArticle };
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
                  src={edition.heroArticle.featured_image_url}
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
                  <Link to={`/article/${edition.heroArticle.slug}`}>
                    Read More
                  </Link>
                </Button>
              </div>
            </Card>
          )}

          {/* Top Stories */}
          {edition?.newsletter_top_stories && Array.isArray(edition.newsletter_top_stories) && edition.newsletter_top_stories.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">📚 Top Stories</h2>
              <div className="space-y-4">
                {edition.newsletter_top_stories
                  .sort((a: any, b: any) => a.position - b.position)
                  .map((story: any) => story.articles && (
                    <Card key={story.article_id} className="p-4">
                      <Link to={`/article/${story.articles.slug}`}>
                        <h3 className="text-lg font-semibold hover:text-primary transition-colors mb-2">
                          {story.articles.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {story.articles.excerpt}
                        </p>
                      </Link>
                    </Card>
                  ))}
              </div>
            </div>
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

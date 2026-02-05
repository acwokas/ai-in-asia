 import { useQuery } from "@tanstack/react-query";
 import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Helmet } from "react-helmet";
 import { Mail } from "lucide-react";
import { toast } from "sonner";
 import { NewsletterPreviewContent, NewsletterEditionData } from "@/components/newsletter/NewsletterPreviewContent";
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

       return { 
         ...data, 
         heroArticle, 
         toolsPrompts, 
         mysteryLink: randomMysteryLink,
         worth_watching: data.worth_watching 
       } as NewsletterEditionData & { newsletter_top_stories: any[] };
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

           <NewsletterPreviewContent 
             edition={edition} 
             onShare={handleShare}
           />

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

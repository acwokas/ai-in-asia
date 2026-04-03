import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import SEOHead from "@/components/SEOHead";
import { Mail, Share2, Link2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { NewsletterPreviewContent, NewsletterEditionData } from "@/components/newsletter/NewsletterPreviewContent";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const emailSchema = z.string().trim().email().max(255);

function ShareButtons({ url, title }: { url: string; title: string }) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">Share:</span>
      <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
        <Link2 className="h-3.5 w-3.5" />
        Copy Link
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          Post
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
          Share
        </a>
      </Button>
    </div>
  );
}

function SubscribeEndCTA() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const validatedEmail = emailSchema.parse(email);
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("id, unsubscribed_at")
        .eq("email", validatedEmail)
        .maybeSingle();

      if (existing) {
        if (existing.unsubscribed_at === null) {
          toast.info("Already subscribed!");
        } else {
          await supabase.from("newsletter_subscribers").update({ unsubscribed_at: null }).eq("id", existing.id);
          toast.success("Welcome back!");
        }
      } else {
        const { error } = await supabase.from("newsletter_subscribers").insert({
          email: validatedEmail,
          signup_source: "newsletter_archive_view",
        });
        if (error) throw error;
        toast.success("Successfully subscribed!");
      }
      setEmail("");
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error("Please enter a valid email address");
      } else {
        toast.error("Failed to subscribe. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <Mail className="h-10 w-10 text-primary mx-auto mb-3" />
      <h3 className="text-2xl font-bold mb-2">Subscribe to Get This in Your Inbox</h3>
      <p className="text-muted-foreground mb-5 max-w-lg mx-auto">
        Don't miss future editions. Get weekly AI insights delivered straight to your inbox every week.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isSubmitting}
          className="flex-1"
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Subscribing..." : "Subscribe Now"}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-2">No spam. Unsubscribe anytime.</p>
    </Card>
  );
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

      if (!isPreview) {
        query = query.eq("status", "sent");
      }

      const { data, error } = await query.single();
      if (error) throw error;

      let heroArticle = null;
      if (data?.hero_article_id) {
        const { data: hero } = await supabase
          .from("articles")
          .select("id, title, slug, excerpt, featured_image_url, primary_category_id, categories:primary_category_id(slug)")
          .eq("id", data.hero_article_id)
          .single();
        heroArticle = hero;
      }

      const { data: toolsPrompts } = await supabase
        .from("newsletter_tools_prompts")
        .select("id, category, title, description, url")
        .eq("is_active", true)
        .limit(4);

      const { data: mysteryLinks } = await supabase
        .from("newsletter_mystery_links")
        .select("id, title, url, description")
        .eq("is_active", true);

      const randomMysteryLink = mysteryLinks && mysteryLinks.length > 0
        ? mysteryLinks[Math.floor(Math.random() * mysteryLinks.length)]
        : null;

      return {
        ...data,
        heroArticle,
        toolsPrompts,
        mysteryLink: randomMysteryLink,
        worth_watching: data.worth_watching,
      } as NewsletterEditionData & { newsletter_top_stories: any[] };
    },
  });

  // Fetch adjacent editions for prev/next navigation
  const { data: adjacentEditions } = useQuery({
    queryKey: ["newsletter-adjacent", date],
    queryFn: async () => {
      const [prevResult, nextResult] = await Promise.all([
        supabase
          .from("newsletter_editions")
          .select("edition_date, subject_line")
          .eq("status", "sent")
          .lt("edition_date", date!)
          .order("edition_date", { ascending: false })
          .limit(1),
        supabase
          .from("newsletter_editions")
          .select("edition_date, subject_line")
          .eq("status", "sent")
          .gt("edition_date", date!)
          .order("edition_date", { ascending: true })
          .limit(1),
      ]);

      return {
        prev: prevResult.data?.[0] || null,
        next: nextResult.data?.[0] || null,
      };
    },
    enabled: !!date,
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

  const pageUrl = `https://aiinasia.com/newsletter/archive/${date}`;
  const formattedDate = new Date(edition.edition_date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <SEOHead
        title={`${edition.subject_line} | AI in ASIA Newsletter`}
        description={`Read the AI in ASIA newsletter from ${formattedDate}`}
        canonical={pageUrl}
      />

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/newsletter">Newsletter</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/newsletter/archive">Archive</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{formattedDate}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Share bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border/40">
            <div className="text-sm text-muted-foreground">{formattedDate}</div>
            <ShareButtons url={pageUrl} title={edition.subject_line} />
          </div>

          <NewsletterPreviewContent
            edition={edition}
            onShare={handleShare}
          />

          {/* Previous / Next navigation */}
          {(adjacentEditions?.prev || adjacentEditions?.next) && (
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 mb-10">
              {adjacentEditions?.prev ? (
                <Link
                  to={`/newsletter/archive/${adjacentEditions.prev.edition_date}`}
                  className="group flex items-start gap-3 p-4 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <ChevronLeft className="h-5 w-5 mt-0.5 text-muted-foreground group-hover:text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">Previous Edition</div>
                    <div className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                      {adjacentEditions.prev.subject_line}
                    </div>
                  </div>
                </Link>
              ) : (
                <div />
              )}
              {adjacentEditions?.next ? (
                <Link
                  to={`/newsletter/archive/${adjacentEditions.next.edition_date}`}
                  className="group flex items-start gap-3 p-4 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all text-right sm:justify-end"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">Next Edition</div>
                    <div className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                      {adjacentEditions.next.subject_line}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 mt-0.5 text-muted-foreground group-hover:text-primary shrink-0" />
                </Link>
              ) : (
                <div />
              )}
            </nav>
          )}

          {/* Subscribe CTA */}
          <SubscribeEndCTA />
        </main>

        <Footer />
      </div>
    </>
  );
}

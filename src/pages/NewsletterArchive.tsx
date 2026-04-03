import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEOHead from "@/components/SEOHead";
import { Mail, Calendar, Clock, ChevronRight, ArrowRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { z } from "zod";

const EDITIONS_PER_PAGE = 12;

const emailSchema = z.string().trim().email().max(255);

function SubscribeCTA({ variant = "default" }: { variant?: "default" | "compact" }) {
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
          toast.info("Already subscribed", { description: "This email is already on our newsletter list." });
        } else {
          await supabase.from("newsletter_subscribers").update({ unsubscribed_at: null }).eq("id", existing.id);
          toast.success("Welcome back!", { description: "You have been re-subscribed." });
        }
      } else {
        const { error } = await supabase.from("newsletter_subscribers").insert({
          email: validatedEmail,
          signup_source: "newsletter_archive",
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

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
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
          {isSubmitting ? "..." : "Subscribe"}
        </Button>
      </form>
    );
  }

  return (
    <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <Mail className="h-10 w-10 text-primary mx-auto mb-3" />
      <h2 className="text-2xl font-bold mb-2">Get This in Your Inbox</h2>
      <p className="text-muted-foreground mb-5 max-w-lg mx-auto">
        Join thousands of AI enthusiasts who get weekly insights delivered straight to their inbox.
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

function estimateReadTime(edition: any): number {
  let wordCount = 0;
  const fields = [edition.editor_note, edition.mini_case_study, edition.adrians_take, edition.collective_one_liner, edition.roadmap_body];
  for (const field of fields) {
    if (field) wordCount += field.split(/\s+/).length;
  }
  // Add estimate for top stories, worth watching etc
  wordCount += 400; // base content estimate
  return Math.max(3, Math.ceil(wordCount / 200));
}

function getExcerpt(edition: any): string {
  const source = edition.editor_note || edition.adrians_take || edition.mini_case_study || edition.subject_line || "";
  const cleaned = source.replace(/[#*_\[\]()]/g, "").trim();
  if (cleaned.length <= 150) return cleaned;
  return cleaned.substring(0, 147).replace(/\s+\S*$/, "") + "…";
}

export default function NewsletterArchive() {
  const [page, setPage] = useState(1);

  const { data: allEditions, isLoading } = useQuery({
    queryKey: ["newsletter-archive"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_editions")
        .select("id, edition_date, subject_line, editor_note, adrians_take, mini_case_study, collective_one_liner, roadmap_body, created_at")
        .eq("status", "sent")
        .order("edition_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const totalEditions = allEditions?.length || 0;
  const totalPages = Math.ceil(totalEditions / EDITIONS_PER_PAGE);
  const editions = allEditions?.slice((page - 1) * EDITIONS_PER_PAGE, page * EDITIONS_PER_PAGE);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getEditionNumber = (index: number) => {
    return totalEditions - ((page - 1) * EDITIONS_PER_PAGE + index);
  };

  return (
    <>
      <SEOHead
        noIndex={true}
        title="Newsletter Archive"
        description="Browse past editions of the AI in ASIA newsletter. Catch up on weekly AI insights, breaking news, and expert analysis."
        canonical="https://aiinasia.com/newsletter/archive"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "AI in Asia Newsletter Archive",
          "description": "Browse past editions of the AI in Asia newsletter.",
          "url": "https://aiinasia.com/newsletter/archive",
          "inLanguage": "en-GB",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://aiinasia.com" },
              { "@type": "ListItem", "position": 2, "name": "Newsletter", "item": "https://aiinasia.com/newsletter" },
              { "@type": "ListItem", "position": 3, "name": "Archive", "item": "https://aiinasia.com/newsletter/archive" }
            ]
          },
          "publisher": {
            "@type": "Organization",
            "name": "AI in Asia",
            "url": "https://aiinasia.com",
            "logo": { "@type": "ImageObject", "url": "https://aiinasia.com/icons/aiinasia-512.png" }
          },
        }}
      />

      <div className="min-h-screen flex flex-col">
        <Header />

        <main id="main-content" className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
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
                <BreadcrumbPage>Archive</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h1 className="headline text-4xl md:text-5xl mb-3">Newsletter Archive</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Browse past editions of our weekly newsletter. Catch up on AI insights you might have missed.
            </p>
            <SubscribeCTA variant="compact" />
          </div>

          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-3 bg-muted rounded w-1/4 mb-3" />
                  <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </Card>
              ))}
            </div>
          ) : editions && editions.length > 0 ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                {editions.map((edition, index) => {
                  const editionNum = getEditionNumber(index);
                  const readTime = estimateReadTime(edition);
                  const excerpt = getExcerpt(edition);

                  return (
                    <Link
                      key={edition.id}
                      to={`/newsletter/archive/${edition.edition_date}`}
                      className="group"
                    >
                      <Card className="p-6 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-border/60 hover:border-primary/30">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                            Edition #{editionNum}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {readTime} min read
                          </div>
                        </div>

                        <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors leading-snug">
                          {edition.subject_line}
                        </h2>

                        {excerpt && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {excerpt}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(edition.edition_date)}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "ghost"}
                        size="sm"
                        className="w-9"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="p-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Newsletters Yet</h2>
              <p className="text-muted-foreground">Check back soon for our first edition!</p>
            </Card>
          )}

          {/* Bottom CTA */}
          <div className="mt-12">
            <SubscribeCTA />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

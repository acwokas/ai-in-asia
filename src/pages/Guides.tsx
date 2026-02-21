import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Clock, ArrowRight } from "lucide-react";

const pillarColors: Record<string, string> = {
  learn: "bg-blue-500",
  prompts: "bg-purple-500",
  toolbox: "bg-teal-500",
};

const diffColors: Record<string, string> = {
  beginner: "bg-green-500",
  intermediate: "bg-amber-500",
  advanced: "bg-red-500",
};

const Guides = () => {
  const { data: guides, isLoading } = useQuery({
    queryKey: ["guides-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, pillar, difficulty, one_line_description, featured_image_url, read_time_minutes, platform_tags, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <SEOHead
        title="AI Guides, Prompts & Tools | AI in Asia"
        description="Practical AI guides, ready-to-use prompt collections, and curated tool recommendations. Real techniques for practitioners across Asia."
        canonical="https://aiinasia.com/guides"
        ogType="website"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
        ogImageAlt="AI Guides, Prompts & Tools - AI in Asia"
      />
      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="container relative mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                <span>Practical guides for practitioners</span>
              </div>
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                Master AI with
                <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Practical Guides
                </span>
              </h1>
              <p className="text-xl text-muted-foreground md:text-2xl leading-relaxed max-w-2xl">
                Real techniques, tested prompts, and honest tool recommendations. No theory, no filler.
              </p>
            </div>
          </div>
        </section>

        {/* Guides Grid */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : guides && guides.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {guides.map((g: any) => (
                  <Link
                    key={g.id}
                    to={`/guides/${g.slug}`}
                    className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg"
                  >
                    {g.featured_image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={g.featured_image_url}
                          alt={g.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-5 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {g.pillar && (
                          <Badge className={`${pillarColors[g.pillar] || "bg-primary"} text-white text-[10px]`}>
                            {g.pillar}
                          </Badge>
                        )}
                        {g.difficulty && (
                          <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>
                            {g.difficulty}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {g.title}
                      </h2>
                      {g.one_line_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{g.one_line_description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {g.read_time_minutes || "5"} min read
                        </span>
                        <span className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                          Read guide <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p>No guides published yet. Check back soon!</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Guides;

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const AMBER = "hsl(37, 78%, 60%)";

export default function ThreeBeforeNineArchive() {
  const { data: editions, isLoading } = useQuery({
    queryKey: ["three-before-nine-archive"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, excerpt, tldr_snapshot, categories:primary_category_id(slug)")
        .eq("article_type", "three_before_nine")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="3 Before 9 - All Editions | AI in Asia"
        description="Browse every edition of 3 Before 9, your weekday morning AI briefing covering the stories that matter across Asia-Pacific."
      />
      <Header />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>

        <div className="mb-10">
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="font-bold text-4xl tracking-tight" style={{ color: AMBER }}>3</span>
            <span className="text-muted-foreground text-xl">Before</span>
            <span className="font-bold text-4xl tracking-tight" style={{ color: AMBER }}>9</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-lg">
            Your weekday morning AI briefing - 3 must-know stories before your 9am coffee.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : !editions?.length ? (
          <p className="text-muted-foreground">No editions published yet. Check back soon.</p>
        ) : (
          <div className="space-y-3">
            {editions.map((edition) => {
              const date = edition.published_at ? new Date(edition.published_at) : new Date();
              const tldr = edition.tldr_snapshot as any;
              const bullets: string[] = tldr?.bullets || [];
              const catSlug = (edition as any).categories?.slug || "news";

              return (
                <Link
                  key={edition.id}
                  to={`/${catSlug}/${edition.slug}`}
                  className="group block bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all"
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "hsla(37, 78%, 60%, 0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="shrink-0 sm:w-36">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: AMBER }}>
                        {format(date, "EEEE")}
                      </p>
                      <p className="text-foreground font-semibold text-sm">
                        {format(date, "d MMMM yyyy")}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      {bullets.length > 0 ? (
                        <ul className="space-y-1">
                          {bullets.slice(0, 3).map((bullet, i) => (
                            <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                              <span className="font-bold shrink-0" style={{ color: AMBER }}>{i + 1}.</span>
                              <span className="line-clamp-1">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      ) : edition.excerpt ? (
                        <p className="text-muted-foreground text-sm line-clamp-2">{edition.excerpt}</p>
                      ) : null}
                    </div>

                    <span className="shrink-0 text-xs font-medium flex items-center gap-1 group-hover:underline self-end sm:self-center" style={{ color: AMBER }}>
                      Read <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

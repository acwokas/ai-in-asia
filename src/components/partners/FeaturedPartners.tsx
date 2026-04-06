import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFadeInOnScroll } from "./useFadeInOnScroll";
import { Handshake } from "lucide-react";

export default function FeaturedPartners() {
  const { ref, isVisible } = useFadeInOnScroll();

  const { data: partners } = useQuery({
    queryKey: ["featured-partners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      return data ?? [];
    },
    staleTime: 1000 * 60 * 30,
  });

  return (
    <section
      ref={ref}
      className={`py-16 md:py-20 border-t border-border/50 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="container mx-auto px-4 max-w-5xl text-center">
        <h2 className="headline text-2xl md:text-3xl font-bold mb-3">
          Trusted by Leading Organizations
        </h2>
        <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
          Across Asia-Pacific
        </p>

        {partners && partners.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-10">
            {partners.map((p) => (
              <a
                key={p.id}
                href={p.website_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                {p.logo_url ? (
                  <img
                    src={p.logo_url}
                    alt={p.name}
                    className="h-10 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground">{p.name}</span>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="py-12 px-6 rounded-xl border border-dashed border-border/60 bg-muted/20">
            <Handshake className="h-10 w-10 text-primary/40 mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">Founding Partner opportunities available</p>
            <p className="text-sm text-muted-foreground">
              Be among the first organizations to partner with Asia-Pacific's leading AI publication.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

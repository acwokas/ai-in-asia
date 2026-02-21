import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const CATEGORIES = [
  { name: "News", slug: "news" },
  { name: "Business", slug: "business" },
  { name: "Life", slug: "life" },
  { name: "Learn", slug: "learn" },
  { name: "Create", slug: "create" },
  { name: "Voices", slug: "voices" },
];

const HomepageQuickLinks = memo(() => {
  const { data: popular } = useQuery({
    queryKey: ["homepage-popular-now"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, categories:primary_category_id(slug)")
        .eq("status", "published")
        .not("title", "ilike", "%3 Before 9%")
        .order("view_count", { ascending: false, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <aside className="hidden xl:flex flex-col bg-card/60 border border-border/60 rounded-lg p-4 h-full">
      {/* Popular Now */}
      <div className="mb-4">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary mb-3">
          Popular Now
        </h3>
        <ul className="space-y-0">
          {(popular || []).slice(0, 6).map((article: any, i: number) => (
            <li key={article.id}>
              <Link
                to={`/${article.categories?.slug || "news"}/${article.slug}`}
                className="block text-[14px] leading-[1.45] text-foreground hover:text-primary transition-colors py-2"
              >
                {article.title}
              </Link>
              {i < Math.min((popular?.length || 0) - 1, 5) && (
                <div className="border-b border-border/40 border-dotted" />
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Explore */}
      <div className="mt-auto pt-3 border-t border-border/40">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary mb-2">
          Explore
        </h3>
        <ul className="space-y-1">
          {CATEGORIES.map((cat) => (
            <li key={cat.slug}>
              <Link
                to={`/${cat.slug}`}
                className="text-[13px] text-muted-foreground hover:text-primary transition-colors block py-0.5"
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
});

HomepageQuickLinks.displayName = "HomepageQuickLinks";
export default HomepageQuickLinks;

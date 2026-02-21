import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getCategoryColor } from "@/lib/categoryColors";

interface Props {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  currentArticleId: string;
  excludeIds?: string[];
}

export function ArticleRailRelatedReading({ categoryId, categoryName, categorySlug, currentArticleId, excludeIds = [] }: Props) {
  const { data: articles } = useQuery({
    queryKey: ["rail-related", categoryId, currentArticleId],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, slug, featured_image_url, published_at, categories!articles_primary_category_id_fkey(name, slug)")
        .eq("primary_category_id", categoryId)
        .eq("status", "published")
        .neq("id", currentArticleId)
        .order("published_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const filtered = (articles || [])
    .filter(a => !excludeIds.includes(a.id))
    .slice(0, 3);

  if (filtered.length === 0) return null;

  const color = getCategoryColor(categorySlug);

  return (
    <div>
      <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1rem", color: "hsl(var(--foreground))" }} className="mb-3">
        More in {categoryName}
      </h3>
      <div className="flex flex-col gap-4">
        {filtered.map(a => {
          const cat = a.categories as any;
          return (
            <Link
              key={a.id}
              to={`/${cat?.slug || categorySlug}/${a.slug}`}
              className="flex gap-3 group"
            >
              {a.featured_image_url && (
                <img
                  src={a.featured_image_url}
                  alt={a.title}
                  className="w-[80px] h-[60px] rounded object-cover flex-shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2"
                  style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.9rem", color: "hsl(var(--foreground))" }}
                >
                  {a.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-block px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider rounded-full"
                    style={{ backgroundColor: color, color: "#fff" }}
                  >
                    {cat?.name || categoryName}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#BFC0C0" }}>
                    {a.published_at && new Date(a.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

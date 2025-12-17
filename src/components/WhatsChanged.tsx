import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const WhatsChanged = () => {
  const { data: updatedArticles } = useQuery({
    queryKey: ["whats-changed"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, updated_at, published_at,
          categories:primary_category_id (slug)
        `)
        .eq("status", "published")
        .gte("updated_at", sevenDaysAgo.toISOString())
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Filter to only show articles where updated_at is meaningfully different from published_at
      return data?.filter(article => {
        if (!article.updated_at || !article.published_at) return false;
        const updated = new Date(article.updated_at).getTime();
        const published = new Date(article.published_at).getTime();
        // Must be updated at least 1 hour after publishing
        return updated - published > 60 * 60 * 1000;
      }) || [];
    },
  });

  if (!updatedArticles?.length) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Recently Updated</h2>
      </div>
      
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="space-y-3">
          {updatedArticles.map((article: any) => (
            <Link
              key={article.id}
              to={`/${article.categories?.slug || 'news'}/${article.slug}`}
              className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0 group"
            >
              <span className="font-medium group-hover:text-primary transition-colors line-clamp-1">
                {article.title}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatsChanged;

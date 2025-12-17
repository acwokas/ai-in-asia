import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowRight, Clock } from "lucide-react";

interface ContinueReadingProps {
  currentArticleId: string;
  categoryId?: string;
  categorySlug?: string;
}

const ContinueReading = ({ currentArticleId, categoryId, categorySlug }: ContinueReadingProps) => {
  const { data: nextArticle } = useQuery({
    queryKey: ["next-article", currentArticleId, categoryId],
    enabled: !!currentArticleId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, featured_image_url, reading_time_minutes,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .neq("id", currentArticleId)
        .order("published_at", { ascending: false })
        .limit(1);

      if (categoryId) {
        query = query.eq("primary_category_id", categoryId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!nextArticle) return null;

  const articleUrl = `/${nextArticle.categories?.slug || categorySlug || 'news'}/${nextArticle.slug}`;

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 my-8">
      <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
        <ArrowRight className="h-4 w-4" />
        Continue Reading
      </div>
      
      <Link to={articleUrl} className="group block">
        <div className="flex gap-4">
          {nextArticle.featured_image_url && (
            <img
              src={nextArticle.featured_image_url}
              alt={nextArticle.title}
              className="w-24 h-24 object-cover rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2 mb-2">
              {nextArticle.title}
            </h3>
            {nextArticle.excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {nextArticle.excerpt}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {nextArticle.authors?.name && (
                <span>By {nextArticle.authors.name}</span>
              )}
              {nextArticle.reading_time_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {nextArticle.reading_time_minutes} min
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
};

export default ContinueReading;

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card } from "./ui/card";

interface InlineRelatedArticlesProps {
  currentArticleId: string;
  categoryId: string;
  categorySlug: string;
}

const InlineRelatedArticles = ({ currentArticleId, categoryId, categorySlug }: InlineRelatedArticlesProps) => {
  const { data: relatedArticles } = useQuery({
    queryKey: ["inline-related", currentArticleId, categoryId],
    queryFn: async () => {
      // Fetch recent articles from same category (different from YouMayAlsoLike which uses view_count)
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          reading_time_minutes,
          categories:primary_category_id (name, slug)
        `)
        .eq("primary_category_id", categoryId)
        .eq("status", "published")
        .neq("id", currentArticleId)
        .order("published_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  if (!relatedArticles || relatedArticles.length === 0) {
    return null;
  }

  return (
    <div className="not-prose my-12 p-6 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Related Articles</h3>
        <Link 
          to={`/category/${categorySlug}`}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View more <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {relatedArticles.map((article) => (
          <Link
            key={article.id}
            to={`/${article.categories?.slug || categorySlug}/${article.slug}`}
            className="group"
          >
            <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
              {article.featured_image_url && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={article.featured_image_url}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-4">
                <h4 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h4>
                {article.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {article.excerpt}
                  </p>
                )}
                {article.reading_time_minutes && (
                  <p className="text-xs text-muted-foreground">
                    {article.reading_time_minutes} min read
                  </p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default InlineRelatedArticles;

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Layers, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface DeepDiveSectionProps {
  currentArticleId: string;
  tags?: string[];
}

const DeepDiveSection = ({ currentArticleId, tags }: DeepDiveSectionProps) => {
  const { data: cornerstoneArticles } = useQuery({
    queryKey: ["cornerstone-related", currentArticleId, tags],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      // Fetch cornerstone articles
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, featured_image_url,
          categories:primary_category_id (slug, name)
        `)
        .eq("status", "published")
        .eq("cornerstone", true)
        .neq("id", currentArticleId)
        .order("view_count", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  if (!cornerstoneArticles?.length) return null;

  return (
    <section className="my-10 py-8 border-t border-b border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <Layers className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Deep Dive</h2>
        <Badge variant="secondary" className="text-xs">Comprehensive guides</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cornerstoneArticles.map((article: any) => (
          <Link
            key={article.id}
            to={`/${article.categories?.slug || 'news'}/${article.slug}`}
            className="group"
          >
            <Card className="p-4 h-full hover:border-primary/50 transition-colors">
              {article.featured_image_url && (
                <img
                  src={article.featured_image_url}
                  alt=""
                  className="w-full h-32 object-cover rounded mb-3 group-hover:scale-[1.02] transition-transform"
                />
              )}
              <Badge variant="outline" className="mb-2 text-xs">
                {article.categories?.name || 'Guide'}
              </Badge>
              <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {article.title}
              </h3>
              {article.excerpt && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                  {article.excerpt}
                </p>
              )}
              <span className="text-xs text-primary flex items-center gap-1 mt-3">
                Read full guide <ArrowRight className="h-3 w-3" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default DeepDiveSection;

import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";

/**
 * Handles legacy WordPress URL patterns that don't include category prefix.
 * e.g., /bytedance-12-billion-ai-investment-2025/ -> /news/bytedance-12-billion-ai-investment-2025
 */
const LegacyArticleRedirect = () => {
  const { slug } = useParams();
  const cleanSlug = slug?.replace(/\/+$/g, '');

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["legacy-redirect", cleanSlug],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - redirects don't change often
    queryFn: async () => {
      if (!cleanSlug) return null;

      const { data, error } = await supabase
        .from("articles")
        .select(`
          slug,
          status,
          categories:primary_category_id (slug)
        `)
        .eq("slug", cleanSlug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Still loading - show minimal skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEOHead title="Redirecting..." description="Redirecting to the correct article URL." noIndex={true} />
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Article found - redirect to proper URL with category
  if (article?.categories?.slug) {
    const categorySlug = article.categories.slug;
    return <Navigate to={`/${categorySlug}/${cleanSlug}`} replace />;
  }

  // Article not found or no category - let it fall through to 404
  return <Navigate to={`/not-found?from=${encodeURIComponent(cleanSlug || '')}`} replace />;
};

export default LegacyArticleRedirect;

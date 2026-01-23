import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useArticleCommentCount = (cleanSlug: string | undefined) => {
  return useQuery({
    queryKey: ["article-comment-count", cleanSlug],
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!cleanSlug,
    queryFn: async () => {
      // Get article ID first
      const { data: articleData } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", cleanSlug)
        .maybeSingle();
      
      if (!articleData?.id) return 0;
      
      // Count approved real comments from public view
      const { count: realCount } = await supabase
        .from("comments_public")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleData.id);
      
      // Count published AI comments
      const { count: aiCount } = await supabase
        .from("ai_generated_comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleData.id)
        .eq("published", true);
      
      return (realCount || 0) + (aiCount || 0);
    },
  });
};

export const useArticle = (cleanSlug: string | undefined, previewCode: string | null) => {
  const isPreview = !!previewCode;
  
  return useQuery({
    queryKey: ["article", cleanSlug, previewCode],
    staleTime:
      typeof window !== "undefined" &&
      (window.location.hostname.includes("lovableproject.com") ||
        window.location.hostname === "localhost")
        ? 0
        : 5 * 60 * 1000, // 5 minutes
    refetchOnMount:
      typeof window !== "undefined" &&
      (window.location.hostname.includes("lovableproject.com") ||
        window.location.hostname === "localhost")
        ? "always"
        : undefined,
    enabled: !!cleanSlug,
    queryFn: async () => {
      console.log('Article fetch params:', { 
        cleanSlug, 
        previewCode, 
        isPreview,
        fullUrl: window.location.href 
      });
      
      let query = supabase
        .from("articles")
        .select(`
          *,
          authors!articles_author_id_fkey (id, name, slug, bio, avatar_url, job_title),
          categories!articles_primary_category_id_fkey (name, slug, id)
        `)
        .eq("slug", cleanSlug);
      
      if (previewCode) {
        query = query.eq("preview_code", previewCode);
        console.log('Looking for article with preview code:', previewCode);
      } else {
        query = query.eq("status", "published");
        console.log('Looking for published article');
      }
      
      const { data, error } = await query.maybeSingle();
      
      console.log('Article query result:', { data, error });
      if (error) throw error;
      return data;
    },
  });
};

export const useCategorySponsor = (categoryId: string | undefined) => {
  return useQuery({
    queryKey: ["category-sponsor", categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      if (!categoryId) return null;
      
      const { data, error } = await supabase
        .from("category_sponsors")
        .select("*")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });
};

export const useRelatedArticles = (
  articleId: string | undefined, 
  primaryCategoryId: string | undefined,
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["related-articles", primaryCategoryId, articleId],
    enabled: enabled && !!articleId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      if (primaryCategoryId) {
        const { data, error } = await supabase
          .from("articles")
          .select(`
            *,
            authors (name, slug),
            categories:primary_category_id (name, slug)
          `)
          .eq("primary_category_id", primaryCategoryId)
          .neq("id", articleId)
          .eq("status", "published")
          .order("view_count", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(3);
        
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .neq("id", articleId)
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });
};

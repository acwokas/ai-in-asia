import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRelatedArticles(categoryId: string | undefined, currentArticleId: string, tags?: string[] | null, topicTags?: string[] | null, excludeIds: string[] = []) {
  const allTags = [...(tags || []), ...(topicTags || [])].map(t => t.toLowerCase());

  return useQuery({
    queryKey: ["related-articles", currentArticleId, categoryId],
    staleTime: 5 * 60 * 1000,
    enabled: !!currentArticleId,
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select("id, title, slug, featured_image_url, reading_time_minutes, published_at, ai_tags, topic_tags, categories:primary_category_id(name, slug)")
        .eq("status", "published")
        .neq("id", currentArticleId)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(30);

      if (categoryId) {
        query = query.eq("primary_category_id", categoryId);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      const allExclude = new Set([currentArticleId, ...excludeIds]);
      const candidates = data.filter(a => !allExclude.has(a.id));

      if (allTags.length === 0) {
        return candidates.slice(0, 4);
      }

      const scored = candidates.map(a => {
        const aTags = [...(a.ai_tags || []), ...(a.topic_tags || [])].map(t => t.toLowerCase());
        const shared = allTags.filter(t => aTags.includes(t)).length;
        return { ...a, score: shared };
      });

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
      });

      return scored.slice(0, 4);
    },
  });
}

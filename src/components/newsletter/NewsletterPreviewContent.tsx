import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NewsletterEmailPreview, type EmailTemplateData } from "./NewsletterEmailTemplate";
import { Loader2 } from "lucide-react";

interface NewsletterPreviewContentProps {
  edition: {
    id: string;
    edition_date: string;
    subject_line: string;
    editor_note?: string;
    adrians_take?: string;
    worth_watching?: any;
    heroArticle?: any;
    newsletter_top_stories?: any[];
    toolsPrompts?: any[];
  };
  showHeader?: boolean;
  onShare?: () => void;
  isCompact?: boolean;
}

export function NewsletterPreviewContent({
  edition,
  showHeader = true,
  isCompact = false,
}: NewsletterPreviewContentProps) {
  // Fetch top stories with article data
  const { data: topStories } = useQuery({
    queryKey: ["newsletter-preview-stories", edition.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_top_stories")
        .select(`
          position, ai_summary, article_id,
          articles:article_id (id, title, slug, excerpt, featured_image_url, categories:primary_category_id (slug))
        `)
        .eq("edition_id", edition.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch 3B9 items from past 7 days
  const { data: threeB9 } = useQuery({
    queryKey: ["newsletter-preview-3b9"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, top_list_items, published_at")
        .eq("article_type", "three_before_nine")
        .eq("status", "published")
        .gte("published_at", weekAgo)
        .order("published_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch guides from "learn" category this week
  const { data: guides } = useQuery({
    queryKey: ["newsletter-preview-guides"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, categories:primary_category_id (slug)")
        .eq("status", "published")
        .eq("primary_category_id", "f2be6a0a-219c-4afb-84c7-0264e26cee6c")
        .gte("published_at", weekAgo)
        .order("published_at", { ascending: false })
        .limit(2);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch tool of the week
  const { data: tool } = useQuery({
    queryKey: ["newsletter-preview-tool"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_tools_prompts")
        .select("*")
        .eq("category", "tool")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Build template data
  const baseUrl = "https://aiinasia.com";

  const heroStory = topStories?.[0]?.articles
    ? {
        title: (topStories[0].articles as any).title,
        excerpt: (topStories[0].articles as any).excerpt || "",
        url: `${baseUrl}/${(topStories[0].articles as any).categories?.slug || "news"}/${(topStories[0].articles as any).slug}`,
        imageUrl: (topStories[0].articles as any).featured_image_url || undefined,
        aiSummary: topStories[0].ai_summary || undefined,
      }
    : edition.heroArticle
    ? {
        title: edition.heroArticle.title,
        excerpt: edition.heroArticle.excerpt || "",
        url: `${baseUrl}/${edition.heroArticle.categories?.slug || "news"}/${edition.heroArticle.slug}`,
        imageUrl: edition.heroArticle.featured_image_url || undefined,
      }
    : undefined;

  const storyCards = (topStories || [])
    .slice(1)
    .filter((s: any) => s.articles)
    .map((s: any) => ({
      title: s.articles.title,
      excerpt: s.articles.excerpt || "",
      url: `${baseUrl}/${s.articles.categories?.slug || "news"}/${s.articles.slug}`,
      imageUrl: s.articles.featured_image_url || undefined,
      aiSummary: s.ai_summary || undefined,
    }));

  // Parse 3B9 top_list_items
  const b9Items: { emoji?: string; headline: string; body: string }[] = [];
  if (threeB9?.top_list_items && Array.isArray(threeB9.top_list_items)) {
    threeB9.top_list_items.slice(0, 3).forEach((item: any) => {
      b9Items.push({
        emoji: item.emoji || "☕",
        headline: item.title || item.headline || "",
        body: item.description || item.body || item.summary || "",
      });
    });
  }

  const guideCards = (guides || []).map((g: any) => ({
    title: g.title,
    excerpt: g.excerpt || "",
    url: `${baseUrl}/${g.categories?.slug || "learn"}/${g.slug}`,
  }));

  const toolData = tool
    ? { title: tool.title, description: tool.description || "", url: tool.url || undefined }
    : undefined;

  const templateData: EmailTemplateData = {
    editionDate: edition.edition_date,
    subjectLine: edition.subject_line,
    editorNote: edition.editor_note || undefined,
    heroStory,
    topStories: storyCards,
    threeBeforeNine: b9Items,
    guides: guideCards,
    tool: toolData,
    adriansTake: edition.adrians_take || undefined,
    worthWatching: edition.worth_watching || undefined,
  };

  return <NewsletterEmailPreview data={templateData} />;
}

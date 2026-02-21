import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BreadcrumbStructuredData } from "@/components/StructuredData";
import { BusinessInAByteAd } from "@/components/BusinessInAByteAd";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Skeleton } from "@/components/ui/skeleton";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { SectionHeader } from "@/components/category/SectionHeader";
import { InteractiveCard } from "@/components/category/InteractiveCard";
import { CATEGORY_CONFIG, TOKENS, type CategorySlug } from "@/constants/categoryTokens";
import { LEARNING_PATHS } from "@/constants/learningPaths";
import { PulseTracker } from "@/components/category/tools/PulseTracker";
import { ROICalculator } from "@/components/category/tools/ROICalculator";
import { ToolFinderQuiz } from "@/components/category/tools/ToolFinderQuiz";
import { PromptBuilder } from "@/components/category/tools/PromptBuilder";
import { PromptStudio } from "@/components/category/tools/PromptStudio";
import { OpinionPoll } from "@/components/category/tools/OpinionPoll";
import { PolicyTracker } from "@/components/category/tools/PolicyTracker";
import ExploreMoreButton from "@/components/ExploreMoreButton";
import { PromptAndGoBanner } from "@/components/PromptAndGoBanner";

const StockTicker = lazy(() => import("@/components/StockTicker"));
const ThreeBeforeNineTicker = lazy(() => import("@/components/ThreeBeforeNineTicker"));

// Tool component map
const TOOL_MAP: Record<string, React.FC> = {
  news: PulseTracker,
  business: ROICalculator,
  life: ToolFinderQuiz,
  learn: PromptBuilder,
  create: PromptStudio,
  voices: OpinionPoll,
  policy: PolicyTracker,
};

// Derive editorial tag from article data
function getEditorialTag(article: any): string {
  const tags = (article.ai_tags || []).map((t: string) => t.toLowerCase());
  const title = (article.title || '').toLowerCase();
  if (tags.some((t: string) => t.includes('how-to') || t.includes('tutorial')) || title.includes('how to')) return 'How-To';
  if (tags.some((t: string) => t.includes('guide')) || title.includes('guide')) return 'Guide';
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  if (article.published_at && new Date(article.published_at) < sixMonthsAgo) return 'Timeless';
  if (tags.some((t: string) => t.includes('tool')) || article.article_type === 'tools') return 'Evergreen';
  return 'Essential';
}

const decodeHtml = (s: string) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") || '';

function useRevealOnScroll(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)", transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms` } as React.CSSProperties };
}

const Category = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [enableSecondaryQueries, setEnableSecondaryQueries] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [scrolled, setScrolled] = useState(false);

  useAutoRefresh();

  useEffect(() => {
    const timer = setTimeout(() => setEnableSecondaryQueries(true), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reset filter when slug changes
  useEffect(() => { setSelectedFilter("All"); }, [slug]);

  const revealPaths = useRevealOnScroll(0);
  const revealBanner = useRevealOnScroll(100);
  const revealTool = useRevealOnScroll(200);
  const revealFeatured = useRevealOnScroll(300);
  const revealDeep = useRevealOnScroll(400);
  const revealCross = useRevealOnScroll(500);
  const revealNewsletter = useRevealOnScroll(600);

  const cfg = CATEGORY_CONFIG[slug as CategorySlug] || CATEGORY_CONFIG.news;
  const paths = LEARNING_PATHS[slug || "news"] || [];
  const ToolComponent = TOOL_MAP[slug || "news"];

  // ──────────── EXISTING SUPABASE QUERIES (unchanged) ────────────

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", slug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, color")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ["category-articles", slug],
    enabled: !!category?.id,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!category?.id) return [];
      if (slug === 'voices') {
        const { data, error } = await supabase
          .from("article_categories")
          .select(`articles!inner (id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, like_count, comment_count, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors (name, slug), categories:primary_category_id!inner (name, slug))`)
          .eq("category_id", category.id)
          .eq("articles.status", "published")
          .limit(20);
        if (error) throw error;
        return data?.map(item => item.articles).filter(article => article && article.authors?.name !== 'Intelligence Desk').sort((a: any, b: any) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()) || [];
      }
      const { data, error } = await supabase
        .from("articles")
        .select(`id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, like_count, comment_count, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors (name, slug), categories:primary_category_id (name, slug)`)
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: mostReadArticles } = useQuery({
    queryKey: ["category-most-read", slug, articles?.[0]?.id],
    enabled: enableSecondaryQueries && !!category?.id && !!articles,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!category?.id || !articles) return [];
      const excludeIds = [articles[0]?.id, ...(articles.slice(1, 5).map(a => a.id))].filter(Boolean);
      if (slug === 'voices') {
        const { data, error } = await supabase.from("article_categories").select(`articles (id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors (name, slug), categories:primary_category_id (name, slug))`).eq("category_id", category.id).eq("articles.status", "published");
        if (error) throw error;
        return data?.map(item => item.articles).filter(article => article && article.authors?.name !== 'Intelligence Desk' && !excludeIds.includes(article.id)).sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 4) || [];
      }
      const { data, error } = await supabase.from("articles").select(`id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors (name, slug), categories:primary_category_id (name, slug)`).eq("primary_category_id", category.id).eq("status", "published").not("id", "in", `(${excludeIds.join(",")})`).order("view_count", { ascending: false }).limit(4);
      if (error) throw error;
      return data;
    },
  });

  // Collect all article IDs already shown on the page
  const displayedArticleIds = useMemo(() => {
    const ids: string[] = [];
    if (articles?.[0]?.id) ids.push(articles[0].id);
    articles?.slice(1, 5).forEach((a: any) => { if (a?.id) ids.push(a.id); });
    (mostReadArticles || articles?.slice(5, 9) || []).forEach((a: any) => { if (a?.id) ids.push(a.id); });
    return ids;
  }, [articles, mostReadArticles]);

  // Deep cuts: oldest articles in category, excluding displayed articles, ordered by published_at ascending
  const { data: deepCutsArticles } = useQuery({
    queryKey: ["category-deep-cuts", slug, displayedArticleIds],
    enabled: enableSecondaryQueries && !!category?.id && displayedArticleIds.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!category?.id) return [];

      if (slug === 'voices') {
        const { data, error } = await supabase
          .from("article_categories")
          .select(`articles!inner (id, slug, title, published_at, view_count, ai_tags, topic_tags, article_tags(tags(name)), article_type, featured_image_url, featured_image_alt, categories:primary_category_id (name, slug))`)
          .eq("category_id", category.id)
          .eq("articles.status", "published");
        if (error) throw error;
        return (data?.map(item => item.articles) || [])
          .filter((a: any) => a && !displayedArticleIds.includes(a.id))
          .sort((a: any, b: any) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime())
          .slice(0, 3);
      }

      const { data, error } = await supabase
        .from("articles")
        .select("id, slug, title, published_at, view_count, ai_tags, topic_tags, article_tags(tags(name)), article_type, featured_image_url, featured_image_alt, categories:primary_category_id (name, slug)")
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .not("id", "in", `(${displayedArticleIds.join(",")})`)
        .order("published_at", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  // Count new articles this week
  const newThisWeek = useMemo(() => {
    if (!articles) return 0;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return articles.filter((a: any) => new Date(a.published_at) > weekAgo).length;
  }, [articles]);

  // Helper to extract tag names from article_tags relation
  const getArticleTagNames = (article: any): string[] => {
    const relationTags = (article.article_tags || [])
      .map((at: any) => at.tags?.name)
      .filter(Boolean);
    return [
      ...relationTags,
      ...(article.ai_tags || []),
      ...(article.topic_tags || []),
    ];
  };

  // Client-side filter helper
  const matchesFilter = (article: any) => {
    if (selectedFilter === "All") return true;
    const filterLower = selectedFilter.toLowerCase();
    const allTags = getArticleTagNames(article).map((t: string) => t.toLowerCase());
    const title = (article.title || '').toLowerCase();
    return allTags.some((t: string) => t.includes(filterLower)) ||
           title.includes(filterLower);
  };

  const featuredArticle = useMemo(() => {
    if (!articles) return undefined;
    if (selectedFilter === "All") return articles[0];
    return articles.find(matchesFilter);
  }, [articles, selectedFilter]);

  // Latest sidebar - always unfiltered (4 most recent)
  const latestArticles = articles?.slice(1, 5) || [];

  // Featured grid - filtered
  const featuredGridArticles = useMemo(() => {
    const raw = mostReadArticles?.slice(0, 4) || articles?.slice(5, 9) || [];
    if (selectedFilter === "All") return raw;
    return raw.filter(matchesFilter);
  }, [mostReadArticles, articles, selectedFilter]);

  // Filtered deep cuts
  const filteredDeepCuts = useMemo(() => {
    if (!deepCutsArticles) return [];
    if (selectedFilter === "All") return deepCutsArticles;
    return deepCutsArticles.filter(matchesFilter);
  }, [deepCutsArticles, selectedFilter]);

  // Scroll to top on filter change
  useEffect(() => {
    if (selectedFilter !== "All") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedFilter]);

  // Dynamic filter pills derived from fetched articles' tags
  const dynamicFilters = useMemo(() => {
    const allArticles = [
      ...(articles || []),
      ...(mostReadArticles || []),
      ...(deepCutsArticles || []),
    ];
    if (allArticles.length === 0) return ["All"];
    const tagCounts: Record<string, number> = {};
    const seenIds = new Set<string>();
    for (const article of allArticles) {
      if (!article?.id || seenIds.has(article.id)) continue;
      seenIds.add(article.id);
      const combined = getArticleTagNames(article);
      const seen = new Set<string>();
      for (const tag of combined) {
        const lower = (tag || '').toLowerCase().trim();
        if (!lower || lower === 'featured' || seen.has(lower)) continue;
        seen.add(lower);
        tagCounts[lower] = (tagCounts[lower] || 0) + 1;
      }
    }
    const qualifying = Object.entries(tagCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag.charAt(0).toUpperCase() + tag.slice(1));
    return ["All", ...qualifying];
  }, [articles, mostReadArticles, deepCutsArticles]);

  // Other categories for cross-nav
  const otherCategories = Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== slug).map(([k, v]) => ({ slug: k, ...v }));

  // ──────────── RENDER ────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: TOKENS.BG, color: "#fff" }}>
      <SEOHead
        title={`${category?.name || 'Category'} - AI News & Insights`}
        description={category?.description || `Explore the latest ${category?.name} articles on AI in ASIA.`}
        canonical={`https://aiinasia.com/category/${category?.slug}`}
      />
      {category && (
        <BreadcrumbStructuredData items={[{ name: 'Home', url: 'https://aiinasia.com' }, { name: category.name, url: `https://aiinasia.com/category/${category.slug}` }]} />
      )}

      <Header />

      {slug === "business" ? (
        <Suspense fallback={null}><StockTicker /></Suspense>
      ) : (
        <Suspense fallback={null}><ThreeBeforeNineTicker /></Suspense>
      )}

      {/* 1. STICKY CATEGORY SUB-NAV */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: scrolled ? "rgba(4,4,5,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? `1px solid ${TOKENS.BORDER}` : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, overflowX: "auto" }} className="scrollbar-hide">
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "4px 12px", background: `${cfg.accent}15`, borderRadius: 10 }}>
            <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 13, color: cfg.accent }} className="hidden sm:inline">{cfg.label}</span>
          </div>
          <div style={{ width: 1, height: 20, background: TOKENS.BORDER, flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {dynamicFilters.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  border: `1px solid ${selectedFilter === f ? cfg.accent + "66" : TOKENS.BORDER}`,
                  background: selectedFilter === f ? cfg.accent + "1a" : "transparent",
                  color: selectedFilter === f ? cfg.accent : TOKENS.MUTED,
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main style={{ flex: 1 }}>
        {/* 2. CATEGORY HEADER */}
        <section style={{ position: "relative", padding: "48px 0 32px", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 20%, ${cfg.accent}0f, transparent 70%)` }} />
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", position: "relative" }}>
            <div style={{ fontSize: 13, color: TOKENS.MUTED, marginBottom: 12, fontFamily: "Nunito, sans-serif" }}>
              <Link to="/" style={{ color: TOKENS.MUTED, textDecoration: "none" }}>Home</Link>
              <span style={{ margin: "0 8px" }}>/</span>
              <span style={{ color: "#fff" }}>{category?.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
              <div>
                {categoryLoading ? (
                  <Skeleton className="h-12 w-64 mb-2" />
                ) : (
                  <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, color: "#fff", margin: "0 0 6px 0", lineHeight: 1.1 }} className="text-2xl sm:text-3xl md:text-[38px]">
                    {category?.name}
                  </h1>
                )}
                <p style={{ fontSize: 15, color: "#9ca3af", fontFamily: "Nunito, sans-serif", maxWidth: 600 }}>{cfg.desc}</p>
              </div>
              {newThisWeek > 0 && (
                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, color: cfg.accent }}>
                  {newThisWeek} new this week
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Policy Atlas Banner - only on Policy category */}
        {slug === "policy" && (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px" }}>
            <Link
              to="/ai-policy-atlas"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "20px 24px",
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(234,179,8,0.08), transparent)",
                border: "1px solid rgba(234,179,8,0.2)",
                textDecoration: "none",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>🌐</span>
                <div>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>AI Policy Atlas</div>
                  <div style={{ fontSize: 14, color: "#9ca3af", fontFamily: "Nunito, sans-serif", lineHeight: 1.4 }}>
                    Interactive tracker of AI regulation across Asia-Pacific. Explore frameworks, timelines, and government positions.
                  </div>
                </div>
              </div>
              <span
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: "#eab308",
                  color: "#000",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Open Policy Atlas <span style={{ fontSize: 14 }}>&rarr;</span>
              </span>
            </Link>
          </div>
        )}

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 64px" }}>
          {articlesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
              <Skeleton className="aspect-[16/10] rounded-2xl" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            </div>
          ) : (
            <>
              {/* 3. HERO + LATEST SIDEBAR */}
              <section style={{ marginBottom: 48 }}>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
                  {/* Hero card */}
                  {featuredArticle ? (
                    <Link
                      to={`/${featuredArticle.categories?.slug || slug}/${featuredArticle.slug}`}
                      style={{
                        display: "block",
                        position: "relative",
                        borderRadius: 20,
                        overflow: "hidden",
                        border: `1px solid ${TOKENS.BORDER}`,
                        background: TOKENS.CARD_BG,
                      }}
                      className="min-h-[280px] md:min-h-[420px]"
                    >
                      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at top right, ${cfg.accent}12, transparent 60%)` }} />
                      {featuredArticle.featured_image_url && (
                        <img
                          src={featuredArticle.featured_image_url}
                          alt={featuredArticle.featured_image_alt || featuredArticle.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.3 }}
                        />
                      )}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(4,4,5,0.95) 30%, transparent 70%)" }} />
                      <div style={{ position: "absolute", top: 20, left: 20, display: "flex", gap: 8 }}>
                        <GlowBadge color={cfg.accent}>{cfg.label}</GlowBadge>
                        <GlowBadge color="#f59e0b">Featured</GlowBadge>
                      </div>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px" }}>
                        <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 27, color: "#fff", lineHeight: 1.25, margin: "0 0 10px 0" }}>
                          {decodeHtml(featuredArticle.title)}
                        </h2>
                        <p style={{ fontSize: 14, color: "#d1d5db", lineHeight: 1.5, fontFamily: "Nunito, sans-serif", margin: 0 }}>
                          {featuredArticle.excerpt?.slice(0, 160)}...
                        </p>
                        <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 12, color: TOKENS.MUTED }}>
                          <span>{featuredArticle.authors?.name}</span>
                          <span>{featuredArticle.reading_time_minutes || 5} min read</span>
                        </div>
                      </div>
                    </Link>
                  ) : slug === "policy" && selectedFilter === "All" ? (
                    <div style={{ borderRadius: 20, border: `1px solid ${TOKENS.BORDER}`, background: TOKENS.CARD_BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 16 }} className="min-h-[280px] md:min-h-[420px]">
                      <p style={{ fontSize: 16, color: "#fff", fontFamily: "Poppins, sans-serif", fontWeight: 700, textAlign: "center" }}>Policy coverage launching soon.</p>
                      <p style={{ fontSize: 14, color: "#9ca3af", fontFamily: "Nunito, sans-serif", textAlign: "center" }}>Explore the AI Policy Atlas in the meantime.</p>
                      <Link to="/ai-policy-atlas" style={{ padding: "10px 20px", borderRadius: 10, background: "#eab308", color: "#000", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                        Open Policy Atlas &rarr;
                      </Link>
                    </div>
                  ) : selectedFilter !== "All" ? (
                    <div style={{ borderRadius: 20, border: `1px solid ${TOKENS.BORDER}`, background: TOKENS.CARD_BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }} className="min-h-[280px] md:min-h-[420px]">
                      <p style={{ fontSize: 14, color: "#9ca3af", fontFamily: "Nunito, sans-serif" }}>No articles matching "{selectedFilter}" yet</p>
                    </div>
                  ) : null}

                  {/* Latest sidebar */}
                  <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-x-visible scrollbar-hide">
                    <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", margin: "0 0 4px 0" }} className="hidden md:block">Latest</h3>
                    {latestArticles.map((article: any, i: number) => (
                      <Link
                        key={article.id}
                        to={`/${article.categories?.slug || slug}/${article.slug}`}
                        className="flex-shrink-0 md:flex-shrink min-w-[200px] md:min-w-0"
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "12px 14px",
                          borderRadius: 14,
                          background: TOKENS.CARD_BG,
                          border: `1px solid ${TOKENS.BORDER}`,
                          textDecoration: "none",
                          transition: "border-color 0.2s ease",
                        }}
                      >
                        {article.featured_image_url ? (
                          <img
                            src={article.featured_image_url}
                            alt={article.featured_image_alt || article.title}
                            style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{ width: 60, height: 60, borderRadius: 8, flexShrink: 0, background: `${cfg.accent}1a`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                            {cfg.emoji}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", lineHeight: 1.35, margin: 0, fontFamily: "Poppins, sans-serif", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {decodeHtml(article.title)}
                          </h4>
                          <span style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, display: "block" }}>
                            {article.reading_time_minutes || 5} min
                          </span>
                        </div>
                      </Link>
                    ))}
                    <div className="hidden md:block"><BusinessInAByteAd /></div>
                  </div>
                </div>
              </section>

              {/* 4. LEARNING PATHS */}
              {paths.length > 0 && (
                <section ref={revealPaths.ref} style={{ marginBottom: 48, ...revealPaths.style }}>
                  <SectionHeader title="Learning Paths" emoji="🗺️" color={cfg.accent} subtitle="Curated sequences to guide your reading" />
                  <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {paths.map((p, i) => (
                      <LearningPathCard key={i} path={p} />
                    ))}
                  </div>
                </section>
              )}



              {/* 5. INTERACTIVE TOOL */}
              {ToolComponent && (
                <section ref={revealTool.ref} style={{ marginBottom: 48, ...revealTool.style }}>
                  <SectionHeader title={`${cfg.label} Tools`} emoji="🛠️" color={cfg.accent} subtitle="Interactive tools for this category" />
                  <ToolComponent />
                </section>
              )}

              {/* 6. FEATURED ARTICLES */}
              <section ref={revealFeatured.ref} style={{ marginBottom: 48, ...revealFeatured.style }}>
                <SectionHeader
                  title="Featured"
                  emoji="⭐"
                  color={cfg.accent}
                  rightAction={
                    <Link
                      to={`/category/${slug}/all`}
                      style={{
                        fontSize: 12,
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 600,
                        color: cfg.accent,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      View all {articles?.length || ""} articles &rarr;
                    </Link>
                  }
                />
                {featuredGridArticles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {featuredGridArticles.map((article: any) => (
                      <FeaturedCard
                        key={article.id}
                        article={article}
                        cfg={cfg}
                        slug={slug}
                        imageHeight={140}
                        navigate={navigate}
                      />
                    ))}
                  </div>
                ) : selectedFilter !== "All" ? (
                  <p style={{ fontSize: 14, color: "#9ca3af", fontFamily: "Nunito, sans-serif", padding: "20px 0" }}>No articles matching "{selectedFilter}" yet</p>
                ) : null}
              </section>

              {/* 7. DEEP CUTS */}
              <section ref={revealDeep.ref} style={{ marginBottom: 48, ...revealDeep.style }}>
                <SectionHeader
                  title="Deep Cuts from the Archives"
                  emoji="💎"
                  color="#ef4444"
                  subtitle="Editor-picked articles that are just as relevant today as when they were published."
                />
                {filteredDeepCuts.length > 0 ? (
                  <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {filteredDeepCuts.map((dc: any) => (
                      <FeaturedCard
                        key={dc.id}
                        article={dc}
                        cfg={cfg}
                        slug={slug}
                        imageHeight={120}
                        navigate={navigate}
                        tag={getEditorialTag(dc)}
                        tagColor="#ef4444"
                      />
                    ))}
                  </div>
                ) : selectedFilter !== "All" ? (
                  <p style={{ fontSize: 14, color: "#9ca3af", fontFamily: "Nunito, sans-serif", padding: "20px 0" }}>No articles matching "{selectedFilter}" yet</p>
                ) : null}
              </section>

              {/* 8. CROSS-CATEGORY NAVIGATION */}
              <section ref={revealCross.ref} style={{ marginBottom: 48, ...revealCross.style }}>
                <SectionHeader title="Explore Other Categories" emoji="🌐" color={TOKENS.BRAND} />
                <div className="flex md:grid md:grid-cols-5 gap-3.5 overflow-x-auto scrollbar-hide">
                  {otherCategories.map((cat) => (
                    <CrossCategoryCard key={cat.slug} cat={cat} />
                  ))}
                </div>
              </section>

              {/* 9. NEWSLETTER CTA */}
              <section ref={revealNewsletter.ref} style={{ marginBottom: 24, ...revealNewsletter.style }}>
                <div
                  style={{
                    borderRadius: 20,
                    padding: "48px 40px",
                    background: `linear-gradient(135deg, ${cfg.accent}20, ${TOKENS.BRAND}20)`,
                    border: `1px solid ${TOKENS.BORDER}`,
                    textAlign: "center",
                  }}
                >
                  <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 28, color: "#fff", margin: "0 0 8px 0" }}>
                    Never Miss an AI Breakthrough
                  </h2>
                  <p style={{ fontSize: 14, color: "#9ca3af", fontFamily: "Nunito, sans-serif", margin: "0 0 24px 0" }}>
                    Get the best of {cfg.label} delivered to your inbox every week.
                  </p>
                  <div className="flex flex-col min-[480px]:flex-row justify-center gap-2 max-w-[440px] mx-auto">
                    <input
                      type="email"
                      placeholder="you@example.com"
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: `1px solid ${TOKENS.BORDER}`,
                        background: TOKENS.CARD_BG,
                        color: "#fff",
                        fontFamily: "Nunito, sans-serif",
                        fontSize: 14,
                        outline: "none",
                      }}
                    />
                    <button
                      style={{
                        padding: "12px 28px",
                        borderRadius: 12,
                        background: cfg.accent,
                        color: "#000",
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 800,
                        fontSize: 13,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Subscribe
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <ExploreMoreButton />
      <Footer />
    </div>
  );
};

// ─── Sub-components ───

function FeaturedCard({ article, cfg, slug, imageHeight, navigate, tag, tagColor }: { article: any; cfg: any; slug: string | undefined; imageHeight: number; navigate: any; tag?: string; tagColor?: string }) {
  const [hovered, setHovered] = useState(false);
  const displayTag = tag || cfg.label;
  const displayTagColor = tagColor || cfg.accent;
  const meta = article.published_at ? new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : undefined;

  return (
    <div
      onClick={() => navigate(`/${article.categories?.slug || slug}/${article.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14,
        background: hovered ? "#151820" : "#0d0e12",
        border: `1px solid ${hovered ? `${displayTagColor}40` : "#1a1d25"}`,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.25s ease",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", height: imageHeight, overflow: "hidden" }}>
        {article.featured_image_url ? (
          <img
            src={article.featured_image_url}
            alt={article.featured_image_alt || article.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: hovered ? "scale(1.03)" : "scale(1)",
              transition: "transform 0.3s ease",
            }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: `${cfg.accent}1a`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
            {cfg.emoji}
          </div>
        )}
      </div>
      <div style={{ padding: "14px" }}>
        {(displayTag || meta) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            {displayTag && displayTagColor ? <GlowBadge color={displayTagColor} small>{displayTag}</GlowBadge> : <span />}
            {meta && <span style={{ fontSize: 12, color: "#9ca3af" }}>{meta}</span>}
          </div>
        )}
        <h3 style={{ fontSize: 14, fontFamily: "Poppins, sans-serif", fontWeight: 700, color: "#ffffff", lineHeight: 1.4, margin: 0 }}>
          {decodeHtml(article.title)}
        </h3>
      </div>
    </div>
  );
}

function LearningPathCard({ path }: { path: { emoji: string; title: string; desc: string; articles: number; time: string; color: string } }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 24,
        borderRadius: 14,
        minHeight: 160,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: TOKENS.CARD_BG,
        border: `1px solid ${hovered ? path.color + "4d" : TOKENS.BORDER}`,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.3)" : "none",
        transition: "all 0.25s ease",
        cursor: "pointer",
      }}
    >
      {/* Radial gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 90% 10%, ${path.color}${hovered ? "24" : "14"}, transparent 60%)`, transition: "background 0.25s ease", pointerEvents: "none" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Emoji container */}
        <div style={{ width: 52, height: 52, borderRadius: 12, background: `${path.color}1f`, border: `1px solid ${path.color}33`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{path.emoji}</span>
        </div>

        <h4 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 15, color: "#f3f4f6", margin: "0 0 0 0", lineHeight: 1.3 }}>{path.title}</h4>
        <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: "Nunito, sans-serif", margin: "6px 0 12px 0", lineHeight: 1.5 }}>{path.desc}</p>

        {/* Bottom area */}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: path.color, fontFamily: "Poppins, sans-serif" }}>
            {path.articles} articles - {path.time}
          </span>
          {/* Arrow indicator */}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={path.color}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: hovered ? 1 : 0.4, transform: hovered ? "translateX(3px)" : "translateX(0)", transition: "all 0.25s ease", flexShrink: 0 }}
          >
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 4, background: "#1a1d25", marginTop: 12 }} />
      </div>
    </div>
  );
}

function CrossCategoryCard({ cat }: { cat: { slug: string; accent: string; emoji: string; label: string; desc: string } }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/category/${cat.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
      padding: "18px",
      borderRadius: 14,
      background: hovered ? `${cat.accent}08` : TOKENS.CARD_BG,
      border: `1px solid ${hovered ? cat.accent + "40" : TOKENS.BORDER}`,
      cursor: "pointer",
      transition: "all 0.25s ease",
      minWidth: 150,
      flexShrink: 0,
    }}
    >
      <span style={{ fontSize: 22, display: "block", marginBottom: 8 }}>{cat.emoji}</span>
      <h4 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: cat.accent, margin: "0 0 4px 0" }}>{cat.label}</h4>
      <p style={{ fontSize: 12, color: "#9ca3af", fontFamily: "Nunito, sans-serif", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {cat.desc}
      </p>
    </div>
  );
}

export default Category;

import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BreadcrumbStructuredData } from "@/components/StructuredData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/category/SectionHeader";
import { CATEGORY_CONFIG, TOKENS, type CategorySlug } from "@/constants/categoryTokens";
import { LEARNING_PATHS } from "@/constants/learningPaths";
import { iconMap } from "@/lib/iconMap";
import ExploreMoreButton from "@/components/ExploreMoreButton";
import { useRevealOnScroll } from "@/lib/scrollAnimation";

// Sub-components
import { CategorySubNav } from "@/components/category/CategorySubNav";
import { CategoryHeader } from "@/components/category/CategoryHeader";
import { CategoryHeroSection } from "@/components/category/CategoryHeroSection";
import { CategoryLearningPaths } from "@/components/category/CategoryLearningPaths";
import { CategoryFeaturedGrid } from "@/components/category/CategoryFeaturedGrid";
import { CategoryDeepCuts } from "@/components/category/CategoryDeepCuts";
import { CategoryCrossNav } from "@/components/category/CategoryCrossNav";
import { CategoryNewsletter } from "@/components/category/CategoryNewsletter";

// Lazy-load interactive tools — they are below the fold
const PulseTracker = lazy(() => import("@/components/category/tools/PulseTracker").then(m => ({ default: m.PulseTracker })));
const ROICalculator = lazy(() => import("@/components/category/tools/ROICalculator").then(m => ({ default: m.ROICalculator })));
const ToolFinderQuiz = lazy(() => import("@/components/category/tools/ToolFinderQuiz").then(m => ({ default: m.ToolFinderQuiz })));
const PromptBuilder = lazy(() => import("@/components/category/tools/PromptBuilder").then(m => ({ default: m.PromptBuilder })));
const PromptStudio = lazy(() => import("@/components/category/tools/PromptStudio").then(m => ({ default: m.PromptStudio })));
const OpinionPoll = lazy(() => import("@/components/category/tools/OpinionPoll").then(m => ({ default: m.OpinionPoll })));
const PolicyTracker = lazy(() => import("@/components/category/tools/PolicyTracker").then(m => ({ default: m.PolicyTracker })));

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

  const revealPaths = useRevealOnScroll();
  const revealTool = useRevealOnScroll();
  const revealFeatured = useRevealOnScroll();
  const revealDeep = useRevealOnScroll();
  const revealCross = useRevealOnScroll();
  const revealNewsletter = useRevealOnScroll();

  const cfg = CATEGORY_CONFIG[slug as CategorySlug] || CATEGORY_CONFIG.news;
  const paths = LEARNING_PATHS[slug || "news"] || [];
  const ToolComponent = TOOL_MAP[slug || "news"];

  // ──────────── SUPABASE QUERIES ────────────

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

  const { data: allCategoryArticles, isLoading: articlesLoading } = useQuery({
    queryKey: ["category-all-articles", slug],
    enabled: !!category?.id,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!category?.id) return [];
      if (slug === 'voices' || slug === 'policy') {
        const { data, error } = await supabase
          .from("article_categories")
          .select(`articles!inner (id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, like_count, comment_count, reading_time_minutes, ai_tags, topic_tags, is_trending, featured_on_homepage, article_tags(tags(name)), authors (name, slug), categories:primary_category_id!inner (name, slug))`)
          .eq("category_id", category.id)
          .eq("articles.status", "published");
        if (error) throw error;
        return data
          ?.map(item => item.articles)
          .filter((a) => a && (slug !== 'voices' || a.authors?.name !== 'Intelligence Desk'))
          .sort((a: any, b: any) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()) || [];
      }
      const { data, error } = await supabase
        .from("articles")
        .select(`id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, like_count, comment_count, reading_time_minutes, ai_tags, topic_tags, is_trending, featured_on_homepage, article_tags(tags(name)), authors (name, slug), categories:primary_category_id (name, slug)`)
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const articles = allCategoryArticles?.slice(0, 20) || null;

  const { data: mostReadArticles } = useQuery({
    queryKey: ["category-most-read", slug, articles?.[0]?.id],
    enabled: enableSecondaryQueries && !!category?.id && !!articles,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!category?.id || !articles) return [];
      const excludeIds = [articles[0]?.id, ...(articles.slice(1, 5).map(a => a.id))].filter(Boolean);
      if (slug === 'voices' || slug === 'policy') {
        const { data, error } = await supabase.from("article_categories").select(`articles (id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors (name, slug), categories:primary_category_id (name, slug))`).eq("category_id", category.id).eq("articles.status", "published");
        if (error) throw error;
        return data?.map(item => item.articles).filter(article => article && !excludeIds.includes(article.id)).sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 4) || [];
      }
      const { data, error } = await supabase.from("articles").select(`id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors (name, slug), categories:primary_category_id (name, slug)`).eq("primary_category_id", category.id).eq("status", "published").not("id", "in", `(${excludeIds.join(",")})`).order("view_count", { ascending: false }).limit(4);
      if (error) throw error;
      return data;
    },
  });

  const displayedArticleIds = useMemo(() => {
    const ids: string[] = [];
    if (articles?.[0]?.id) ids.push(articles[0].id);
    articles?.slice(1, 5).forEach((a: any) => { if (a?.id) ids.push(a.id); });
    (mostReadArticles || articles?.slice(5, 9) || []).forEach((a: any) => { if (a?.id) ids.push(a.id); });
    return ids;
  }, [articles, mostReadArticles]);

  const { data: deepCutsArticles } = useQuery({
    queryKey: ["category-deep-cuts", slug, displayedArticleIds],
    enabled: enableSecondaryQueries && !!category?.id && displayedArticleIds.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!category?.id) return [];
      if (slug === 'voices' || slug === 'policy') {
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

  // ──────────── DERIVED STATE ────────────

  const newThisWeek = useMemo(() => {
    if (!articles) return 0;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return articles.filter((a: any) => new Date(a.published_at) > weekAgo).length;
  }, [articles]);

  const getArticleTagNames = (article: any): string[] => {
    const relationTags = (article.article_tags || [])
      .map((at: any) => at.tags?.name)
      .filter(Boolean);
    return [...relationTags, ...(article.ai_tags || []), ...(article.topic_tags || [])];
  };

  const dynamicFilters = useMemo(() => {
    if (!allCategoryArticles || allCategoryArticles.length === 0) return ["All"];
    const tagCounts: Record<string, number> = {};
    const seenIds = new Set<string>();
    for (const article of allCategoryArticles) {
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
  }, [allCategoryArticles]);

  const matchesFilter = useMemo(() => {
    return (article: any) => {
      if (selectedFilter === "All") return true;
      const filterLower = selectedFilter.toLowerCase();
      const allTags = getArticleTagNames(article).map((t: string) => t.toLowerCase());
      const title = (article.title || '').toLowerCase();
      return allTags.some((t: string) => t.includes(filterLower)) || title.includes(filterLower);
    };
  }, [selectedFilter]);

  const isFilterActive = selectedFilter !== "All";

  const filteredAllArticles = useMemo(() => {
    if (!isFilterActive || !allCategoryArticles) return [];
    return allCategoryArticles.filter(matchesFilter);
  }, [allCategoryArticles, isFilterActive, matchesFilter]);

  const featuredArticle = useMemo(() => {
    if (isFilterActive) return filteredAllArticles[0];
    if (!articles || articles.length === 0) return null;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const isFeaturedOrTrending = (a: any) => a.is_trending || a.featured_on_homepage;
    for (const days of [30, 60, 90]) {
      const cutoff = now - days * dayMs;
      const candidate = articles.find(
        (a: any) => isFeaturedOrTrending(a) && new Date(a.published_at).getTime() >= cutoff
      );
      if (candidate) return candidate;
    }
    const anyFeatured = articles.find((a: any) => isFeaturedOrTrending(a));
    if (anyFeatured) return anyFeatured;
    return articles[0];
  }, [articles, isFilterActive, filteredAllArticles]);

  const latestArticles = useMemo(() => {
    if (isFilterActive) return filteredAllArticles.slice(1, 5);
    return (articles || []).filter((a: any) => a.id !== featuredArticle?.id).slice(0, 4);
  }, [articles, isFilterActive, filteredAllArticles, featuredArticle]);

  const featuredGridArticles = useMemo(() => {
    if (isFilterActive) return filteredAllArticles.slice(1, 5);
    const excludeIds = new Set([featuredArticle?.id, ...latestArticles.map((a: any) => a.id)].filter(Boolean));
    return (allCategoryArticles || []).filter((a: any) => !excludeIds.has(a.id)).slice(0, 4);
  }, [allCategoryArticles, isFilterActive, filteredAllArticles, featuredArticle, latestArticles]);

  const filteredDeepCuts = useMemo(() => {
    if (isFilterActive) {
      const heroAndFeaturedIds = new Set(filteredAllArticles.slice(0, 5).map((a: any) => a.id));
      return filteredAllArticles
        .filter((a: any) => !heroAndFeaturedIds.has(a.id))
        .sort((a: any, b: any) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime())
        .slice(0, 3);
    }
    return deepCutsArticles || [];
  }, [deepCutsArticles, isFilterActive, filteredAllArticles]);

  const otherCategories = Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== slug).map(([k, v]) => ({ slug: k, ...v }));

  // ──────────── RENDER ────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: TOKENS.BG, color: "#fff" }}>
      <SEOHead
        title={`${cfg.label} - AI in Asia`}
        description={cfg.metaDesc}
        canonical={`https://aiinasia.com/category/${slug}`}
        ogType="website"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": `${cfg.label} - AI in Asia`,
          "description": cfg.metaDesc,
          "url": `https://aiinasia.com/category/${slug}`,
        }}
      />
      {category && (
        <BreadcrumbStructuredData items={[{ name: 'Home', url: '/' }, { name: category.name, url: `/category/${category.slug}` }]} />
      )}

      <Header />

      {slug === "business" ? (
        <Suspense fallback={null}><StockTicker /></Suspense>
      ) : (
        <Suspense fallback={null}><ThreeBeforeNineTicker /></Suspense>
      )}

      {/* 1. STICKY CATEGORY SUB-NAV */}
      <CategorySubNav
        filters={dynamicFilters}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        cfg={cfg}
        scrolled={scrolled}
      />

      <main id="main-content" style={{ flex: 1 }}>
        {/* 2. CATEGORY HEADER */}
        <CategoryHeader
          category={category}
          cfg={cfg}
          newThisWeek={newThisWeek}
          isLoading={categoryLoading}
        />

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
                {(() => { const GlobeIcon = iconMap["globe"]; return GlobeIcon ? <GlobeIcon style={{ width: 28, height: 28, color: "#eab308", flexShrink: 0 }} /> : null; })()}
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
          {/* 3. HERO + LATEST SIDEBAR */}
          <CategoryHeroSection
            featuredArticle={featuredArticle}
            latestArticles={latestArticles}
            cfg={cfg}
            slug={slug}
            isFilterActive={isFilterActive}
            selectedFilter={selectedFilter}
            isLoading={articlesLoading}
          />

          {!articlesLoading && (
            <>
              {/* 4. LEARNING PATHS */}
              <CategoryLearningPaths
                paths={paths}
                categorySlug={slug || "news"}
                revealProps={revealPaths}
                accent={cfg.accent}
              />

              {/* 5. INTERACTIVE TOOL */}
              {ToolComponent && (
                <section ref={revealTool.ref} style={{ marginBottom: 48, ...revealTool.style }}>
                  <SectionHeader title={`${cfg.label} Tools`} emoji="wrench" color={cfg.accent} subtitle="Interactive tools for this category" />
                  <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
                    <ToolComponent />
                  </Suspense>
                </section>
              )}

              {/* 6. FEATURED ARTICLES */}
              <CategoryFeaturedGrid
                articles={featuredGridArticles}
                cfg={cfg}
                slug={slug}
                revealProps={revealFeatured}
                selectedFilter={selectedFilter}
                totalCount={allCategoryArticles?.length || 0}
              />

              {/* 7. DEEP CUTS */}
              <CategoryDeepCuts
                articles={filteredDeepCuts}
                cfg={cfg}
                slug={slug}
                revealProps={revealDeep}
                selectedFilter={selectedFilter}
              />

              {/* 8. CROSS-CATEGORY NAVIGATION */}
              <CategoryCrossNav
                categories={otherCategories}
                revealProps={revealCross}
              />

              {/* 9. NEWSLETTER CTA */}
              <CategoryNewsletter
                cfg={cfg}
                revealProps={revealNewsletter}
              />
            </>
          )}
        </div>
      </main>

      <ExploreMoreButton />
      <Footer />
    </div>
  );
};

export default Category;

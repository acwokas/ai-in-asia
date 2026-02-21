import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
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
import ExploreMoreButton from "@/components/ExploreMoreButton";

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
};

// Deep cuts per category (hardcoded for now)
const DEEP_CUTS: Record<string, { tag: string; title: string; date: string }[]> = {
  news: [
    { tag: "Timeless", title: "The day Singapore became Asia's AI capital", date: "Mar 2025" },
    { tag: "Essential", title: "Understanding China's AI governance model", date: "Jan 2025" },
    { tag: "Guide", title: "How to read an AI policy document", date: "Nov 2024" },
  ],
  business: [
    { tag: "How-To", title: "Building an AI business case your CFO will approve", date: "Feb 2025" },
    { tag: "Essential", title: "The real cost of AI implementation in ASEAN", date: "Dec 2024" },
    { tag: "Timeless", title: "Why 70% of enterprise AI projects fail", date: "Oct 2024" },
  ],
  life: [
    { tag: "Guide", title: "A parent's guide to AI safety in schools", date: "Jan 2025" },
    { tag: "Timeless", title: "How AI is reshaping healthcare across Asia", date: "Nov 2024" },
    { tag: "Essential", title: "Digital privacy in the age of AI", date: "Sep 2024" },
  ],
  learn: [
    { tag: "How-To", title: "Prompt engineering from zero to hero", date: "Mar 2025" },
    { tag: "Guide", title: "The complete beginner's guide to AI tools", date: "Jan 2025" },
    { tag: "Essential", title: "Understanding LLMs without a PhD", date: "Nov 2024" },
  ],
  create: [
    { tag: "How-To", title: "Building a content pipeline with AI", date: "Feb 2025" },
    { tag: "Timeless", title: "The art of AI-assisted design", date: "Dec 2024" },
    { tag: "Guide", title: "Choosing the right AI image generator", date: "Oct 2024" },
  ],
  voices: [
    { tag: "Essential", title: "Why Asia will lead the next AI wave", date: "Mar 2025" },
    { tag: "Timeless", title: "The ethics of AI in developing nations", date: "Jan 2025" },
    { tag: "Guide", title: "How practitioners are thinking about AGI", date: "Nov 2024" },
  ],
};

const decodeHtml = (s: string) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") || '';

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

  const cfg = CATEGORY_CONFIG[slug as CategorySlug] || CATEGORY_CONFIG.news;
  const paths = LEARNING_PATHS[slug || "news"] || [];
  const deepCuts = DEEP_CUTS[slug || "news"] || [];
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
          .select(`articles!inner (id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, like_count, comment_count, reading_time_minutes, authors (name, slug), categories:primary_category_id!inner (name, slug))`)
          .eq("category_id", category.id)
          .eq("articles.status", "published")
          .limit(20);
        if (error) throw error;
        return data?.map(item => item.articles).filter(article => article && article.authors?.name !== 'Intelligence Desk').sort((a: any, b: any) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()) || [];
      }
      const { data, error } = await supabase
        .from("articles")
        .select(`id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, like_count, comment_count, reading_time_minutes, authors (name, slug), categories:primary_category_id (name, slug)`)
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
        const { data, error } = await supabase.from("article_categories").select(`articles (id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes, authors (name, slug), categories:primary_category_id (name, slug))`).eq("category_id", category.id).eq("articles.status", "published");
        if (error) throw error;
        return data?.map(item => item.articles).filter(article => article && article.authors?.name !== 'Intelligence Desk' && !excludeIds.includes(article.id)).sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 4) || [];
      }
      const { data, error } = await supabase.from("articles").select(`id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes, authors (name, slug), categories:primary_category_id (name, slug)`).eq("primary_category_id", category.id).eq("status", "published").not("id", "in", `(${excludeIds.join(",")})`).order("view_count", { ascending: false }).limit(4);
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

  const featuredArticle = articles?.[0];
  const latestArticles = articles?.slice(1, 5) || [];
  const featuredGridArticles = mostReadArticles?.slice(0, 4) || articles?.slice(5, 9) || [];

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
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "4px 12px", background: `${cfg.accent}15`, borderRadius: 10 }}>
            <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 13, color: cfg.accent }}>{cfg.label}</span>
          </div>
          <div style={{ width: 1, height: 20, background: TOKENS.BORDER, flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {cfg.filters.map((f) => (
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
                  <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 38, color: "#fff", margin: "0 0 6px 0", lineHeight: 1.1 }}>
                    {category?.name}
                  </h1>
                )}
                <p style={{ fontSize: 15, color: TOKENS.MUTED, fontFamily: "Nunito, sans-serif", maxWidth: 600 }}>{cfg.desc}</p>
              </div>
              {newThisWeek > 0 && (
                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, color: cfg.accent }}>
                  {newThisWeek} new this week
                </span>
              )}
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 64px" }}>
          {articlesLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
              <Skeleton className="aspect-[16/10] rounded-2xl" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            </div>
          ) : (
            <>
              {/* 3. HERO + LATEST SIDEBAR */}
              <section style={{ marginBottom: 48 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
                  {/* Hero card */}
                  {featuredArticle && (
                    <Link
                      to={`/${featuredArticle.categories?.slug || slug}/${featuredArticle.slug}`}
                      style={{
                        display: "block",
                        position: "relative",
                        borderRadius: 20,
                        overflow: "hidden",
                        border: `1px solid ${TOKENS.BORDER}`,
                        background: TOKENS.CARD_BG,
                        minHeight: 420,
                      }}
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
                        <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.5, fontFamily: "Nunito, sans-serif", margin: 0 }}>
                          {featuredArticle.excerpt?.slice(0, 160)}...
                        </p>
                        <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 12, color: TOKENS.MUTED }}>
                          <span>{featuredArticle.authors?.name}</span>
                          <span>{featuredArticle.reading_time_minutes || 5} min read</span>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Latest sidebar */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", margin: "0 0 4px 0" }}>Latest</h3>
                    {latestArticles.map((article: any, i: number) => (
                      <Link
                        key={article.id}
                        to={`/${article.categories?.slug || slug}/${article.slug}`}
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
                        <div
                          style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: `${cfg.accent}1a`, color: cfg.accent,
                            fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 13,
                          }}
                        >
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.35, margin: 0, fontFamily: "Poppins, sans-serif", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {decodeHtml(article.title)}
                          </h4>
                          <span style={{ fontSize: 11, color: TOKENS.MUTED, marginTop: 4, display: "block" }}>
                            {article.reading_time_minutes || 5} min
                          </span>
                        </div>
                      </Link>
                    ))}
                    <BusinessInAByteAd />
                  </div>
                </div>
              </section>

              {/* 4. LEARNING PATHS */}
              {paths.length > 0 && (
                <section style={{ marginBottom: 48 }}>
                  <SectionHeader title="Learning Paths" emoji="🗺️" color={cfg.accent} subtitle="Curated sequences to guide your reading" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                    {paths.map((p, i) => (
                      <LearningPathCard key={i} path={p} />
                    ))}
                  </div>
                </section>
              )}

              {/* 5. INTERACTIVE TOOL */}
              {ToolComponent && (
                <section style={{ marginBottom: 48 }}>
                  <SectionHeader title={`${cfg.label} Tools`} emoji="🛠️" color={cfg.accent} subtitle="Interactive tools for this category" />
                  <ToolComponent />
                </section>
              )}

              {/* 6. FEATURED ARTICLES */}
              {featuredGridArticles.length > 0 && (
                <section style={{ marginBottom: 48 }}>
                  <SectionHeader title="Featured" emoji="⭐" color={cfg.accent} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                    {featuredGridArticles.map((article: any) => (
                      <InteractiveCard
                        key={article.id}
                        title={decodeHtml(article.title)}
                        tag={cfg.label}
                        tagColor={cfg.accent}
                        meta={article.published_at ? new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : undefined}
                        onClick={() => navigate(`/${article.categories?.slug || slug}/${article.slug}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 7. DEEP CUTS */}
              {deepCuts.length > 0 && (
                <section style={{ marginBottom: 48 }}>
                  <SectionHeader
                    title="Deep Cuts from the Archives"
                    emoji="💎"
                    color="#ef4444"
                    subtitle="Editor-picked articles that are just as relevant today as when they were published."
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                    {deepCuts.map((dc, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "18px 20px",
                          borderRadius: 14,
                          background: TOKENS.CARD_BG,
                          border: `1px solid ${TOKENS.BORDER}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <GlowBadge color="#ef4444" small>{dc.tag}</GlowBadge>
                          <span style={{ fontSize: 11, color: TOKENS.MUTED }}>{dc.date}</span>
                        </div>
                        <h3 style={{ fontSize: 14, fontFamily: "Poppins, sans-serif", fontWeight: 700, color: "#fff", lineHeight: 1.4, margin: 0 }}>
                          {dc.title}
                        </h3>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 8. CROSS-CATEGORY NAVIGATION */}
              <section style={{ marginBottom: 48 }}>
                <SectionHeader title="Explore Other Categories" emoji="🌐" color={TOKENS.BRAND} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
                  {otherCategories.map((cat) => (
                    <CrossCategoryCard key={cat.slug} cat={cat} />
                  ))}
                </div>
              </section>

              {/* 9. NEWSLETTER CTA */}
              <section style={{ marginBottom: 24 }}>
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
                  <p style={{ fontSize: 14, color: TOKENS.MUTED, fontFamily: "Nunito, sans-serif", margin: "0 0 24px 0" }}>
                    Get the best of {cfg.label} delivered to your inbox every week.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, maxWidth: 440, margin: "0 auto" }}>
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

function LearningPathCard({ path }: { path: { emoji: string; title: string; desc: string; articles: number; time: string; color: string } }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "20px",
        borderRadius: 14,
        background: hovered ? `${path.color}08` : TOKENS.CARD_BG,
        border: `1px solid ${hovered ? path.color + "40" : TOKENS.BORDER}`,
        transition: "all 0.25s ease",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 24, display: "block", marginBottom: 10 }}>{path.emoji}</span>
      <h4 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", margin: "0 0 4px 0" }}>{path.title}</h4>
      <p style={{ fontSize: 12, color: TOKENS.MUTED, fontFamily: "Nunito, sans-serif", margin: "0 0 12px 0" }}>{path.desc}</p>
      <span style={{ fontSize: 11, fontWeight: 700, color: path.color, fontFamily: "Poppins, sans-serif" }}>
        {path.articles} articles - {path.time}
      </span>
      <div style={{ height: 3, borderRadius: 2, background: TOKENS.BORDER, marginTop: 10 }} />
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
      }}
    >
      <span style={{ fontSize: 22, display: "block", marginBottom: 8 }}>{cat.emoji}</span>
      <h4 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: cat.accent, margin: "0 0 4px 0" }}>{cat.label}</h4>
      <p style={{ fontSize: 12, color: TOKENS.MUTED, fontFamily: "Nunito, sans-serif", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {cat.desc}
      </p>
    </div>
  );
}

export default Category;

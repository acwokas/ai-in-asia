import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CATEGORY_CONFIG, TOKENS, type CategorySlug } from "@/constants/categoryTokens";
import { LEARNING_PATHS, type LearningPath } from "@/constants/learningPaths";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { SectionHeader } from "@/components/category/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import ExploreMoreButton from "@/components/ExploreMoreButton";
import { useRevealOnScroll } from "@/lib/scrollAnimation";
import { filterArticlesForPath } from "@/lib/learningPathMatcher";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { awardPoints } from "@/lib/gamification";

const decodeHtml = (s: string) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") || '';

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "#22c55e",
  Intermediate: "#f59e0b",
  Advanced: "#ef4444",
};

const LearningPathDetail = () => {
  const { slug: categorySlug, pathSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const cfg = CATEGORY_CONFIG[categorySlug as CategorySlug] || CATEGORY_CONFIG.news;
  const paths = LEARNING_PATHS[categorySlug || "news"] || [];
  const path = paths.find((p) => p.slug === pathSlug);

  // Get category ID
  const { data: category } = useQuery({
    queryKey: ["category", categorySlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch articles matching the path's tags
  const { data: pathArticles, isLoading } = useQuery({
    queryKey: ["learning-path-articles", categorySlug, pathSlug],
    enabled: !!category?.id && !!path,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!category?.id || !path) return [];

      // Fetch all published articles for the category
      let articles: any[] = [];
      if (categorySlug === 'voices' || categorySlug === 'policy') {
        const { data, error } = await supabase
          .from("article_categories")
          .select(`articles!inner (id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors(name, slug), categories:primary_category_id(name, slug))`)
          .eq("category_id", category.id)
          .eq("articles.status", "published");
        if (error) throw error;
        articles = data?.map((item: any) => item.articles).filter(Boolean) || [];
      } else {
        const { data, error } = await supabase
          .from("articles")
          .select("id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors(name, slug), categories:primary_category_id(name, slug)")
          .eq("primary_category_id", category.id)
          .eq("status", "published")
          .order("published_at", { ascending: false });
        if (error) throw error;
        articles = data || [];
      }

      // Filter by path tags using improved fuzzy matcher
      return filterArticlesForPath(articles, path);
    },
  });

  const displayArticles = pathArticles?.slice(0, path?.articles || 8) || [];

  // Read state from localStorage
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`lp-read-${categorySlug}-${pathSlug}`);
      if (stored) setReadArticles(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, [categorySlug, pathSlug]);

  const toggleRead = (id: string) => {
    setReadArticles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(`lp-read-${categorySlug}-${pathSlug}`, JSON.stringify([...next])); } catch { /* ignore */ }
      
      // Check for completion celebration
      if (!next.has(id)) return next; // Only celebrate on marking as read
      const totalArticles = pathArticles?.slice(0, path?.articles || 8).length || 0;
      if (next.size === totalArticles && totalArticles > 0) {
        const completedKey = `lp-completed-${categorySlug}-${pathSlug}`;
        if (!localStorage.getItem(completedKey)) {
          localStorage.setItem(completedKey, "1");
          if (user) {
            awardPoints(user.id, 20, `completing ${path?.title}`);
          }
          setTimeout(() => {
            toast("🎉 Path Complete!", {
              description: `You've finished the ${path?.title} learning path!`,
              duration: 5000,
            });
          }, 300);
        }
      }
      
      return next;
    });
  };

  // Find first unread article for "Continue" button
  const firstUnreadIndex = useMemo(() => {
    return displayArticles.findIndex((a: any) => !readArticles.has(a.id));
  }, [displayArticles, readArticles]);

  const handleContinue = useCallback(() => {
    if (firstUnreadIndex >= 0) {
      document.getElementById(`step-${firstUnreadIndex}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [firstUnreadIndex]);

  // Related paths from same category (excluding current)
  const relatedPaths = paths.filter((p) => p.slug !== pathSlug).slice(0, 3);

  // Cross-category paths
  const crossPaths = useMemo(() => {
    const result: { categorySlug: string; cfg: typeof cfg; path: LearningPath }[] = [];
    for (const [catSlug, catPaths] of Object.entries(LEARNING_PATHS)) {
      if (catSlug === categorySlug) continue;
      if (catPaths[0]) {
        result.push({ categorySlug: catSlug, cfg: CATEGORY_CONFIG[catSlug as CategorySlug] || CATEGORY_CONFIG.news, path: catPaths[0] });
      }
      if (result.length >= 3) break;
    }
    return result;
  }, [categorySlug]);

  const revealTimeline = useRevealOnScroll();
  const revealCross = useRevealOnScroll();

  // Progress calculation
  const progressPercent = displayArticles.length > 0
    ? Math.round((readArticles.size / displayArticles.length) * 100)
    : 0;

  if (!path) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: TOKENS.BG, color: "#fff" }}>
        <Header />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>🗺️</p>
            <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 24, color: "#fff", marginBottom: 8 }}>Path not found</h1>
            <p style={{ fontSize: 14, color: TOKENS.MUTED, marginBottom: 24 }}>This learning path doesn't exist.</p>
            <Link to={`/category/${categorySlug}`} style={{ padding: "10px 24px", borderRadius: 10, background: cfg.accent, color: "#000", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              Back to {cfg.label} &rarr;
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: TOKENS.BG, color: "#fff" }}>
      <SEOHead
        title={`${path.title} - ${cfg.label} Learning Path`}
        description={path.longDesc.slice(0, 155)}
        canonical={`https://aiinasia.com/category/${categorySlug}/learn/${pathSlug}`}
      />
      <Header />

      {/* HEADER SECTION */}
      <section style={{ position: "relative", padding: "48px 0 40px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 20%, ${path.color}12, transparent 70%)` }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", position: "relative" }}>
          {/* Breadcrumb */}
          <nav style={{ fontSize: 13, color: TOKENS.MUTED, marginBottom: 20, fontFamily: "Nunito, sans-serif" }}>
            <Link to="/" style={{ color: TOKENS.MUTED, textDecoration: "none" }}>Home</Link>
            <span style={{ margin: "0 8px" }}>/</span>
            <Link to={`/category/${categorySlug}`} style={{ color: TOKENS.MUTED, textDecoration: "none" }}>{category?.name || cfg.label}</Link>
            <span style={{ margin: "0 8px" }}>/</span>
            <span style={{ color: "#fff" }}>{path.title}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div style={{ maxWidth: 700 }}>
              {/* Emoji + Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: `${path.color}1a`, border: `1px solid ${path.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 28 }}>{path.emoji}</span>
                </div>
                <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1.15 }} className="text-2xl sm:text-3xl md:text-[36px]">
                  {path.title}
                </h1>
              </div>

              <p style={{ fontSize: 15, color: "#d1d5db", fontFamily: "Nunito, sans-serif", lineHeight: 1.65, marginBottom: 16 }}>
                {path.longDesc}
              </p>

              {/* Badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <GlowBadge color={DIFFICULTY_COLORS[path.difficulty] || "#9ca3af"}>{path.difficulty}</GlowBadge>
                <GlowBadge color={cfg.accent}>{cfg.label}</GlowBadge>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: TOKENS.MUTED, fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                  📖 {displayArticles.length} articles
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: TOKENS.MUTED, fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                  ⏱️ {path.time}
                </span>
              </div>

              {/* Continue button - shows when some articles are read but not all */}
              {readArticles.size > 0 && firstUnreadIndex >= 0 && (
                <button
                  onClick={handleContinue}
                  style={{
                    marginTop: 14,
                    padding: "8px 20px",
                    borderRadius: 10,
                    background: path.color,
                    color: "#000",
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    transition: "opacity 0.2s ease",
                  }}
                >
                  Continue where you left off →
                </button>
              )}
              {progressPercent === 100 && (
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🏆</span>
                  <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, color: path.color }}>Path completed!</span>
                </div>
              )}
            </div>

            {/* Progress ring (desktop) */}
            <div className="hidden md:flex" style={{ flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke={TOKENS.BORDER} strokeWidth="5" />
                  <circle
                    cx="40" cy="40" r="34" fill="none" stroke={path.color} strokeWidth="5"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPercent / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 18, color: "#fff" }}>
                  {progressPercent}%
                </span>
              </div>
              <span style={{ fontSize: 11, color: TOKENS.MUTED, fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>Progress</span>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 64px" }}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10">
          {/* Timeline / Article list */}
          <div ref={revealTimeline.ref} style={revealTimeline.style}>
            {isLoading ? (
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <Skeleton className="h-32 flex-1 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : displayArticles.length === 0 ? (
              <div style={{ padding: "40px 24px", borderRadius: 16, background: TOKENS.CARD_BG, border: `1px solid ${TOKENS.BORDER}`, textAlign: "center" }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>📚</p>
                <p style={{ fontSize: 16, color: "#fff", fontFamily: "Poppins, sans-serif", fontWeight: 700, marginBottom: 6 }}>We're building this learning path</p>
                <p style={{ fontSize: 14, color: TOKENS.MUTED, fontFamily: "Nunito, sans-serif", marginBottom: 16 }}>Check back soon, or explore {cfg.label} articles in the meantime.</p>
                <Link
                  to={`/category/${categorySlug}`}
                  style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, background: cfg.accent, color: "#000", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
                >
                  Explore {cfg.label} &rarr;
                </Link>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                {/* Vertical timeline line */}
                <div style={{ position: "absolute", left: 19, top: 24, bottom: 24, width: 2, background: `linear-gradient(to bottom, ${path.color}40, ${TOKENS.BORDER})` }} className="hidden sm:block" />

                {displayArticles.map((article: any, i: number) => {
                  const isRead = readArticles.has(article.id);
                  return (
                    <div
                      key={article.id}
                      id={`step-${i}`}
                      style={{
                        display: "flex",
                        gap: 16,
                        marginBottom: i < displayArticles.length - 1 ? 24 : 0,
                        opacity: revealTimeline.visible ? 1 : 0,
                        transform: revealTimeline.visible ? 'translateY(0)' : 'translateY(12px)',
                        transition: `opacity 0.4s ease-out ${i * 100}ms, transform 0.4s ease-out ${i * 100}ms`,
                      }}
                    >
                      {/* Step number */}
                      <div className="hidden sm:flex" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: isRead ? path.color : TOKENS.CARD_BG, border: `2px solid ${isRead ? path.color : path.color + '60'}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2, transition: "all 0.3s ease" }}>
                        {isRead ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : (
                          <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: path.color }}>{i + 1}</span>
                        )}
                      </div>

                      {/* Article card */}
                      <div
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          background: TOKENS.CARD_BG,
                          border: `1px solid ${TOKENS.BORDER}`,
                          overflow: "hidden",
                          transition: "border-color 0.2s ease",
                        }}
                        className="hover:border-[var(--path-color)]"
                      >
                        <div className="flex flex-col sm:flex-row">
                          {/* Thumbnail */}
                          {article.featured_image_url ? (
                            <Link to={`/${article.categories?.slug || categorySlug}/${article.slug}`} className="flex-shrink-0">
                              <img
                                src={article.featured_image_url}
                                alt={article.featured_image_alt || article.title}
                                loading="lazy"
                                className="w-full sm:w-[180px] h-[140px] sm:h-full object-cover"
                              />
                            </Link>
                          ) : (
                            <Link to={`/${article.categories?.slug || categorySlug}/${article.slug}`} className="flex-shrink-0">
                              <div className="w-full sm:w-[180px] h-[100px] sm:h-full" style={{ background: `${path.color}1a`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                                {path.emoji}
                              </div>
                            </Link>
                          )}

                          {/* Content */}
                          <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                              <span className="sm:hidden" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 12, color: path.color }}>Step {i + 1}</span>
                              <span style={{ fontSize: 11, color: TOKENS.MUTED, fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                                {article.reading_time_minutes || 5} min read
                              </span>
                              {article.published_at && (
                                <span style={{ fontSize: 11, color: TOKENS.MUTED }}>
                                  {new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              )}
                            </div>

                            <Link
                              to={`/${article.categories?.slug || categorySlug}/${article.slug}`}
                              style={{ textDecoration: "none" }}
                            >
                              <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", lineHeight: 1.4, margin: "0 0 6px 0" }}>
                                {decodeHtml(article.title)}
                              </h3>
                            </Link>

                            {article.excerpt && (
                              <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: "Nunito, sans-serif", lineHeight: 1.5, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                {article.excerpt}
                              </p>
                            )}

                            <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              {article.authors?.name && (
                                <span style={{ fontSize: 12, color: TOKENS.MUTED }}>{article.authors.name}</span>
                              )}
                              <button
                                onClick={(e) => { e.preventDefault(); toggleRead(article.id); }}
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: 8,
                                  border: `1px solid ${isRead ? path.color + '60' : TOKENS.BORDER}`,
                                  background: isRead ? path.color + '1a' : "transparent",
                                  color: isRead ? path.color : TOKENS.MUTED,
                                  fontFamily: "Poppins, sans-serif",
                                  fontWeight: 600,
                                  fontSize: 11,
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                {isRead ? "✓ Read" : "Mark read"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SIDEBAR (desktop only) */}
          <aside className="hidden md:block">
            <div style={{ position: "sticky", top: 80 }}>
              {/* In this path quick-jump */}
              {displayArticles.length > 0 && (
                <div style={{ borderRadius: 14, background: TOKENS.CARD_BG, border: `1px solid ${TOKENS.BORDER}`, padding: 20, marginBottom: 20 }}>
                  <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 13, color: "#fff", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    In this path
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {displayArticles.map((a: any, i: number) => (
                      <a
                        key={a.id}
                        href={`#step-${i}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(`step-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "6px 8px",
                          borderRadius: 8,
                          textDecoration: "none",
                          transition: "background 0.2s ease",
                        }}
                        className="hover:bg-white/5"
                      >
                        <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 11, color: readArticles.has(a.id) ? path.color : TOKENS.MUTED, flexShrink: 0, marginTop: 2 }}>
                          {readArticles.has(a.id) ? "✓" : `${i + 1}.`}
                        </span>
                        <span style={{ fontSize: 12, color: readArticles.has(a.id) ? "#d1d5db" : "#9ca3af", fontFamily: "Nunito, sans-serif", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {decodeHtml(a.title)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Paths */}
              {relatedPaths.length > 0 && (
                <div style={{ borderRadius: 14, background: TOKENS.CARD_BG, border: `1px solid ${TOKENS.BORDER}`, padding: 20, marginBottom: 20 }}>
                  <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 13, color: "#fff", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Related paths
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {relatedPaths.map((rp) => (
                      <Link
                        key={rp.slug}
                        to={`/category/${categorySlug}/learn/${rp.slug}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1px solid ${TOKENS.BORDER}`,
                          textDecoration: "none",
                          transition: "border-color 0.2s ease",
                        }}
                        className="hover:border-white/20"
                      >
                        <span style={{ fontSize: 20 }}>{rp.emoji}</span>
                        <div>
                          <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, color: "#e5e7eb" }}>{rp.title}</div>
                          <div style={{ fontSize: 11, color: TOKENS.MUTED }}>{rp.articles} articles - {rp.time}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Newsletter CTA */}
              <div style={{ borderRadius: 14, background: `linear-gradient(135deg, ${cfg.accent}15, ${TOKENS.BRAND}10)`, border: `1px solid ${TOKENS.BORDER}`, padding: 20, textAlign: "center" }}>
                <p style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", marginBottom: 4 }}>Never miss an update</p>
                <p style={{ fontSize: 12, color: TOKENS.MUTED, marginBottom: 12 }}>Get the best of {cfg.label} weekly.</p>
                <Link to="/newsletter" style={{ display: "inline-block", padding: "8px 20px", borderRadius: 10, background: cfg.accent, color: "#000", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
                  Subscribe &rarr;
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* BOTTOM: Continue exploring */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${TOKENS.BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 40 }}>
            <Link
              to={`/category/${categorySlug}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                borderRadius: 12,
                border: `1px solid ${cfg.accent}40`,
                background: `${cfg.accent}0a`,
                color: cfg.accent,
                fontFamily: "Poppins, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              Continue exploring {cfg.label} &rarr;
            </Link>
          </div>

          {/* Cross-category paths */}
          {crossPaths.length > 0 && (
            <div ref={revealCross.ref} style={revealCross.style}>
              <SectionHeader title="Explore Other Learning Paths" emoji="🌐" color={TOKENS.BRAND} />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {crossPaths.map(({ categorySlug: cs, cfg: catCfg, path: cp }) => (
                  <Link
                    key={cp.slug}
                    to={`/category/${cs}/learn/${cp.slug}`}
                    style={{
                      display: "block",
                      padding: 20,
                      borderRadius: 14,
                      background: TOKENS.CARD_BG,
                      border: `1px solid ${TOKENS.BORDER}`,
                      textDecoration: "none",
                      transition: "border-color 0.2s ease",
                    }}
                    className="hover:border-white/20"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 24 }}>{cp.emoji}</span>
                      <GlowBadge color={catCfg.accent} small>{catCfg.label}</GlowBadge>
                    </div>
                    <h4 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: "#fff", marginBottom: 4 }}>{cp.title}</h4>
                    <p style={{ fontSize: 12, color: TOKENS.MUTED, fontFamily: "Nunito, sans-serif", margin: 0 }}>{cp.desc}</p>
                    <div style={{ marginTop: 10, fontSize: 11, color: cp.color, fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                      {cp.articles} articles - {cp.time}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ExploreMoreButton />
      <Footer />
    </div>
  );
};

export default LearningPathDetail;

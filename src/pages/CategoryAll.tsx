import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BreadcrumbStructuredData } from "@/components/StructuredData";
import { CATEGORY_CONFIG, TOKENS, type CategorySlug } from "@/constants/categoryTokens";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/category/CategoryIcon";

const ITEMS_PER_PAGE = 12;

const decodeHtml = (s: string) =>
  s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'") || "";

const getArticleTagNames = (article: any): string[] => {
  const relationTags = (article.article_tags || [])
    .map((at: any) => at.tags?.name)
    .filter(Boolean);
  return [...relationTags, ...(article.ai_tags || []), ...(article.topic_tags || [])];
};

type SortMode = "newest" | "oldest" | "most-read";

const CategoryAll = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const cfg = CATEGORY_CONFIG[slug as CategorySlug] || CATEGORY_CONFIG.news;

  // Reset on slug change
  useEffect(() => {
    setSelectedFilter("All");
    setSortMode("newest");
    setCurrentPage(1);
  }, [slug]);

  // Reset page on filter/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, sortMode]);

  // Fetch category
  const { data: category } = useQuery({
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

  // Fetch all articles for this category
  const { data: articles, isLoading } = useQuery({
    queryKey: ["category-all-articles", slug],
    enabled: !!category?.id,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!category?.id) return [];
      if (slug === "voices") {
        const { data, error } = await supabase
          .from("article_categories")
          .select(
            `articles!inner (id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors (name, slug), categories:primary_category_id!inner (name, slug))`
          )
          .eq("category_id", category.id)
          .eq("articles.status", "published");
        if (error) throw error;
        return (
          data
            ?.map((item) => item.articles)
            .filter((a) => a && a.authors?.name !== "Intelligence Desk")
            .sort(
              (a: any, b: any) =>
                new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
            ) || []
        );
      }
      const { data, error } = await supabase
        .from("articles")
        .select(
          `id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes, ai_tags, topic_tags, article_tags(tags(name)), authors (name, slug), categories:primary_category_id (name, slug)`
        )
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Dynamic filters
  const dynamicFilters = useMemo(() => {
    if (!articles || articles.length === 0) return ["All"];
    const tagCounts: Record<string, number> = {};
    const seenIds = new Set<string>();
    for (const article of articles) {
      if (!article?.id || seenIds.has(article.id)) continue;
      seenIds.add(article.id);
      const combined = getArticleTagNames(article);
      const seen = new Set<string>();
      for (const tag of combined) {
        const lower = (tag || "").toLowerCase().trim();
        if (!lower || lower === "featured" || seen.has(lower)) continue;
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
  }, [articles]);

  // Filter
  const matchesFilter = (article: any) => {
    if (selectedFilter === "All") return true;
    const filterLower = selectedFilter.toLowerCase();
    const allTags = getArticleTagNames(article).map((t: string) => t.toLowerCase());
    const title = (article.title || "").toLowerCase();
    return allTags.some((t: string) => t.includes(filterLower)) || title.includes(filterLower);
  };

  // Filter then sort
  const processedArticles = useMemo(() => {
    if (!articles) return [];
    let filtered = articles.filter(matchesFilter);
    switch (sortMode) {
      case "newest":
        filtered = [...filtered].sort(
          (a: any, b: any) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        );
        break;
      case "oldest":
        filtered = [...filtered].sort(
          (a: any, b: any) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
        );
        break;
      case "most-read":
        filtered = [...filtered].sort(
          (a: any, b: any) => (b.view_count || 0) - (a.view_count || 0)
        );
        break;
    }
    return filtered;
  }, [articles, selectedFilter, sortMode]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedArticles.length / ITEMS_PER_PAGE));
  const pagedArticles = processedArticles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" },
    { key: "most-read", label: "Most read" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: TOKENS.BG, color: "#fff" }}>
      <SEOHead
        title={`All ${cfg.label} Articles - AI in Asia`}
        description={cfg.metaDesc}
        canonical={`https://aiinasia.com/category/${slug}/all`}
        ogType="website"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": `All ${cfg.label} Articles - AI in Asia`,
          "description": cfg.metaDesc,
          "url": `https://aiinasia.com/category/${slug}/all`,
        }}
      />
      {category && (
        <BreadcrumbStructuredData
          items={[
            { name: "Home", url: "https://aiinasia.com" },
            { name: category.name, url: `https://aiinasia.com/category/${category.slug}` },
            { name: "All Articles", url: `https://aiinasia.com/category/${category.slug}/all` },
          ]}
        />
      )}

      <Header />

      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px 64px" }}>
          {/* Breadcrumb */}
          <div
            style={{
              fontSize: 13,
              color: TOKENS.MUTED,
              marginBottom: 16,
              fontFamily: "Nunito, sans-serif",
            }}
          >
            <Link to="/" style={{ color: TOKENS.MUTED, textDecoration: "none" }}>
              Home
            </Link>
            <span style={{ margin: "0 8px" }}>/</span>
            <Link
              to={`/category/${slug}`}
              style={{ color: TOKENS.MUTED, textDecoration: "none" }}
            >
              {category?.name}
            </Link>
            <span style={{ margin: "0 8px" }}>/</span>
            <span style={{ color: "#fff" }}>All Articles</span>
          </div>

          {/* Back link */}
          <Link
            to={`/category/${slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: cfg.accent,
              textDecoration: "none",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={14} />
            Back to {category?.name}
          </Link>

          {/* Title + Count */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <h1
              style={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 900,
                fontSize: 32,
                color: "#fff",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              All {category?.name} Articles
            </h1>
            {articles && (
              <span
                style={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: cfg.accent,
                }}
              >
                {processedArticles.length} article{processedArticles.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Filter pills */}
          {dynamicFilters.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
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
          )}

          {/* Sort pills */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 32,
            }}
          >
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortMode(opt.key)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  border: `1px solid ${sortMode === opt.key ? cfg.accent + "66" : TOKENS.BORDER}`,
                  background: sortMode === opt.key ? cfg.accent + "1a" : "transparent",
                  color: sortMode === opt.key ? cfg.accent : TOKENS.MUTED,
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 16,
                    background: TOKENS.CARD_BG,
                    border: `1px solid ${TOKENS.BORDER}`,
                    height: 320,
                  }}
                  className="animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && processedArticles.length === 0 && selectedFilter !== "All" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: 16,
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  color: "#9ca3af",
                  fontFamily: "Nunito, sans-serif",
                }}
              >
                No articles matching "{selectedFilter}" yet
              </p>
              <button
                onClick={() => setSelectedFilter("All")}
                style={{
                  padding: "8px 20px",
                  borderRadius: 20,
                  background: cfg.accent + "1a",
                  border: `1px solid ${cfg.accent}44`,
                  color: cfg.accent,
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Clear filter
              </button>
            </div>
          )}

          {/* Article grid */}
          {!isLoading && pagedArticles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pagedArticles.map((article: any) => (
                <Link
                  key={article.id}
                  to={`/${article.categories?.slug || slug}/${article.slug}`}
                  style={{
                    display: "block",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: TOKENS.CARD_BG,
                    border: `1px solid ${TOKENS.BORDER}`,
                    textDecoration: "none",
                    transition: "border-color 0.2s ease, transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = cfg.accent + "44";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = TOKENS.BORDER;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {article.featured_image_url ? (
                    <img
                      src={article.featured_image_url}
                      alt={article.featured_image_alt || article.title}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: 160,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 160,
                        background: `linear-gradient(135deg, ${cfg.accent}15, ${TOKENS.SURFACE})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CategoryIcon icon={cfg.icon} accent={cfg.accent} size="xl" />
                    </div>
                  )}
                  <div style={{ padding: "14px 16px 18px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "Poppins, sans-serif",
                          color: cfg.accent,
                          background: cfg.accent + "15",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {category?.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: TOKENS.MUTED,
                          fontFamily: "Nunito, sans-serif",
                        }}
                      >
                        {article.published_at
                          ? new Date(article.published_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#e5e7eb",
                        lineHeight: 1.35,
                        margin: "0 0 6px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {decodeHtml(article.title)}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#9ca3af",
                        lineHeight: 1.5,
                        fontFamily: "Nunito, sans-serif",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {article.excerpt || ""}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        marginTop: 10,
                        fontSize: 11,
                        color: TOKENS.MUTED,
                        fontFamily: "Nunito, sans-serif",
                      }}
                    >
                      {article.authors?.name && <span>{article.authors.name}</span>}
                      <span>{article.reading_time_minutes || 5} min read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                marginTop: 40,
              }}
            >
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 12px",
                  borderRadius: 16,
                  border: `1px solid ${TOKENS.BORDER}`,
                  background: "transparent",
                  color: currentPage === 1 ? TOKENS.BORDER : TOKENS.MUTED,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.2s ease",
                }}
              >
                <ChevronLeft size={14} /> Prev
              </button>

              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    border: `1px solid ${currentPage === page ? cfg.accent + "66" : TOKENS.BORDER}`,
                    background: currentPage === page ? cfg.accent + "1a" : "transparent",
                    color: currentPage === page ? cfg.accent : TOKENS.MUTED,
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "6px 12px",
                  borderRadius: 16,
                  border: `1px solid ${TOKENS.BORDER}`,
                  background: "transparent",
                  color: currentPage === totalPages ? TOKENS.BORDER : TOKENS.MUTED,
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.2s ease",
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryAll;

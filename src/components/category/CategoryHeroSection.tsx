import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { CategoryIcon } from "@/components/category/CategoryIcon";
import { BusinessInAByteAd } from "@/components/BusinessInAByteAd";
import { TOKENS } from "@/constants/categoryTokens";
import { decodeHtml } from "@/lib/textUtils";

interface CategoryHeroSectionProps {
  featuredArticle: any;
  latestArticles: any[];
  cfg: { accent: string; label: string; icon: string };
  slug: string | undefined;
  isFilterActive: boolean;
  selectedFilter: string;
  isLoading: boolean;
}

export function CategoryHeroSection({ featuredArticle, latestArticles, cfg, slug, isFilterActive, selectedFilter, isLoading }: CategoryHeroSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
        <Skeleton className="aspect-[16/10] rounded-2xl" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
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
                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.85, filter: "brightness(1.1)" }}
              />
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)" }} />
            <div style={{ position: "absolute", top: 20, left: 20, display: "flex", gap: 8 }}>
              <GlowBadge color={cfg.accent}>{cfg.label}</GlowBadge>
              <GlowBadge color="#f59e0b">Featured</GlowBadge>
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px" }}>
              <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 27, color: "#fff", lineHeight: 1.25, margin: "0 0 10px 0", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
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
          {latestArticles.length === 0 && isFilterActive ? (
            <div style={{ padding: "16px 14px", borderRadius: 14, background: TOKENS.CARD_BG, border: `1px solid ${TOKENS.BORDER}`, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: "Nunito, sans-serif", margin: 0 }}>No recent articles for this tag</p>
            </div>
          ) : latestArticles.map((article: any) => (
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
                <div style={{ width: 60, height: 60, borderRadius: 8, flexShrink: 0, background: `${cfg.accent}1a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CategoryIcon icon={cfg.icon} accent={cfg.accent} size="lg" />
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
  );
}

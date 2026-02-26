import { useState, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SectionHeader } from "@/components/category/SectionHeader";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { CategoryIcon } from "@/components/category/CategoryIcon";
import { getOptimizedThumbnail } from "@/lib/imageOptimization";
import { decodeHtml } from "@/lib/textUtils";
import { staggerStyle } from "@/lib/scrollAnimation";
import type React from "react";

interface CategoryFeaturedGridProps {
  articles: any[];
  cfg: { accent: string; label: string; icon: string };
  slug: string | undefined;
  revealProps: {
    ref: React.Ref<HTMLDivElement>;
    visible: boolean;
    style: React.CSSProperties;
  };
  selectedFilter: string;
  totalCount: number;
}

export function CategoryFeaturedGrid({ articles, cfg, slug, revealProps, selectedFilter, totalCount }: CategoryFeaturedGridProps) {
  const navigate = useNavigate();

  return (
    <section ref={revealProps.ref} style={{ marginBottom: 48, ...revealProps.style }}>
      <SectionHeader
        title="Featured"
        emoji="star"
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
            View all {totalCount || ""} articles &rarr;
          </Link>
        }
      />
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {articles.map((article: any, i: number) => (
            <div key={article.id} style={staggerStyle(revealProps.visible, i)}>
              <FeaturedCard
                article={article}
                cfg={cfg}
                slug={slug}
                imageHeight={140}
                navigate={navigate}
              />
            </div>
          ))}
        </div>
      ) : selectedFilter !== "All" ? (
        <p style={{ fontSize: 14, color: "#9ca3af", fontFamily: "Nunito, sans-serif", padding: "20px 0" }}>No articles matching "{selectedFilter}" yet</p>
      ) : null}
    </section>
  );
}

export const FeaturedCard = memo(function FeaturedCard({ article, cfg, slug, imageHeight, navigate, tag, tagColor }: { article: any; cfg: any; slug: string | undefined; imageHeight: number; navigate: any; tag?: string; tagColor?: string }) {
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
            src={getOptimizedThumbnail(article.featured_image_url, 400, imageHeight)}
            alt={article.featured_image_alt || article.title}
            width={400}
            height={imageHeight}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: hovered ? "scale(1.03)" : "scale(1)",
              transition: "transform 0.3s ease",
            }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: `${cfg.accent}1a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CategoryIcon icon={cfg.icon} accent={cfg.accent} size="xl" />
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
});

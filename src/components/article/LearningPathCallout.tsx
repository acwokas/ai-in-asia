import { Link } from "react-router-dom";
import { useMemo } from "react";
import { findPathsForArticle } from "@/lib/learningPathMatcher";
import { TOKENS } from "@/constants/categoryTokens";
import { iconMap } from "@/lib/iconMap";
import { BookOpen } from "lucide-react";

interface LearningPathCalloutProps {
  article: {
    ai_tags?: string[] | null;
    topic_tags?: string[] | null;
    article_tags?: Array<{ tags?: { name?: string } | null }> | null;
    title?: string;
  };
}

export function LearningPathCallout({ article }: LearningPathCalloutProps) {
  const matchedPaths = useMemo(() => findPathsForArticle(article), [article]);

  if (matchedPaths.length === 0) return null;

  // Show the first matching path
  const { categorySlug, path } = matchedPaths[0];

  return (
    <div
      style={{
        borderRadius: 14,
        background: TOKENS.CARD_BG,
        border: `1px solid ${path.color}33`,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      {(() => { const Icon = iconMap[path.emoji]; return Icon ? <Icon style={{ width: 24, height: 24, color: path.color }} /> : null; })()}
      <div style={{ flex: 1, minWidth: 200 }}>
        <p
          style={{
            fontSize: 13,
            color: "#d1d5db",
            fontFamily: "Nunito, sans-serif",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          <BookOpen style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 4 }} />This article is part of the{" "}
          <Link
            to={`/category/${categorySlug}/learn/${path.slug}`}
            style={{
              color: path.color,
              fontWeight: 700,
              textDecoration: "none",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {path.title}
          </Link>{" "}
          learning path.
        </p>
      </div>
      <Link
        to={`/category/${categorySlug}/learn/${path.slug}`}
        style={{
          padding: "8px 16px",
          borderRadius: 10,
          background: `${path.color}1a`,
          border: `1px solid ${path.color}40`,
          color: path.color,
          fontFamily: "Poppins, sans-serif",
          fontWeight: 700,
          fontSize: 12,
          textDecoration: "none",
          whiteSpace: "nowrap",
          transition: "all 0.2s ease",
        }}
      >
        Continue the path →
      </Link>
    </div>
  );
}

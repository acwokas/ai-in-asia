import { useState } from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "@/components/category/SectionHeader";
import { TOKENS } from "@/constants/categoryTokens";
import { staggerStyle } from "@/lib/scrollAnimation";
import type React from "react";

interface LearningPath {
  slug: string;
  emoji: string;
  title: string;
  desc: string;
  articles: number;
  time: string;
  color: string;
}

interface CategoryLearningPathsProps {
  paths: LearningPath[];
  categorySlug: string;
  revealProps: {
    ref: React.RefObject<HTMLDivElement>;
    visible: boolean;
    style: React.CSSProperties;
  };
  accent: string;
}

export function CategoryLearningPaths({ paths, categorySlug, revealProps, accent }: CategoryLearningPathsProps) {
  if (paths.length === 0) return null;

  return (
    <section ref={revealProps.ref} style={{ marginBottom: 48, ...revealProps.style }}>
      <SectionHeader title="Learning Paths" emoji="🗺️" color={accent} subtitle="Curated sequences to guide your reading" />
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-3.5">
        {paths.map((p, i) => (
          <div key={i} style={staggerStyle(revealProps.visible, i)}>
            <LearningPathCard path={p} categorySlug={categorySlug} />
          </div>
        ))}
      </div>
    </section>
  );
}

function LearningPathCard({ path, categorySlug }: { path: LearningPath; categorySlug: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={`/category/${categorySlug}/learn/${path.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 24,
        borderRadius: 14,
        minHeight: 160,
        position: "relative",
        overflow: "hidden",
        background: TOKENS.CARD_BG,
        border: `1px solid ${hovered ? path.color + "4d" : TOKENS.BORDER}`,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.3)" : "none",
        transition: "all 0.25s ease",
        cursor: "pointer",
        textDecoration: "none",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 90% 10%, ${path.color}${hovered ? "24" : "14"}, transparent 60%)`, transition: "background 0.25s ease", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: `${path.color}1f`, border: `1px solid ${path.color}33`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{path.emoji}</span>
        </div>
        <h4 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 15, color: "#f3f4f6", margin: "0 0 0 0", lineHeight: 1.3 }}>{path.title}</h4>
        <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: "Nunito, sans-serif", margin: "6px 0 12px 0", lineHeight: 1.5 }}>{path.desc}</p>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: path.color, fontFamily: "Poppins, sans-serif" }}>
            {path.articles} articles - {path.time}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: path.color, fontFamily: "Poppins, sans-serif", opacity: hovered ? 1 : 0.5, transition: "opacity 0.25s ease", display: "flex", alignItems: "center", gap: 4 }}>
            Start path
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={path.color}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: hovered ? "translateX(3px)" : "translateX(0)", transition: "transform 0.25s ease" }}
            >
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 4, background: "#1a1d25", marginTop: 12 }} />
      </div>
    </Link>
  );
}

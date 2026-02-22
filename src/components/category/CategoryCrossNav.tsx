import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "@/components/category/SectionHeader";
import { CategoryIcon } from "@/components/category/CategoryIcon";
import { TOKENS } from "@/constants/categoryTokens";
import { staggerStyle } from "@/lib/scrollAnimation";
import type React from "react";

interface CategoryCrossNavProps {
  categories: { slug: string; accent: string; emoji: string; icon: string; label: string; desc: string }[];
  revealProps: {
    ref: React.RefObject<HTMLDivElement>;
    visible: boolean;
    style: React.CSSProperties;
  };
}

export function CategoryCrossNav({ categories, revealProps }: CategoryCrossNavProps) {
  return (
    <section ref={revealProps.ref} style={{ marginBottom: 48, ...revealProps.style }}>
      <SectionHeader title="Explore Other Categories" emoji="globe" color={TOKENS.BRAND} />
      <div className="flex md:grid md:grid-cols-6 gap-3.5 overflow-x-auto scrollbar-hide">
        {categories.map((cat, i) => (
          <div key={cat.slug} style={staggerStyle(revealProps.visible, i)}>
            <CrossCategoryCard cat={cat} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CrossCategoryCard({ cat }: { cat: { slug: string; accent: string; emoji: string; icon: string; label: string; desc: string } }) {
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
      <div style={{ marginBottom: 8 }}>
        <CategoryIcon icon={cat.icon} accent={cat.accent} size="md" />
      </div>
      <h4 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: cat.accent, margin: "0 0 4px 0" }}>{cat.label}</h4>
      <p style={{ fontSize: 12, color: "#9ca3af", fontFamily: "Nunito, sans-serif", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {cat.desc}
      </p>
    </div>
  );
}

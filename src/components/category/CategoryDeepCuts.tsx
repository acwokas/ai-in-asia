import { useNavigate } from "react-router-dom";
import { SectionHeader } from "@/components/category/SectionHeader";
import { FeaturedCard } from "@/components/category/CategoryFeaturedGrid";
import { getEditorialTag } from "@/lib/articleUtils";
import { staggerStyle } from "@/lib/scrollAnimation";
import type React from "react";

interface CategoryDeepCutsProps {
  articles: any[];
  cfg: { accent: string; label: string; icon: string };
  slug: string | undefined;
  revealProps: {
    ref: React.Ref<HTMLDivElement>;
    visible: boolean;
    style: React.CSSProperties;
  };
  selectedFilter: string;
}

export function CategoryDeepCuts({ articles, cfg, slug, revealProps, selectedFilter }: CategoryDeepCutsProps) {
  const navigate = useNavigate();

  return (
    <section ref={revealProps.ref} style={{ marginBottom: 48, ...revealProps.style }}>
      <SectionHeader
        title="Deep Cuts from the Archives"
        emoji="sparkles"
        color="#ef4444"
        subtitle="Editor-picked articles that are just as relevant today as when they were published."
      />
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 gap-3.5">
          {articles.map((dc: any, i: number) => (
            <div key={dc.id} style={staggerStyle(revealProps.visible, i)}>
              <FeaturedCard
                article={dc}
                cfg={cfg}
                slug={slug}
                imageHeight={120}
                navigate={navigate}
                tag={getEditorialTag(dc)}
                tagColor="#ef4444"
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

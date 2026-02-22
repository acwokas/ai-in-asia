import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { TOKENS } from "@/constants/categoryTokens";

interface CategoryHeaderProps {
  category: { name: string; slug: string } | null;
  cfg: { accent: string; desc: string };
  newThisWeek: number;
  isLoading: boolean;
}

export function CategoryHeader({ category, cfg, newThisWeek, isLoading }: CategoryHeaderProps) {
  return (
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
            {isLoading ? (
              <Skeleton className="h-12 w-64 mb-2" />
            ) : (
              <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, color: "#fff", margin: "0 0 6px 0", lineHeight: 1.1 }} className="text-2xl sm:text-3xl md:text-[38px]">
                {category?.name}
              </h1>
            )}
            <p style={{ fontSize: 15, color: "#9ca3af", fontFamily: "Nunito, sans-serif", maxWidth: 600 }}>{cfg.desc}</p>
          </div>
          {newThisWeek > 0 && (
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, color: cfg.accent }}>
              {newThisWeek} new this week
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

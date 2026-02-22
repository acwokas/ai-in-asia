import { TOKENS } from "@/constants/categoryTokens";
import { CategoryIcon } from "@/components/category/CategoryIcon";

interface CategorySubNavProps {
  filters: string[];
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  cfg: { accent: string; icon: string; label: string };
  scrolled: boolean;
}

export function CategorySubNav({ filters, selectedFilter, onFilterChange, cfg, scrolled }: CategorySubNavProps) {
  return (
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
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, overflowX: "auto" }} className="scrollbar-hide">
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <CategoryIcon icon={cfg.icon} accent={cfg.accent} size="sm" />
          <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 13, color: cfg.accent }} className="hidden sm:inline">{cfg.label}</span>
        </div>
        <div style={{ width: 1, height: 20, background: TOKENS.BORDER, flexShrink: 0 }} />
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
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
  );
}

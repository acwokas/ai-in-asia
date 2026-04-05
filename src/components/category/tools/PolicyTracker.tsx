import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ToolWrapper } from "@/components/category/ToolWrapper";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { Scale } from "lucide-react";

const ACCENT = "#eab308";

const COUNTRY_FLAGS: Record<string, string> = {
  Afghanistan: "", Australia: "", Bangladesh: "", Bhutan: "", Brunei: "",
  Cambodia: "", China: "", Fiji: "", "Hong Kong": "", India: "",
  Indonesia: "", Japan: "", Kazakhstan: "", Laos: "", Macau: "",
  Malaysia: "", Maldives: "", Mongolia: "", Myanmar: "", Nepal: "",
  "New Zealand": "", "North Korea": "", Pakistan: "", "Papua New Guinea": "",
  Philippines: "", Singapore: "", "South Korea": "", "Sri Lanka": "",
  Taiwan: "", Thailand: "", "Timor-Leste": "", Uzbekistan: "", Vietnam: "",
  "United States": "", "United Kingdom": "", Canada: "", Germany: "",
  France: "", Italy: "", Spain: "", Netherlands: "", Sweden: "",
  Switzerland: "", Belgium: "", Ireland: "", Norway: "", Denmark: "",
  Finland: "", Poland: "", Austria: "", Portugal: "", "Czech Republic": "",
  Greece: "", Israel: "", UAE: "", "Saudi Arabia": "", Qatar: "",
  Bahrain: "", Kuwait: "", Oman: "", Turkey: "", Egypt: "",
  "South Africa": "", Nigeria: "", Kenya: "", Ghana: "", Rwanda: "",
  Ethiopia: "", Morocco: "", Tunisia: "", Brazil: "", Mexico: "",
  Argentina: "", Chile: "", Colombia: "", Peru: "", Uruguay: "",
  "Costa Rica": "", Estonia: "", Latvia: "", Lithuania: "", Romania: "",
  Hungary: "", Serbia: "", Croatia: "", Bulgaria: "", Russia: "",
  Ukraine: "", Georgia: "",
};

const MATURITY_CONFIG: Record<string, { label: string; color: string }> = {
  binding_law: { label: "Binding Law", color: "#22c55e" },
  legislative_draft: { label: "Draft", color: "#f59e0b" },
  voluntary_framework: { label: "Voluntary", color: "#3b82f6" },
  emerging: { label: "Emerging", color: "#6b7280" },
};

const DEFAULT_MATURITY = { label: "TBC", color: "#6b7280" };

const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #1a1d25 25%, #252830 50%, #1a1d25 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
  borderRadius: 6,
  height: 14,
};

export const PolicyTracker = () => {
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { data: policyArticles, isLoading } = useQuery({
    queryKey: ["policy-tracker-countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, country, region, governance_maturity, excerpt, updated_at,
          categories:primary_category_id ( name, slug )
        `)
        .eq("article_type", "policy_article")
        .eq("status", "published")
        .not("country", "is", null)
        .order("country", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });

  const regionNames = useMemo(() => {
    if (!policyArticles) return [];
    const names = new Set<string>();
    policyArticles.forEach((a) => {
      const name = (a.categories as any)?.name;
      if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [policyArticles]);

  const filtered = useMemo(() => {
    if (!policyArticles) return [];
    if (selectedRegion === "All") return policyArticles;
    return policyArticles.filter((a) => (a.categories as any)?.name === selectedRegion);
  }, [policyArticles, selectedRegion]);

  const allPills = ["All", ...regionNames];

  return (
    <ToolWrapper>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Scale size={20} color="#fff" />
          <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 18, color: "#fff", margin: 0 }}>
            AI Regulation Tracker
          </h3>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 16px 0" }}>
          Where Asia-Pacific stands on AI governance
        </p>

        {/* Region filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {allPills.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRegion(r)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: `1px solid ${selectedRegion === r ? ACCENT + "66" : "#1a1d25"}`,
                background: selectedRegion === r ? ACCENT : "transparent",
                color: selectedRegion === r ? "#000" : "#9ca3af",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px auto 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #1a1d25",
                  background: "#0d0e12",
                }}
              >
                <div style={{ ...shimmerStyle, width: 100 }} />
                <div style={{ ...shimmerStyle, width: 60 }} />
                <div style={{ ...shimmerStyle, width: "80%" }} />
                <div style={{ ...shimmerStyle, width: 60 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 12px 0" }}>
              No country entries yet. Explore the full Policy Atlas for regional overviews.
            </p>
            <Link
              to="/ai-policy-atlas"
              style={{ fontSize: 13, color: ACCENT, fontFamily: "Poppins, sans-serif", fontWeight: 600, textDecoration: "none" }}
            >
              Open Policy Atlas &rarr;
            </Link>
          </div>
        ) : (
          <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }} className="scrollbar-hide">
            {filtered.map((article, i) => {
              const maturity = MATURITY_CONFIG[article.governance_maturity || ""] || DEFAULT_MATURITY;
              const flag = COUNTRY_FLAGS[article.country || ""] || "●";
              const catSlug = (article.categories as any)?.slug;
              return (
                <div
                  key={article.id}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px auto 1fr auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `1px solid ${hoveredIdx === i ? ACCENT + "40" : "#1a1d25"}`,
                    background: hoveredIdx === i ? "#151820" : "#0d0e12",
                    transform: hoveredIdx === i ? "translateY(-1px)" : "translateY(0)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{flag}</span>
                    <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", whiteSpace: "nowrap" }}>
                      {article.country}
                    </span>
                  </div>
                  <GlowBadge color={maturity.color} small>{maturity.label}</GlowBadge>
                  <span style={{ fontSize: 13, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {article.excerpt || article.title}
                  </span>
                  <Link
                    to={`/ai-policy-atlas/${catSlug}/${article.slug}`}
                    style={{ fontSize: 12, color: ACCENT, fontFamily: "Poppins, sans-serif", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Learn more
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            to="/ai-policy-atlas"
            style={{ fontSize: 13, color: ACCENT, fontFamily: "Poppins, sans-serif", fontWeight: 600, textDecoration: "none" }}
          >
            Explore the full interactive Policy Atlas &rarr;
          </Link>
          {policyArticles && policyArticles.length > 0 && (
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
              Last updated: {new Date(Math.max(...policyArticles.map((a) => new Date(a.updated_at).getTime()))).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </ToolWrapper>
  );
};

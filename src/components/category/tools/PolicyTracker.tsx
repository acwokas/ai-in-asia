import { useState } from "react";
import { Link } from "react-router-dom";
import { ToolWrapper } from "@/components/category/ToolWrapper";
import { GlowBadge } from "@/components/ui/GlowBadge";

const ACCENT = "#eab308";

const REGIONS = ["All", "Southeast Asia", "East Asia", "South Asia", "Oceania"] as const;

type Status = "Active" | "In Progress" | "Proposed" | "Minimal";

const STATUS_COLORS: Record<Status, string> = {
  "Active": "#22c55e",
  "In Progress": "#f59e0b",
  "Proposed": "#3b82f6",
  "Minimal": "#6b7280",
};

const COUNTRIES: { flag: string; name: string; status: Status; approach: string; region: string }[] = [
  { flag: "🇸🇬", name: "Singapore", status: "Active", approach: "Risk-based, industry self-regulation with government guidance", region: "Southeast Asia" },
  { flag: "🇨🇳", name: "China", status: "Active", approach: "Comprehensive pre-deployment review and algorithm registration", region: "East Asia" },
  { flag: "🇯🇵", name: "Japan", status: "In Progress", approach: "Pro-innovation approach with voluntary guidelines", region: "East Asia" },
  { flag: "🇰🇷", name: "South Korea", status: "In Progress", approach: "AI Basic Act under legislative review", region: "East Asia" },
  { flag: "🇮🇳", name: "India", status: "Proposed", approach: "Sector-specific regulation, no unified AI framework yet", region: "South Asia" },
  { flag: "🇦🇺", name: "Australia", status: "In Progress", approach: "Voluntary AI Ethics Framework, mandatory rules under consultation", region: "Oceania" },
  { flag: "🇹🇭", name: "Thailand", status: "Proposed", approach: "AI governance guidelines issued, legislation pending", region: "Southeast Asia" },
  { flag: "🇮🇩", name: "Indonesia", status: "Proposed", approach: "National AI strategy published, regulatory framework in development", region: "Southeast Asia" },
  { flag: "🇻🇳", name: "Vietnam", status: "Minimal", approach: "Emerging digital governance, AI-specific rules limited", region: "Southeast Asia" },
  { flag: "🇹🇼", name: "Taiwan", status: "In Progress", approach: "AI Basic Act drafted, focus on innovation and safety balance", region: "East Asia" },
  { flag: "🇵🇭", name: "Philippines", status: "Minimal", approach: "AI development roadmap exists, limited regulatory framework", region: "Southeast Asia" },
  { flag: "🇳🇿", name: "New Zealand", status: "In Progress", approach: "Algorithm charter for government use, broader framework developing", region: "Oceania" },
];

export const PolicyTracker = () => {
  const [region, setRegion] = useState("All");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const filtered = region === "All" ? COUNTRIES : COUNTRIES.filter((c) => c.region === region);

  return (
    <ToolWrapper>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>⚖️</span>
          <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 18, color: "#fff", margin: 0 }}>
            AI Regulation Tracker
          </h3>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: "Nunito, sans-serif", margin: "0 0 16px 0" }}>
          Where Asia-Pacific stands on AI governance
        </p>

        {/* Region filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: `1px solid ${region === r ? ACCENT + "66" : "#1a1d25"}`,
                background: region === r ? ACCENT : "transparent",
                color: region === r ? "#000" : "#9ca3af",
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

        {/* Country list */}
        <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }} className="scrollbar-hide">
          {filtered.map((c, i) => (
            <div
              key={c.name}
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
                <span style={{ fontSize: 16, flexShrink: 0 }}>{c.flag}</span>
                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", whiteSpace: "nowrap" }}>{c.name}</span>
              </div>
              <GlowBadge color={STATUS_COLORS[c.status]} small>{c.status}</GlowBadge>
              <span style={{ fontSize: 13, color: "#9ca3af", fontFamily: "Nunito, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.approach}
              </span>
              <Link
                to="/ai-policy-atlas"
                style={{ fontSize: 12, color: ACCENT, fontFamily: "Poppins, sans-serif", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                Learn more
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom link */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            to="/ai-policy-atlas"
            style={{ fontSize: 13, color: ACCENT, fontFamily: "Poppins, sans-serif", fontWeight: 600, textDecoration: "none" }}
          >
            Explore the full interactive Policy Atlas &rarr;
          </Link>
        </div>
      </div>
    </ToolWrapper>
  );
};

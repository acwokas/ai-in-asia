import { useState } from "react";
import { ToolWrapper } from "@/components/category/ToolWrapper";
import { GlowBadge } from "@/components/ui/GlowBadge";

const ACCENT = "#3b82f6";

const REGIONS = ["All", "Singapore", "Japan", "India", "South Korea", "Australia", "China"] as const;

const SIGNALS = [
  { title: "Singapore workforce push for AI bilingual talent", region: "Singapore", heat: 94, trend: "up" as const, tag: "Policy", ago: "2h ago" },
  { title: "Japan nuclear revival to power AI data centres", region: "Japan", heat: 88, trend: "up" as const, tag: "Infrastructure", ago: "5h ago" },
  { title: "India investing billions in AI infrastructure", region: "India", heat: 91, trend: "up" as const, tag: "Investment", ago: "3h ago" },
  { title: "South Korea's AI development blueprint released", region: "South Korea", heat: 79, trend: "stable" as const, tag: "Strategy", ago: "1d ago" },
  { title: "Australia debates AI safety regulation framework", region: "Australia", heat: 72, trend: "up" as const, tag: "Regulation", ago: "8h ago" },
  { title: "OpenAI expands Singapore hub with new partnerships", region: "Singapore", heat: 85, trend: "up" as const, tag: "Expansion", ago: "6h ago" },
  { title: "Chinese AI models climb global benchmark rankings", region: "China", heat: 82, trend: "up" as const, tag: "Research", ago: "12h ago" },
];

const heatColor = (h: number) => (h > 85 ? "#ef4444" : h > 75 ? "#f59e0b" : ACCENT);

export const PulseTracker = () => {
  const [region, setRegion] = useState("All");

  const filtered = region === "All" ? SIGNALS : SIGNALS.filter((s) => s.region === region);

  return (
    <ToolWrapper>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>📡</span>
          <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>
            AI Pulse Tracker
          </span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px 0", fontFamily: "Nunito, sans-serif" }}>
          Live signals from across Asia-Pacific this week
        </p>

        {/* Region pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: `1px solid ${region === r ? ACCENT + "66" : "#1a1d25"}`,
                background: region === r ? ACCENT + "1a" : "transparent",
                color: region === r ? ACCENT : "#6b7280",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Signal list */}
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((s, i) => (
              <SignalCard key={i} signal={s} />
            ))}
          </div>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </ToolWrapper>
  );
};

function SignalCard({ signal }: { signal: (typeof SIGNALS)[number] }) {
  const [hovered, setHovered] = useState(false);
  const color = heatColor(signal.heat);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        alignItems: "center",
        gap: 16,
        padding: "14px 16px",
        borderRadius: 12,
        background: "#0d0e12",
        border: `1px solid ${hovered ? ACCENT + "40" : "#1a1d25"}`,
        transition: "border-color 0.2s ease",
        cursor: "default",
      }}
    >
      {/* Left */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <GlowBadge color={ACCENT} small>
            {signal.tag}
          </GlowBadge>
          <span style={{ fontSize: 10, color: "#6b7280" }}>
            {signal.region} - {signal.ago}
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#ffffff",
            fontFamily: "Nunito, sans-serif",
            lineHeight: 1.4,
          }}
        >
          {signal.title}
        </div>
      </div>

      {/* Heat */}
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 20, color, lineHeight: 1 }}>
          {signal.heat}
        </div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6b7280",
            marginTop: 2,
          }}
        >
          heat
        </div>
      </div>

      {/* Trend */}
      <div style={{ flexShrink: 0, fontSize: 18 }}>
        {signal.trend === "up" ? (
          <span style={{ color: "#22c55e" }}>↗</span>
        ) : (
          <span style={{ color: "#6b7280" }}>→</span>
        )}
      </div>
    </div>
  );
}

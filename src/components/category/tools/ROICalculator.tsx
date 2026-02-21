import { useState } from "react";
import { ToolWrapper } from "@/components/category/ToolWrapper";

const ACCENT = "#10b981";
const INDUSTRIES = ["Marketing", "Finance", "Operations", "HR", "Sales", "Legal"] as const;
const MULTIPLIERS: Record<string, number> = { Marketing: 1.3, Finance: 1.1, Operations: 1.2, HR: 1.0, Sales: 1.4, Legal: 0.9 };

const fmt = (n: number) => (n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`);
const fmtSalary = (n: number) => `$${(n / 1000).toFixed(0)}k`;

export const ROICalculator = () => {
  const [team, setTeam] = useState(10);
  const [hours, setHours] = useState(5);
  const [salary, setSalary] = useState(60000);
  const [industry, setIndustry] = useState("Marketing");

  const mult = MULTIPLIERS[industry];
  const annualHours = Math.round(team * hours * mult * 48);
  const costSaved = (salary / 1920) * annualHours;
  const fte = annualHours / 1920;
  const weeklyHours = Math.round(team * hours * mult);

  const stats = [
    { emoji: "⏱️", value: annualHours.toLocaleString(), label: "Hours saved / year" },
    { emoji: "💰", value: fmt(costSaved), label: "Productivity value" },
    { emoji: "👤", value: fte.toFixed(1), label: "FTE equivalent" },
    { emoji: "🚀", value: weeklyHours.toLocaleString(), label: "Weekly hours freed" },
  ];

  const sliderStyle: React.CSSProperties = {
    width: "100%",
    height: 6,
    accentColor: ACCENT,
    cursor: "pointer",
    background: "#1a1d25",
    borderRadius: 3,
  };

  return (
    <ToolWrapper>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>
            AI ROI Calculator
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {/* Left - inputs */}
          <div style={{ paddingRight: 24, borderRight: "1px solid #1a1d25" }}>
            {/* Team size */}
            <SliderRow label="Team size" value={String(team)} />
            <input type="range" min={1} max={100} value={team} onChange={(e) => setTeam(+e.target.value)} style={sliderStyle} />

            <div style={{ height: 20 }} />
            <SliderRow label="Hours saved / person / week" value={String(hours)} />
            <input type="range" min={1} max={20} value={hours} onChange={(e) => setHours(+e.target.value)} style={sliderStyle} />

            <div style={{ height: 20 }} />
            <SliderRow label="Avg annual salary (USD)" value={fmtSalary(salary)} />
            <input type="range" min={20000} max={200000} step={5000} value={salary} onChange={(e) => setSalary(+e.target.value)} style={sliderStyle} />

            <div style={{ height: 20 }} />
            <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "Nunito, sans-serif", marginBottom: 8 }}>Industry</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndustry(ind)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    border: `1px solid ${industry === ind ? ACCENT + "66" : "#1a1d25"}`,
                    background: industry === ind ? ACCENT + "1a" : "transparent",
                    color: industry === ind ? ACCENT : "#6b7280",
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Right - results */}
          <div style={{ paddingLeft: 24, background: `${ACCENT}06`, borderRadius: "0 20px 20px 0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "16px 14px",
                    borderRadius: 14,
                    background: "#0d0e12",
                    border: "1px solid #1a1d25",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.emoji}</div>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 22, color: ACCENT, lineHeight: 1.1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, fontFamily: "Nunito, sans-serif" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Insight */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: `${ACCENT}0f`,
                border: `1px solid ${ACCENT}25`,
                fontSize: 13,
                color: "#9ca3af",
                fontFamily: "Nunito, sans-serif",
                lineHeight: 1.6,
              }}
            >
              A team of <strong style={{ color: "#fff" }}>{team}</strong> in{" "}
              <strong style={{ color: "#fff" }}>{industry}</strong> could reclaim the equivalent of{" "}
              <strong style={{ color: ACCENT }}>{fte.toFixed(1)} full-time employees</strong> worth of productivity
              by adopting AI tools for routine tasks.
            </div>
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
};

function SliderRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "Nunito, sans-serif" }}>{label}</span>
      <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 14, color: "#10b981" }}>{value}</span>
    </div>
  );
}

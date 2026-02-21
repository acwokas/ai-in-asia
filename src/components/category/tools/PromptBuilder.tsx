import { useState } from "react";
import { ToolWrapper, ToolCTA } from "@/components/category/ToolWrapper";

const ACCENT = "#10b981";
const COPY_COLOR = "#f59e0b";

const CATEGORIES = [
  { emoji: "✏️", label: "Writing & Content", key: "writing" },
  { emoji: "🔍", label: "Research & Analysis", key: "research" },
  { emoji: "📊", label: "Business & Strategy", key: "business" },
  { emoji: "🎨", label: "Creative & Design", key: "creative" },
  { emoji: "💻", label: "Coding & Technical", key: "coding" },
  { emoji: "📚", label: "Learning & Education", key: "learning" },
] as const;

const PROMPTS: Record<string, string[]> = {
  writing: [
    "Write a LinkedIn post about [topic] that opens with a compelling hook, delivers one clear insight, and ends with a call to action.",
    "Rewrite this paragraph to be 50% shorter while keeping the core message: [paste text]",
    "Create 5 email subject lines for a [campaign] that drive opens. Include one emoji variant and one question format.",
  ],
  research: [
    "Summarize the key findings from [topic] in 200 words. Highlight 3 actionable insights for decision-makers.",
    "Compare [A] vs [B] across these dimensions: cost, speed, quality, and scalability. Present as a structured table.",
    "What are the top 5 emerging trends in [industry] for 2026? Include evidence and potential business impact for each.",
  ],
  business: [
    "Write an executive summary for [project] aimed at C-suite stakeholders. Focus on ROI, timeline, and risk mitigation.",
    "Conduct a SWOT analysis for [company] entering the [region] market. Be specific about regional factors.",
    "Create a 90-day action plan for [initiative] with clear milestones, owners, and KPIs for each phase.",
  ],
  creative: [
    "Generate 10 creative campaign concepts for [brand] targeting [audience]. Each concept should have a tagline and one-line execution idea.",
    "Write a product description for [item] that emphasizes [benefit]. Use sensory language and keep it under 100 words.",
    "Create a mood board brief including colour palette (hex codes), typography pairing, imagery style, and texture references for [project].",
  ],
  coding: [
    "Debug this code and explain what went wrong in plain English. Suggest a fix with comments: [paste code]",
    "Write a Python script that [task]. Include error handling, logging, and a brief docstring explaining usage.",
    "Explain [concept] as if teaching a junior developer. Use a real-world analogy and include a minimal code example.",
  ],
  learning: [
    "Design a 30-day study plan for learning [skill] from scratch. Include daily tasks, resources, and weekly checkpoints.",
    "Explain [topic] using 3 different analogies - one for a child, one for a professional, and one for an expert.",
    "Create 10 quiz questions about [subject] with multiple-choice answers. Include explanations for the correct answers.",
  ],
};

export const PromptBuilder = () => {
  const [active, setActive] = useState("writing");
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <ToolWrapper>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>
              Quick Prompt Builder
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "Nunito, sans-serif" }}>
            Powered by{" "}
            <a href="https://promptandgo.ai" target="_blank" rel="noopener noreferrer" style={{ color: COPY_COLOR, textDecoration: "none" }}>
              PromptAndGo.ai
            </a>
          </span>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActive(cat.key)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: `1px solid ${active === cat.key ? ACCENT + "66" : "#1a1d25"}`,
                background: active === cat.key ? ACCENT + "1a" : "transparent",
                color: active === cat.key ? ACCENT : "#6b7280",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13 }}>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Prompts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PROMPTS[active].map((prompt, i) => (
            <div
              key={`${active}-${i}`}
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(4, 4, 5, 0.5)",
                border: "1px solid #1a1d25",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "#d1d5db",
                  lineHeight: 1.5,
                  margin: 0,
                  fontFamily: "Nunito, sans-serif",
                  flex: 1,
                }}
              >
                {prompt}
              </p>
              <button
                onClick={() => handleCopy(prompt, i)}
                style={{
                  flexShrink: 0,
                  padding: "5px 14px",
                  borderRadius: 8,
                  background: `${COPY_COLOR}21`,
                  border: `1px solid ${COPY_COLOR}40`,
                  color: COPY_COLOR,
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                {copied === i ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          ))}
        </div>

        <ToolCTA platform="promptandgo" url="https://promptandgo.ai" color="#f59e0b" />
      </div>
    </ToolWrapper>
  );
};

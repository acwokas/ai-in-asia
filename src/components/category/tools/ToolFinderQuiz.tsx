import { useState } from "react";
import { ToolWrapper } from "@/components/category/ToolWrapper";
import { GlowBadge } from "@/components/ui/GlowBadge";

const ACCENT = "#a855f7";

const QUESTIONS = [
  {
    text: "What do you mainly want AI to help with?",
    options: [
      { emoji: "✏️", label: "Writing & communication", tag: "writing" },
      { emoji: "🔍", label: "Research & learning", tag: "research" },
      { emoji: "🎨", label: "Images & creative work", tag: "creative" },
      { emoji: "📋", label: "Productivity & organisation", tag: "productivity" },
    ],
  },
  {
    text: "How comfortable are you with AI?",
    options: [
      { emoji: "🌱", label: "Brand new to it", tag: "beginner" },
      { emoji: "🔧", label: "Used ChatGPT a few times", tag: "intermediate" },
      { emoji: "⚡", label: "I use AI tools daily", tag: "advanced" },
    ],
  },
  {
    text: "What matters most to you?",
    options: [
      { emoji: "🆓", label: "It must be free", tag: "free" },
      { emoji: "🎯", label: "Accuracy and reliability", tag: "accuracy" },
      { emoji: "😊", label: "Easy to use", tag: "easy" },
      { emoji: "🚀", label: "Maximum capability", tag: "power" },
    ],
  },
] as const;

interface Rec {
  name: string;
  stars: number;
  why: string;
}

const RECS: Record<string, Rec[]> = {
  "writing-beginner-free": [
    { name: "ChatGPT (Free)", stars: 5, why: "Perfect starting point for writing help - intuitive and powerful free tier." },
    { name: "Grammarly", stars: 4, why: "Catches grammar and tone issues as you write. Great free plan." },
    { name: "Google Gemini", stars: 4, why: "Strong writing assistant with access to current information." },
  ],
  "writing-beginner-easy": [
    { name: "ChatGPT (Free)", stars: 5, why: "The most intuitive AI writing assistant for beginners." },
    { name: "Notion AI", stars: 4, why: "Built into your notes app - write, summarise, and brainstorm in one place." },
    { name: "Grammarly", stars: 4, why: "Works everywhere you type with zero learning curve." },
  ],
  "research-intermediate-accuracy": [
    { name: "Perplexity", stars: 5, why: "Research-focused AI with cited sources and real-time data." },
    { name: "Claude", stars: 5, why: "Excellent at analysing long documents with nuanced, accurate responses." },
    { name: "Consensus", stars: 4, why: "Searches academic papers and synthesises scientific evidence." },
  ],
  "creative-advanced-power": [
    { name: "Midjourney", stars: 5, why: "Industry-leading image generation with stunning artistic quality." },
    { name: "Adobe Firefly", stars: 4, why: "Professional-grade creative AI integrated with Adobe suite." },
    { name: "Runway ML", stars: 4, why: "Video generation and editing with cutting-edge AI models." },
  ],
  "productivity-advanced-power": [
    { name: "Claude Pro", stars: 5, why: "Handles complex workflows, long documents, and coding tasks." },
    { name: "ChatGPT Plus", stars: 5, why: "GPT-4 with plugins, code interpreter, and custom GPTs." },
    { name: "Zapier AI", stars: 4, why: "Automate workflows across 5,000+ apps with AI assistance." },
  ],
};

const DEFAULT_RECS: Rec[] = [
  { name: "ChatGPT", stars: 5, why: "The most versatile AI assistant - great for almost any task." },
  { name: "Perplexity", stars: 5, why: "AI-powered search that cites its sources. Ideal for research." },
  { name: "Claude", stars: 4, why: "Thoughtful, nuanced responses with strong reasoning abilities." },
];

const starStr = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export const ToolFinderQuiz = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const pick = (tag: string) => {
    const next = [...answers, tag];
    setAnswers(next);
    setStep(step + 1);
  };

  const reset = () => {
    setStep(0);
    setAnswers([]);
  };

  const key = answers.join("-");
  const recs = RECS[key] || DEFAULT_RECS;
  const done = step >= 3;

  return (
    <ToolWrapper>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔎</span>
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>
              AI Tool Finder
            </span>
          </div>
          {step > 0 && (
            <button
              onClick={reset}
              style={{
                fontSize: 12,
                color: "#6b7280",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "Nunito, sans-serif",
                textDecoration: "underline",
              }}
            >
              Start over
            </button>
          )}
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i < step ? ACCENT : "#1a1d25",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>

        {!done ? (
          <>
            <h3
              style={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: "#fff",
                margin: "0 0 16px 0",
              }}
            >
              {QUESTIONS[step].text}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: QUESTIONS[step].options.length <= 3 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
                gap: 10,
              }}
            >
              {QUESTIONS[step].options.map((opt) => (
                <OptionButton key={opt.tag} emoji={opt.emoji} label={opt.label} onClick={() => pick(opt.tag)} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 18, color: "#fff", margin: 0 }}>
                Here are your top picks
              </h3>
            </div>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px 0", fontFamily: "Nunito, sans-serif" }}>
              Based on: {answers.join(" - ")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recs.map((r, i) => (
                <div
                  key={r.name}
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: "#0d0e12",
                    border: `1px solid ${i === 0 ? ACCENT + "44" : "#1a1d25"}`,
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 900,
                      fontSize: 20,
                      color: i === 0 ? ACCENT : "#6b7280",
                      lineHeight: 1,
                      flexShrink: 0,
                      width: 24,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 15, color: "#fff" }}>
                        {r.name}
                      </span>
                      {i === 0 && <GlowBadge color={ACCENT} small>Top Pick</GlowBadge>}
                    </div>
                    <div style={{ fontSize: 13, color: "#f59e0b", letterSpacing: 2, marginBottom: 4 }}>
                      {starStr(r.stars)}
                    </div>
                    <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, fontFamily: "Nunito, sans-serif", lineHeight: 1.5 }}>
                      {r.why}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: `1px solid ${ACCENT}33`,
                background: `${ACCENT}0f`,
                color: ACCENT,
                fontFamily: "Poppins, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Take the quiz again
            </button>
          </>
        )}
      </div>
    </ToolWrapper>
  );
};

function OptionButton({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "18px 12px",
        borderRadius: 14,
        background: "#0d0e12",
        border: `1px solid ${hovered ? ACCENT + "4d" : "#1a1d25"}`,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <span style={{ fontSize: 28 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "Nunito, sans-serif", textAlign: "center" }}>
        {label}
      </span>
    </button>
  );
}

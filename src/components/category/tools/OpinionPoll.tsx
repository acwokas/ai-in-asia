import { useState } from "react";
import { ToolWrapper } from "@/components/category/ToolWrapper";

const POLL = {
  question: "Should Asian governments regulate AI models before or after deployment?",
  context:
    "As the EU's AI Act takes effect, Asian nations are charting their own paths. Singapore favours industry self-regulation, while China requires pre-deployment review.",
  relatedTitle: "How Asia is writing its own AI rulebook",
  relatedSlug: "/category/voices",
  totalVotes: 802,
  options: [
    { label: "Before: Pre-deployment review is essential for safety", votes: 234, color: "#ef4444" },
    { label: "After: Regulate based on real-world impact, not theory", votes: 312, color: "#22c55e" },
    { label: "Both: Tiered approach based on risk level", votes: 189, color: "#f59e0b" },
    { label: "Neither: Let the market self-regulate", votes: 67, color: "#8b5cf6" },
  ],
};

export const OpinionPoll = () => {
  const [voted, setVoted] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleVote = (index: number) => {
    if (voted !== null) return;
    setVoted(index);
    setTimeout(() => setShowResults(true), 400);
  };

  return (
    <ToolWrapper>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🗳️</span>
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 16, color: "#ffffff" }}>
              Weekly Debate
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#6b7280" }}>
            <span>Ends in 3 days</span>
            <span>{POLL.totalVotes} votes</span>
          </div>
        </div>

        {/* Question */}
        <h3
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 700,
            fontSize: 17,
            color: "#ffffff",
            lineHeight: 1.4,
            margin: "0 0 8px 0",
          }}
        >
          {POLL.question}
        </h3>
        <p
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 13,
            color: "#6b7280",
            lineHeight: 1.6,
            margin: "0 0 20px 0",
          }}
        >
          {POLL.context}
        </p>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {POLL.options.map((opt, i) => {
            const pct = Math.round((opt.votes / POLL.totalVotes) * 100);
            const isSelected = voted === i;

            return (
              <button
                key={i}
                onClick={() => handleVote(i)}
                disabled={voted !== null}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "#0d0e12",
                  border: `1px solid ${isSelected ? opt.color + "66" : "#1a1d25"}`,
                  color: "#ffffff",
                  fontFamily: "Nunito, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  cursor: voted !== null ? "default" : "pointer",
                  transition: "all 0.25s ease",
                }}
              >
                {/* Result bar fill */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: showResults ? `${pct}%` : "0%",
                    background: `${opt.color}12`,
                    transition: "width 0.8s ease-out",
                    borderRadius: 12,
                  }}
                />
                <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{opt.label}</span>
                  {showResults && (
                    <span
                      style={{
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 800,
                        fontSize: 13,
                        color: opt.color,
                        marginLeft: 12,
                        flexShrink: 0,
                      }}
                    >
                      {pct}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Thank you */}
        {showResults && (
          <div
            style={{
              marginTop: 16,
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(6, 182, 212, 0.06)",
              border: "1px solid rgba(6, 182, 212, 0.15)",
              fontSize: 13,
              color: "#6b7280",
              fontFamily: "Nunito, sans-serif",
              lineHeight: 1.6,
            }}
          >
            Thanks for voting! This week's debate is connected to our article:{" "}
            <a
              href={POLL.relatedSlug}
              style={{ color: "#06b6d4", textDecoration: "underline", fontWeight: 700 }}
            >
              {POLL.relatedTitle}
            </a>
            . New poll every Monday.
          </div>
        )}
      </div>
    </ToolWrapper>
  );
};

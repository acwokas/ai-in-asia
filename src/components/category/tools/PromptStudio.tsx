import { useState } from "react";
import { Sparkles, Wrench, RefreshCw } from "lucide-react";
import { ToolWrapper, ToolCTA } from "@/components/category/ToolWrapper";
import { GlowBadge } from "@/components/ui/GlowBadge";

const ACCENT = "#f97316";

const MODES = [
  { key: "generate", label: "Generate", desc: "Create a prompt from scratch", Icon: Sparkles },
  { key: "optimise", label: "Optimise", desc: "Improve an existing prompt", Icon: Wrench },
  { key: "adapt", label: "Adapt", desc: "Rewrite for a different platform", Icon: RefreshCw },
] as const;

type Mode = (typeof MODES)[number]["key"];

const PLACEHOLDERS: Record<Mode, string> = {
  generate: "Describe what you want the AI to do...",
  optimise: "Paste your existing prompt here and we'll improve it...",
  adapt: "Paste a prompt and we'll adapt it for a different AI platform...",
};

const SAMPLE_OUTPUTS: Record<Mode, string> = {
  generate: `You are a senior content strategist specialising in B2B SaaS marketing for the Asia-Pacific region.

Task: Write a LinkedIn thought-leadership post about [TOPIC].

Requirements:
- Open with a bold, counterintuitive statement or statistic to hook readers in the first line
- Share one specific, experience-based insight (not generic advice)
- Use short paragraphs (1-2 sentences max) for mobile readability
- Include a concrete example or mini case study from the APAC market
- End with a clear call-to-action that invites discussion, not just likes
- Tone: authoritative but conversational, avoid corporate jargon
- Length: 150-200 words
- Format: plain text with line breaks, no bullet points

Output the post ready to paste into LinkedIn.`,
  optimise: `Original issues identified:
- Lacks specificity about audience and context
- No output format defined
- Missing constraints on length and tone

Optimised prompt:

"Act as an experienced UX researcher. Analyse the following user feedback data and identify the top 5 usability issues, ranked by severity and frequency. For each issue, provide: (1) a clear problem statement, (2) which user segment is most affected, (3) a recommended fix with estimated effort level (low/medium/high). Present results as a structured table. Keep language concise and actionable for a product team audience. Data: [PASTE DATA]"

Principles applied: Added role context, specified output format as a table, set constraints on structure and tone, defined a clear ranking methodology.`,
  adapt: `Platform adaptation: ChatGPT to Claude

Key changes made:
- Moved system instructions into a <context> XML block (Claude preference)
- Replaced "You are..." preamble with a role definition inside the prompt body
- Added explicit thinking instructions using Claude's chain-of-thought style
- Restructured output requirements using XML tags for clarity
- Adjusted tone instructions for Claude's more literal interpretation style

Adapted prompt:

<context>
You are a senior data analyst with expertise in market research for Southeast Asian economies.
</context>

<task>
Analyse the provided dataset and produce a market opportunity report.
</task>

<requirements>
- Identify 3 high-growth segments with supporting data points
- Flag 2 potential risks with mitigation strategies
- Use quantitative evidence where available
</requirements>

<format>
Structure your response with clear headings. Use tables for comparative data.
</format>`,
};

const PRINCIPLES = ["Clarity", "Specificity", "Structure", "Context", "Output Format", "Role/Persona", "Constraints"] as const;

const ACTIVE_MAP: Record<Mode, Set<string>> = {
  generate: new Set(["Clarity", "Specificity", "Structure", "Context", "Output Format", "Role/Persona"]),
  optimise: new Set(["Clarity", "Specificity", "Structure", "Output Format", "Constraints"]),
  adapt: new Set(["Structure", "Output Format", "Role/Persona"]),
};

const INFO_MAP: Record<Mode, string> = {
  generate: "Generate mode applies 6 core principles to build a comprehensive prompt from your description, including role assignment and structured output formatting.",
  optimise: "Optimise mode focuses on tightening clarity, adding constraints, and defining output format to make your existing prompt more effective.",
  adapt: "Adapt mode restructures and reformats your prompt to match the conventions and strengths of a different AI platform.",
};

export const PromptStudio = () => {
  const [mode, setMode] = useState<Mode>("generate");
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setWorking(true);
    setResult(null);
    setTimeout(() => {
      setWorking(false);
      setResult(SAMPLE_OUTPUTS[mode]);
    }, 1500);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setInput("");
    setResult(null);
    setWorking(false);
  };

  const active = ACTIVE_MAP[mode];

  return (
    <ToolWrapper>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔨</span>
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>
              Prompt Studio Lite
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "Nunito, sans-serif" }}>
            Inspired by EDGE Elevate
          </span>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginBottom: 24 }}>
          {MODES.map(({ key, label, desc, Icon }) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              style={{
                padding: "14px 12px",
                background: mode === key ? `${ACCENT}0f` : "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: `2px solid ${mode === key ? ACCENT : "#1a1d25"}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "center",
              }}
            >
              <Icon size={18} color={mode === key ? ACCENT : "#6b7280"} style={{ marginBottom: 4 }} />
              <div
                style={{
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  color: mode === key ? "#fff" : "#6b7280",
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "Nunito, sans-serif", marginTop: 2 }}>
                {desc}
              </div>
            </button>
          ))}
        </div>

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 0 }}>
          {/* Left - main */}
          <div style={{ paddingRight: 24, borderRight: "1px solid #1a1d25" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDERS[mode]}
              style={{
                width: "100%",
                minHeight: 120,
                padding: "14px 16px",
                borderRadius: 12,
                background: "#0d0e12",
                border: "1px solid #1a1d25",
                color: "#d1d5db",
                fontFamily: "Nunito, sans-serif",
                fontSize: 13,
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{input.length} chars</span>
              <button
                onClick={handleGenerate}
                disabled={input.length < 20 || working}
                style={{
                  padding: "9px 24px",
                  borderRadius: 10,
                  background: input.length >= 20 && !working ? ACCENT : "#1a1d25",
                  color: input.length >= 20 && !working ? "#000" : "#6b7280",
                  border: "none",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: input.length >= 20 && !working ? "pointer" : "default",
                  transition: "all 0.2s ease",
                }}
              >
                {working ? "Working..." : mode === "generate" ? "Generate" : mode === "optimise" ? "Optimise" : "Adapt"}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div
                style={{
                  marginTop: 16,
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: `${ACCENT}0a`,
                  border: `1px solid ${ACCENT}25`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <GlowBadge color={ACCENT}>Result</GlowBadge>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "4px 14px",
                      borderRadius: 8,
                      background: `${ACCENT}21`,
                      border: `1px solid ${ACCENT}40`,
                      color: ACCENT,
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <pre
                  style={{
                    fontSize: 12,
                    color: "#d1d5db",
                    fontFamily: "Nunito, sans-serif",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {result}
                </pre>
              </div>
            )}
          </div>

          {/* Right - principles */}
          <div style={{ paddingLeft: 24 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: 12,
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Principles Applied
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {PRINCIPLES.map((p) => {
                const isActive = active.has(p);
                return (
                  <div
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: isActive ? `${ACCENT}0a` : "#0d0e12",
                      border: `1px solid ${isActive ? ACCENT + "25" : "#1a1d25"}`,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isActive ? ACCENT : "#333",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isActive ? "#d1d5db" : "#6b7280",
                        fontFamily: "Nunito, sans-serif",
                      }}
                    >
                      {p}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 10,
                background: `${ACCENT}08`,
                border: `1px solid ${ACCENT}15`,
                fontSize: 11,
                color: "#9ca3af",
                fontFamily: "Nunito, sans-serif",
                lineHeight: 1.5,
              }}
            >
              {INFO_MAP[mode]}
            </div>
          </div>
        </div>

        <ToolCTA platform="edge" url="https://adrianwatkins.com/tools/elevate/prompt-engineer" color="#f97316" />
      </div>
    </ToolWrapper>
  );
};

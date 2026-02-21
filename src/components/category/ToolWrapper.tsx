import type { ReactNode } from "react";

interface ToolWrapperProps {
  children: ReactNode;
}

export const ToolWrapper = ({ children }: ToolWrapperProps) => {
  return (
    <div
      style={{
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid #1a1d25",
        background: "linear-gradient(135deg, #0d0e12, #111520)",
      }}
    >
      {children}
    </div>
  );
};

interface ToolCTAProps {
  platform: "promptandgo" | "edge";
  url: string;
  color: string;
}

const COPY = {
  promptandgo: {
    title: "Want 3,000+ prompts with Scout AI optimization?",
    subtitle: "Let Scout customize any prompt for your favourite AI platform. Free.",
    button: "Open PromptAndGo",
  },
  edge: {
    title: "Explore the full EDGE Elevate toolkit",
    subtitle: "Generate, optimise, and adapt prompts with the full Prompt Engineer.",
    button: "Open Prompt Engineer",
  },
} as const;

export const ToolCTA = ({ platform, url, color }: ToolCTAProps) => {
  const copy = COPY[platform];

  return (
    <div
      style={{
        marginTop: 16,
        padding: "14px 20px",
        borderRadius: 14,
        background: `linear-gradient(135deg, ${color}0f, ${color}08)`,
        border: `1px solid ${color}33`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontFamily: "Poppins, sans-serif", fontWeight: 700, color: "#ffffff" }}>
          {copy.title}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          {copy.subtitle}
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 20px",
          borderRadius: 10,
          background: color,
          color: "#000000",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 800,
          fontSize: 12,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        {copy.button} →
      </a>
    </div>
  );
};

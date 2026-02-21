import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  emoji?: string;
  color: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export const SectionHeader = ({ title, emoji, color, subtitle, rightAction }: SectionHeaderProps) => {
  return (
    <div style={{ marginBottom: subtitle ? 4 : 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {emoji && <span style={{ fontSize: 20 }}>{emoji}</span>}
        <span
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 800,
            fontSize: 21,
            background: `linear-gradient(90deg, #ffffff, ${color})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        <div
          style={{
            flex: 1,
            height: 1,
            background: `linear-gradient(90deg, ${color}40, transparent)`,
          }}
        />
        {rightAction}
      </div>
      {subtitle && (
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6, marginBottom: 20 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

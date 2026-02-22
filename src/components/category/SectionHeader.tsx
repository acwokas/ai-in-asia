import type { ReactNode } from "react";
import { iconMap } from "@/lib/iconMap";

interface SectionHeaderProps {
  title: string;
  emoji?: string;
  color: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export const SectionHeader = ({ title, emoji, color, subtitle, rightAction }: SectionHeaderProps) => {
  const IconComponent = emoji ? iconMap[emoji] : null;

  return (
    <div style={{ marginBottom: subtitle ? 4 : 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
        {IconComponent && <IconComponent style={{ width: 20, height: 20, color, flexShrink: 0 }} />}
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
            position: "relative",
            zIndex: 1,
            flexShrink: 0,
            flexGrow: 0,
          }}
        >
          {title}
        </span>
        <div
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: "auto",
            minWidth: 0,
            height: 1,
            background: `linear-gradient(90deg, ${color}40, transparent)`,
          }}
        />
        {rightAction}
      </div>
      {subtitle && (
        <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 6, marginBottom: 20 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

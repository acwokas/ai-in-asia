import { useState } from "react";
import { GlowBadge } from "@/components/ui/GlowBadge";

interface InteractiveCardProps {
  title: string;
  tag?: string;
  tagColor?: string;
  meta?: string;
  onClick?: () => void;
}

export const InteractiveCard = ({ title, tag, tagColor, meta, onClick }: InteractiveCardProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "18px 20px",
        borderRadius: 14,
        background: hovered ? "#151820" : "#0d0e12",
        border: `1px solid ${hovered && tagColor ? `${tagColor}40` : "#1a1d25"}`,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.25s ease",
        cursor: "pointer",
      }}
    >
      {(tag || meta) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          {tag && tagColor ? <GlowBadge color={tagColor} small>{tag}</GlowBadge> : <span />}
          {meta && (
            <span style={{ fontSize: 11, color: "#6b7280" }}>{meta}</span>
          )}
        </div>
      )}
      <h3
        style={{
          fontSize: 14,
          fontFamily: "Poppins, sans-serif",
          fontWeight: 700,
          color: "#ffffff",
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        {title}
      </h3>
    </div>
  );
};

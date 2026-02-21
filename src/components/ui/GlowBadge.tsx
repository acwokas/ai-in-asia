import type { ReactNode } from "react";

interface GlowBadgeProps {
  children: ReactNode;
  color: string;
  small?: boolean;
}

export const GlowBadge = ({ children, color, small = false }: GlowBadgeProps) => {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: small ? "2px 8px" : "4px 12px",
        borderRadius: 20,
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontFamily: "Poppins, sans-serif",
        color,
        backgroundColor: `${color}1a`,
        border: `1px solid ${color}33`,
      }}
    >
      {children}
    </span>
  );
};

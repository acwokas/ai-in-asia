import { Radar, BarChart3, Compass, BookOpen, Wand2, Quote, Scale, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Radar,
  BarChart3,
  Compass,
  BookOpen,
  Wand2,
  Quote,
  Scale,
};

const SIZE_PRESETS = {
  sm: { container: 28, icon: 15, radius: 8 },
  md: { container: 36, icon: 19, radius: 10 },
  lg: { container: 48, icon: 24, radius: 12 },
  xl: { container: 64, icon: 32, radius: 14 },
} as const;

interface CategoryIconProps {
  icon: string;
  accent: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const CategoryIcon = ({ icon, accent, size = "md" }: CategoryIconProps) => {
  const { container, icon: iconSize, radius } = SIZE_PRESETS[size];
  const IconComponent = ICON_MAP[icon];

  return (
    <div
      style={{
        width: container,
        height: container,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${accent}25, ${accent}10)`,
        border: `1px solid ${accent}20`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {IconComponent ? (
        <IconComponent size={iconSize} color={accent} strokeWidth={1.8} />
      ) : (
        <span style={{ fontSize: iconSize, lineHeight: 1 }}>{icon}</span>
      )}
    </div>
  );
};

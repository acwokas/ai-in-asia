import { Lightbulb, TrendingUp, AlertTriangle, Rocket } from "lucide-react";

interface InsightCardProps {
  insights: string[];
  variant?: "tip" | "highlight" | "warning" | "action";
}

const icons = {
  tip: Lightbulb,
  highlight: TrendingUp,
  warning: AlertTriangle,
  action: Rocket,
};

export const InsightCard = ({ insights, variant = "tip" }: InsightCardProps) => {
  if (!insights.length) return null;
  const Icon = icons[variant];

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 mt-4">
      <div className="flex gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          {insights.map((text, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
};
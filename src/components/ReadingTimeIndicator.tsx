import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadingTimeIndicatorProps {
  minutes: number;
  className?: string;
  showBar?: boolean;
}

function getReadingCategory(minutes: number) {
  if (minutes < 3) return { label: "Quick read", color: "text-green-600 dark:text-green-400", barColor: "bg-green-500" };
  if (minutes > 8) return { label: "Long read", color: "text-amber-600 dark:text-amber-400", barColor: "bg-amber-500" };
  return { label: `${minutes} min`, color: "text-muted-foreground", barColor: "bg-primary" };
}

export function ReadingTimeIndicator({ minutes, className, showBar = true }: ReadingTimeIndicatorProps) {
  const { label, color, barColor } = getReadingCategory(minutes);
  // Progress bar: ratio vs a "standard" 5-min read, capped at 100%
  const barPercent = Math.min((minutes / 10) * 100, 100);

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", color, className)}>
      <Clock className="h-3 w-3 flex-shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
      {showBar && (
        <div className="w-10 h-1 rounded-full bg-muted overflow-hidden flex-shrink-0">
          <div className={cn("h-full rounded-full", barColor)} style={{ width: `${barPercent}%` }} />
        </div>
      )}
    </div>
  );
}

export { getReadingCategory };

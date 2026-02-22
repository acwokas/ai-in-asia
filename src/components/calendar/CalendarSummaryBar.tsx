import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CalendarEvent } from "./CalendarEventDetail";

interface CalendarSummaryBarProps {
  events: CalendarEvent[];
  date: Date;
}

export const CalendarSummaryBar = ({ events, date }: CalendarSummaryBarProps) => {
  const counts = useMemo(() => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const inRange = events.filter((e) => e.start >= monthStart && e.start <= monthEnd);
    return {
      published: inRange.filter((e) => e.status === "published").length,
      draft: inRange.filter((e) => e.status === "draft").length,
      scheduled: inRange.filter((e) => e.status === "scheduled").length,
    };
  }, [events, date]);

  const monthLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Card className="p-4 mt-6 bg-card border-border">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">{monthLabel}:</span>
        <Badge variant="default" className="gap-1">
          {counts.published} published
        </Badge>
        <Badge variant="outline" className="gap-1">
          {counts.draft} drafts
        </Badge>
        <Badge variant="secondary" className="gap-1">
          {counts.scheduled} scheduled
        </Badge>
      </div>
    </Card>
  );
};

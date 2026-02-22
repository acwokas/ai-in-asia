import { Card } from "@/components/ui/card";

export const CalendarStatusLegend = () => (
  <Card className="p-4 mb-6 bg-card border-border">
    <div className="text-sm font-medium mb-3">Status Legend:</div>
    <div className="flex flex-wrap gap-5">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-4 rounded"
          style={{ backgroundColor: "hsl(210, 85%, 40%)" }}
        />
        <span className="text-sm">Published</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-4 rounded"
          style={{
            backgroundColor: "hsl(210, 85%, 40%, 0.25)",
            border: "2px dashed hsl(210, 85%, 40%)",
          }}
        />
        <span className="text-sm">Draft</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-4 rounded"
          style={{
            backgroundColor: "hsl(210, 85%, 40%)",
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.25) 3px, rgba(255,255,255,0.25) 6px)",
          }}
        />
        <span className="text-sm">Scheduled</span>
      </div>
    </div>
  </Card>
);

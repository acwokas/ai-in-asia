import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface TldrSnapshotProps {
  bullets: string[];
  whoShouldPayAttention?: string;
  whatChangesNext?: string;
}

const TldrSnapshot = ({ bullets, whoShouldPayAttention, whatChangesNext }: TldrSnapshotProps) => {
  if (!bullets || bullets.length === 0) return null;

  return (
    <Card className="tldr-snapshot my-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Zap className="h-5 w-5 text-primary fill-primary" />
          AI Snapshot
        </CardTitle>
        <p className="text-sm text-muted-foreground italic">The TL;DR: what matters, fast.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {bullets.map((bullet, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{bullet}</p>
          </div>
        ))}
        
        {/* Editorial extension lines */}
        {(whoShouldPayAttention || whatChangesNext) && (
          <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
            {whoShouldPayAttention && (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground/80">Who should pay attention:</span>{" "}
                {whoShouldPayAttention}
              </p>
            )}
            {whatChangesNext && (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground/80">What changes next:</span>{" "}
                {whatChangesNext}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TldrSnapshot;

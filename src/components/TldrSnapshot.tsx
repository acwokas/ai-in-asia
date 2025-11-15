import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface TldrSnapshotProps {
  bullets: string[];
}

const TldrSnapshot = ({ bullets }: TldrSnapshotProps) => {
  if (!bullets || bullets.length === 0) return null;

  return (
    <Card className="tldr-snapshot my-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Zap className="h-5 w-5 text-primary fill-primary" />
          TL;DR Snapshot
        </CardTitle>
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
      </CardContent>
    </Card>
  );
};

export default TldrSnapshot;

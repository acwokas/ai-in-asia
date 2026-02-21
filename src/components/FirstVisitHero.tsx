import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const STORAGE_KEY = "returning-visitor";

const FirstVisitHero = () => {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="relative bg-gradient-to-b from-primary/5 to-transparent border-b border-border/30">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 md:top-4 md:right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="container mx-auto px-4 py-8 md:py-12 text-center max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          The AI publication built for Asia-Pacific
        </h2>

        {/* Full subtext on desktop, short on mobile */}
        <p className="hidden md:block text-muted-foreground mb-6">
          Daily briefings, regional analysis, and practical guides covering AI across 15+ countries - from Singapore to Tokyo, Mumbai to Sydney.
        </p>
        <p className="md:hidden text-sm text-muted-foreground mb-5">
          Daily AI briefings and analysis across 15+ Asia-Pacific countries.
        </p>

        {/* Two CTAs on desktop, one on mobile */}
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link to="/3-before-9">Read Today's Briefing</Link>
          </Button>
          <Button variant="outline" asChild className="hidden md:inline-flex">
            <Link to="/auth">Subscribe Free</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FirstVisitHero;

import { useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "welcome_banner_dismissed";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const isDismissedRecently = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < THIRTY_DAYS_MS;
  } catch {
    return false;
  }
};

const FirstVisitHero = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => isDismissedRecently());
  const [collapsing, setCollapsing] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const handleDismiss = useCallback(() => {
    if (!bannerRef.current) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setDismissed(true);
      return;
    }
    const el = bannerRef.current;
    el.style.height = `${el.offsetHeight}px`;
    el.style.overflow = "hidden";
    setCollapsing(true);
    requestAnimationFrame(() => {
      el.style.transition = "height 300ms ease-out, opacity 300ms ease-out";
      el.style.height = "0px";
      el.style.opacity = "0";
    });
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setDismissed(true);
    }, 310);
  }, []);

  // Logged-in users never see the banner
  if (user) return null;
  if (dismissed) return null;

  return (
    <div ref={bannerRef} className="relative bg-gradient-to-b from-primary/5 to-transparent border-b border-border/30">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 md:top-4 md:right-4 p-1 rounded-md text-muted-foreground hover:text-white transition-colors z-10"
        style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
        aria-label="Dismiss banner"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="container mx-auto px-4 py-8 md:py-12 text-center max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          The AI publication built for Asia-Pacific
        </h2>

        <p className="hidden md:block text-muted-foreground mb-6">
          Daily briefings, regional analysis, and practical guides covering AI across 15+ countries - from Singapore to Tokyo, Mumbai to Sydney.
        </p>
        <p className="md:hidden text-sm text-muted-foreground mb-5">
          Daily AI briefings and analysis across 15+ Asia-Pacific countries.
        </p>

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

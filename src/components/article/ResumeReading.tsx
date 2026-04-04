import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";

const STORAGE_PREFIX = "aiia_reading_pos_";
const EXPIRY_DAYS = 30;
const SAVE_THROTTLE_MS = 3000;
const MIN_SAVE_PERCENT = 25;

interface SavedPosition {
  percent: number;
  timestamp: number;
}

interface ResumeReadingProps {
  slug: string;
}

const ResumeReading = ({ slug }: ResumeReadingProps) => {
  const [savedPercent, setSavedPercent] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const lastSaveRef = useRef(0);
  const storageKey = `${STORAGE_PREFIX}${slug}`;

  // On mount: check for saved position
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed: SavedPosition = JSON.parse(raw);
      const ageMs = Date.now() - parsed.timestamp;
      if (ageMs > EXPIRY_DAYS * 86400000) {
        localStorage.removeItem(storageKey);
        return;
      }
      if (parsed.percent >= MIN_SAVE_PERCENT && parsed.percent < 95) {
        setSavedPercent(parsed.percent);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // Track scroll and save position (throttled)
  const savePosition = useCallback(() => {
    const content = document.querySelector(".article-content");
    if (!content) return;

    const now = Date.now();
    if (now - lastSaveRef.current < SAVE_THROTTLE_MS) return;

    const rect = content.getBoundingClientRect();
    const scrolled = window.innerHeight - rect.top;
    const percent = Math.min(Math.max((scrolled / rect.height) * 100, 0), 100);

    if (percent >= MIN_SAVE_PERCENT && percent < 98) {
      lastSaveRef.current = now;
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ percent, timestamp: now } satisfies SavedPosition)
        );
      } catch { /* storage full */ }
    }
  }, [storageKey]);

  useEffect(() => {
    const onScroll = () => savePosition();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [savePosition]);

  const handleContinue = () => {
    if (!savedPercent) return;
    const content = document.querySelector(".article-content");
    if (!content) return;
    const rect = content.getBoundingClientRect();
    const targetY = window.scrollY + rect.top + (rect.height * savedPercent) / 100 - window.innerHeight * 0.3;
    window.scrollTo({ top: targetY, behavior: "smooth" });
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.removeItem(storageKey);
  };

  if (!savedPercent || dismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-md w-[calc(100%-2rem)]">
      <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Welcome back!</p>
          <p className="text-xs text-muted-foreground">Continue from where you left off?</p>
        </div>
        <button
          onClick={handleContinue}
          className="flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "#F28C0F" }}
        >
          Continue
        </button>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ResumeReading;

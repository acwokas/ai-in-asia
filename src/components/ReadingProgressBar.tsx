import { useEffect, useState, useCallback, useRef } from "react";
import { getReadingCategory } from "@/components/ReadingTimeIndicator";

interface ReadingProgressBarProps {
  readingTimeMinutes?: number;
}

const ReadingProgressBar = ({ readingTimeMinutes = 5 }: ReadingProgressBarProps) => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const [showRemaining, setShowRemaining] = useState(false);

  const updateProgress = useCallback(() => {
    const content = document.querySelector(".article-content");
    if (!content) {
      setProgress(0);
      return;
    }
    const rect = content.getBoundingClientRect();
    const contentTop = rect.top + window.scrollY;
    const contentHeight = rect.height;
    const scrolled = window.scrollY - contentTop + window.innerHeight * 0.5;
    const percent = Math.min(Math.max((scrolled / contentHeight) * 100, 0), 100);
    setProgress(percent);
    setShowRemaining(percent > 5 && percent < 95);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateProgress);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    updateProgress();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateProgress]);

  const isComplete = progress >= 100;
  const remainingMinutes = Math.max(1, Math.ceil(readingTimeMinutes * (1 - progress / 100)));
  const { color } = getReadingCategory(readingTimeMinutes);

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-[3px] sm:h-[3px] max-sm:h-1 z-[60]">
        <div
          className={`h-full bg-primary transition-[width] duration-150 ease-out ${isComplete ? "animate-pulse" : ""}`}
          style={{
            width: `${progress}%`,
            boxShadow: isComplete
              ? "0 0 8px hsl(var(--primary) / 0.6), 0 0 16px hsl(var(--primary) / 0.3)"
              : "0 1px 4px hsl(var(--primary) / 0.3)",
          }}
        />
      </div>
      {showRemaining && !isComplete && (
        <div className={`fixed top-1 right-3 z-[60] text-xs ${color} bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border shadow-sm transition-opacity duration-300`}>
          ~{remainingMinutes} min left
        </div>
      )}
    </>
  );
};

export default ReadingProgressBar;

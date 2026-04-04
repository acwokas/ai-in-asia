import { useEffect, useState, useCallback, useRef } from "react";
import { getCategoryColor } from "@/lib/categoryColors";

interface ReadingProgressBarProps {
  readingTimeMinutes?: number;
  categorySlug?: string;
}

const ReadingProgressBar = ({ readingTimeMinutes = 5, categorySlug }: ReadingProgressBarProps) => {
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
    // 0% when top of article-content reaches bottom of viewport
    // 100% when bottom of article-content reaches bottom of viewport
    const scrollableDistance = rect.height;
    const scrolled = window.innerHeight - rect.top;
    const percent = Math.min(Math.max((scrolled / scrollableDistance) * 100, 0), 100);
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
  const catColor = getCategoryColor(categorySlug);

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-[3px] sm:h-[3px] max-sm:h-1 z-[60]">
        <div
          className="h-full transition-[width] duration-150 ease-out"
          style={{
            width: `${progress}%`,
            background: '#F28C0F',
            boxShadow: isComplete
              ? "0 0 8px rgba(242, 140, 15, 0.6), 0 0 16px rgba(242, 140, 15, 0.3)"
              : "0 1px 4px rgba(242, 140, 15, 0.3)",
          }}
        />
      </div>
      {showRemaining && !isComplete && (
        <div
          className="fixed top-1 right-3 z-[60] text-xs font-medium bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border shadow-sm transition-opacity duration-300"
          style={{ color: catColor }}
        >
          ~{remainingMinutes} min left
        </div>
      )}
    </>
  );
};

export default ReadingProgressBar;

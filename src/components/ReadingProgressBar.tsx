import { useEffect, useState, useCallback, useRef } from "react";

const ReadingProgressBar = () => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

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

  return (
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
  );
};

export default ReadingProgressBar;

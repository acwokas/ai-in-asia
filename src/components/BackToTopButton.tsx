import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const BackToTopButton = () => {
  const [visible, setVisible] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const prevVisible = useRef(false);
  const [animating, setAnimating] = useState(false);

  const checkScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const isVisible = scrollY > 500;
    const isAtBottom =
      window.innerHeight + scrollY >= document.documentElement.scrollHeight - 100;

    if (isVisible !== prevVisible.current) {
      prevVisible.current = isVisible;
      if (isVisible) {
        setVisible(true);
        setAnimating(true);
      } else {
        setAnimating(false);
        setTimeout(() => setVisible(false), 300);
      }
    }
    setAtBottom(isAtBottom);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          checkScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [checkScroll]);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={cn(
        "fixed z-40 flex items-center justify-center rounded-full",
        "bg-card/80 backdrop-blur border border-border shadow-lg",
        "w-11 h-11 transition-all duration-300 cursor-pointer",
        "hover:bg-accent hover:scale-110",
        // Position: above mobile action bar on small screens
        "bottom-20 right-4 md:bottom-8 md:right-6",
        animating
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-3",
        atBottom && "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
      )}
    >
      <ChevronUp className="h-5 w-5 text-foreground" />
    </button>
  );
};

export default BackToTopButton;

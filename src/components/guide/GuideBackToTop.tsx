import { useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";

const GuideBackToTop = () => {
  const [visible, setVisible] = useState(false);

  const checkScroll = useCallback(() => {
    setVisible(window.scrollY > 400);
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

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full border transition-all duration-200"
      style={{
        width: 40,
        height: 40,
        background: visible ? "rgba(30,41,59,0.8)" : "rgba(30,41,59,0.8)",
        borderColor: "rgb(51,65,85)",
        backdropFilter: "blur(4px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        pointerEvents: visible ? "auto" : "none",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(51,65,85)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(30,41,59,0.8)"; }}
    >
      <ChevronUp className="h-5 w-5 text-white" />
    </button>
  );
};

export default GuideBackToTop;

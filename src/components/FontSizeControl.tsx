import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Minus, Plus } from "lucide-react";
import { trackEvent } from "./GoogleAnalytics";

const FONT_SIZE_KEY = "article-font-size";
const DEFAULT_SIZE = 100;
const MIN_SIZE = 80;
const MAX_SIZE = 150;
const STEP = 10;

const FontSizeControl = () => {
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved) {
      const size = parseInt(saved);
      setFontSize(size);
      applyFontSize(size);
    }
  }, []);

  const applyFontSize = (size: number) => {
    const article = document.querySelector("article .prose");
    if (article) {
      (article as HTMLElement).style.fontSize = `${size}%`;
    }
    
    // Also apply to TL;DR snapshot
    const tldrCard = document.querySelector(".tldr-snapshot");
    if (tldrCard) {
      (tldrCard as HTMLElement).style.fontSize = `${size}%`;
    }
  };

  const handleIncrease = () => {
    trackEvent("font_size_change", { action: "increase", new_size: fontSize + STEP });
    if (fontSize < MAX_SIZE) {
      const newSize = fontSize + STEP;
      setFontSize(newSize);
      localStorage.setItem(FONT_SIZE_KEY, newSize.toString());
      applyFontSize(newSize);
    }
  };

  const handleDecrease = () => {
    trackEvent("font_size_change", { action: "decrease", new_size: fontSize - STEP });
    if (fontSize > MIN_SIZE) {
      const newSize = fontSize - STEP;
      setFontSize(newSize);
      localStorage.setItem(FONT_SIZE_KEY, newSize.toString());
      applyFontSize(newSize);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDecrease}
        disabled={fontSize <= MIN_SIZE}
        className="h-7 w-7 cursor-pointer"
        title="Decrease font size"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleIncrease}
        disabled={fontSize >= MAX_SIZE}
        className="h-7 w-7 cursor-pointer"
        title="Increase font size"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default FontSizeControl;

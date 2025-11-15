import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FONT_SIZE_KEY = "article-font-size";
const DEFAULT_SIZE = 100;
const MIN_SIZE = 80;
const MAX_SIZE = 150;
const STEP = 10;

const FontSizeControl = () => {
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved font size
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
  };

  const handleIncrease = () => {
    if (fontSize < MAX_SIZE) {
      const newSize = fontSize + STEP;
      setFontSize(newSize);
      localStorage.setItem(FONT_SIZE_KEY, newSize.toString());
      applyFontSize(newSize);
      toast({
        description: "Font size increased",
        duration: 1500,
      });
    }
  };

  const handleDecrease = () => {
    if (fontSize > MIN_SIZE) {
      const newSize = fontSize - STEP;
      setFontSize(newSize);
      localStorage.setItem(FONT_SIZE_KEY, newSize.toString());
      applyFontSize(newSize);
      toast({
        description: "Font size decreased",
        duration: 1500,
      });
    }
  };

  const handleReset = () => {
    setFontSize(DEFAULT_SIZE);
    localStorage.setItem(FONT_SIZE_KEY, DEFAULT_SIZE.toString());
    applyFontSize(DEFAULT_SIZE);
    toast({
      description: "Font size reset to default",
      duration: 1500,
    });
  };

  return (
    <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
      <span className="text-sm text-muted-foreground mr-2">Text size:</span>
      <Button
        variant="outline"
        size="icon"
        onClick={handleDecrease}
        disabled={fontSize <= MIN_SIZE}
        className="h-8 w-8"
        title="Decrease font size"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[3rem] text-center">
        {fontSize}%
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={handleIncrease}
        disabled={fontSize >= MAX_SIZE}
        className="h-8 w-8"
        title="Increase font size"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleReset}
        className="h-8 w-8"
        title="Reset to default"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default FontSizeControl;

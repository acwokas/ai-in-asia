import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Twitter, Linkedin, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface QuoteCardGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: string;
  articleTitle: string;
  articleUrl: string;
  categoryColor: string;
  authorName?: string;
}

const CARD_W = 1200;
const CARD_H = 675; // 16:9

const THEMES = [
  { name: "Dark", bg: "#0a0a0b", text: "#f5f5f5", accent: "", quote: "#e0e0e0" },
  { name: "Light", bg: "#fafafa", text: "#1a1a1a", accent: "", quote: "#333" },
  { name: "Brand", bg: "#1a1207", text: "#f5f5f5", accent: "", quote: "#fcd9a0" },
] as const;

export function QuoteCardGenerator({
  open,
  onOpenChange,
  quote,
  articleTitle,
  articleUrl,
  categoryColor,
  authorName,
}: QuoteCardGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [themeIdx, setThemeIdx] = useState(2); // Brand default
  const [copied, setCopied] = useState(false);
  const theme = { ...THEMES[themeIdx], accent: categoryColor };

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CARD_W;
    canvas.height = CARD_H;

    // Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Accent stripe (left)
    ctx.fillStyle = theme.accent;
    ctx.fillRect(0, 0, 6, CARD_H);

    // Accent glow (top-right)
    const glow = ctx.createRadialGradient(CARD_W - 100, 80, 10, CARD_W - 100, 80, 350);
    glow.addColorStop(0, theme.accent + "18");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Large opening quote mark
    ctx.fillStyle = theme.accent + "30";
    ctx.font = "bold 220px Georgia, serif";
    ctx.fillText("\u201C", 50, 200);

    // Quote text — word wrap
    const maxWidth = CARD_W - 160;
    const fontSize = quote.length > 200 ? 28 : quote.length > 120 ? 32 : 38;
    const lineHeight = fontSize * 1.55;
    ctx.font = `500 ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = theme.quote;

    const words = quote.split(" ");
    let line = "";
    let y = 220;
    const maxY = CARD_H - 140;

    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        if (y > maxY) {
          ctx.fillText(line + "…", 80, y);
          line = "";
          break;
        }
        ctx.fillText(line, 80, y);
        line = word;
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, 80, y);
    }

    // Divider
    const dividerY = CARD_H - 110;
    ctx.fillStyle = theme.accent + "40";
    ctx.fillRect(80, dividerY, 80, 2);

    // Article title (truncated)
    ctx.font = `600 16px 'Inter', sans-serif`;
    ctx.fillStyle = theme.text + "99";
    const truncTitle = articleTitle.length > 80 ? articleTitle.slice(0, 77) + "…" : articleTitle;
    ctx.fillText(truncTitle, 80, dividerY + 28);

    // Author
    if (authorName) {
      ctx.font = `400 14px 'Inter', sans-serif`;
      ctx.fillStyle = theme.accent;
      ctx.fillText(`— ${authorName}`, 80, dividerY + 52);
    }

    // Branding
    ctx.font = `800 18px 'Inter', sans-serif`;
    ctx.fillStyle = theme.accent;
    ctx.textAlign = "right";
    ctx.fillText("AI in ASIA", CARD_W - 80, dividerY + 28);
    ctx.font = `400 12px 'Inter', sans-serif`;
    ctx.fillStyle = theme.text + "60";
    ctx.fillText("aiinasia.com", CARD_W - 80, dividerY + 48);
    ctx.textAlign = "left";
  }, [quote, articleTitle, authorName, theme]);

  useEffect(() => {
    if (open) {
      // Small delay to ensure canvas is mounted
      const t = setTimeout(drawCard, 50);
      return () => clearTimeout(t);
    }
  }, [open, drawCard, themeIdx]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "quote-card.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Quote card downloaded!");
  };

  const copyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("Failed");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Couldn't copy — try downloading instead");
    }
  };

  const shareToTwitter = () => {
    const text = `"${quote.slice(0, 200)}${quote.length > 200 ? "…" : ""}"`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(articleUrl)}`;
    window.open(url, "_blank", "noopener");
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] p-0 gap-0 bg-card border-border overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-base font-semibold" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Share as Quote Card
          </DialogTitle>
        </DialogHeader>

        {/* Canvas preview */}
        <div className="px-5">
          <div className="rounded-lg overflow-hidden border border-border/50 shadow-sm">
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ display: "block", aspectRatio: "16/9" }}
            />
          </div>
        </div>

        {/* Theme selector */}
        <div className="flex items-center gap-2 px-5 pt-3">
          <span className="text-xs text-muted-foreground mr-1">Theme</span>
          {THEMES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setThemeIdx(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                i === themeIdx
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 p-5 pt-3">
          <Button
            onClick={downloadImage}
            size="sm"
            className="gap-1.5"
            style={{ backgroundColor: categoryColor, color: "#fff" }}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button onClick={copyImage} variant="outline" size="sm" className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={shareToTwitter} variant="outline" size="sm" className="gap-1.5">
            <Twitter className="h-3.5 w-3.5" />
            𝕏
          </Button>
          <Button onClick={shareToLinkedIn} variant="outline" size="sm" className="gap-1.5">
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

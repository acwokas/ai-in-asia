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

const CARD_SIZE = 640;
const AMBER = "#F28C0F";

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
  const [copied, setCopied] = useState(false);

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = CARD_SIZE;
    const H = CARD_SIZE;
    canvas.width = W;
    canvas.height = H;

    // ── Dark gradient background ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#111827");   // gray-900
    bg.addColorStop(0.5, "#1f2937"); // gray-800
    bg.addColorStop(1, "#111827");   // gray-900
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Dot grid pattern overlay ──
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    const dotSpacing = 20;
    const dotRadius = 1;
    for (let x = dotSpacing; x < W; x += dotSpacing) {
      for (let y = dotSpacing; y < H; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Large opening quotation mark ──
    ctx.fillStyle = AMBER;
    ctx.font = "bold 180px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("\u201C", 36, 24);

    // ── Quote text (auto-sized to fit) ──
    const trimmedQuote = quote.slice(0, 280);
    const padX = 56;
    const maxTextWidth = W - padX * 2;
    const quoteTopY = 140;
    const maxQuoteBottomY = H - 160; // leave room for divider + footer

    // Determine font size to fit
    let fontSize = trimmedQuote.length > 200 ? 22 : trimmedQuote.length > 120 ? 26 : 30;
    let lineHeight = fontSize * 1.5;
    let lines: string[] = [];

    const wrapText = (size: number): string[] => {
      ctx.font = `500 ${size}px 'Inter', 'Segoe UI', system-ui, sans-serif`;
      const words = trimmedQuote.split(" ");
      const result: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const test = currentLine ? currentLine + " " + word : word;
        if (ctx.measureText(test).width > maxTextWidth && currentLine) {
          result.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) result.push(currentLine);
      return result;
    };

    // Try to fit, shrink if needed
    for (let size = fontSize; size >= 16; size -= 2) {
      lines = wrapText(size);
      lineHeight = size * 1.5;
      const totalH = lines.length * lineHeight;
      if (quoteTopY + totalH <= maxQuoteBottomY) {
        fontSize = size;
        break;
      }
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = `500 ${fontSize}px 'Inter', 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], padX, quoteTopY + i * lineHeight);
    }

    // ── Thin amber divider line ──
    const dividerY = H - 130;
    ctx.fillStyle = AMBER;
    ctx.fillRect(padX, dividerY, 60, 2);

    // ── Article title ──
    ctx.font = `400 14px 'Inter', 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = "#9ca3af"; // gray-400
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const truncTitle = articleTitle.length > 70 ? articleTitle.slice(0, 67) + "…" : articleTitle;
    ctx.fillText(truncTitle, padX, dividerY + 16);

    // ── Author attribution ──
    if (authorName) {
      ctx.font = `400 12px 'Inter', 'Segoe UI', system-ui, sans-serif`;
      ctx.fillStyle = "#6b7280"; // gray-500
      ctx.fillText(`— ${authorName}`, padX, dividerY + 38);
    }

    // ── Branding: aiinasia.com ──
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = `800 16px 'Inter', 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = AMBER;
    ctx.fillText("AI in ASIA", W - padX, dividerY + 14);
    ctx.font = `400 11px 'Inter', 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = "#6b7280";
    ctx.fillText("aiinasia.com", W - padX, dividerY + 36);
    ctx.textAlign = "left";
  }, [quote, articleTitle, authorName]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(drawCard, 50);
      return () => clearTimeout(t);
    }
  }, [open, drawCard]);

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
      <DialogContent className="max-w-[520px] p-0 gap-0 bg-card border-border overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-base font-semibold">
            Share as Quote Card
          </DialogTitle>
        </DialogHeader>

        {/* Canvas preview */}
        <div className="px-5">
          <div className="rounded-lg overflow-hidden border border-border/50 shadow-sm">
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ display: "block", aspectRatio: "1/1" }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 p-5 pt-4">
          <Button
            onClick={downloadImage}
            size="sm"
            className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
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

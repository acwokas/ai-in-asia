import { useState, useMemo, useCallback, useEffect } from "react";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { RotateCcw, Share2, PartyPopper } from "lucide-react";
import { JARGON_DICTIONARY } from "@/lib/jargonDictionary";
import confetti from "canvas-confetti";

const GRID_SIZE = 5;
const TOTAL = GRID_SIZE * GRID_SIZE;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCard(): string[] {
  const terms = shuffle(JARGON_DICTIONARY.map((j) => j.term)).slice(0, TOTAL);
  // Center cell is FREE
  terms[12] = "FREE";
  return terms;
}

function checkBingo(marked: Set<number>): boolean {
  // Rows
  for (let r = 0; r < 5; r++) {
    if ([0, 1, 2, 3, 4].every((c) => marked.has(r * 5 + c))) return true;
  }
  // Cols
  for (let c = 0; c < 5; c++) {
    if ([0, 1, 2, 3, 4].every((r) => marked.has(r * 5 + c))) return true;
  }
  // Diagonals
  if ([0, 6, 12, 18, 24].every((i) => marked.has(i))) return true;
  if ([4, 8, 12, 16, 20].every((i) => marked.has(i))) return true;
  return false;
}

const AIBingo = () => {
  const [card, setCard] = useState(generateCard);
  const [marked, setMarked] = useState<Set<number>>(new Set([12])); // FREE is pre-marked
  const [hasBingo, setHasBingo] = useState(false);

  const toggle = useCallback(
    (idx: number) => {
      if (hasBingo || idx === 12) return;
      setMarked((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
    },
    [hasBingo]
  );

  useEffect(() => {
    if (!hasBingo && checkBingo(marked)) {
      setHasBingo(true);
      // Fire confetti
      const end = Date.now() + 2000;
      const burst = () => {
        confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 }, colors: ["#f59e0b", "#fbbf24", "#d97706", "#ffffff"] });
        if (Date.now() < end) requestAnimationFrame(burst);
      };
      burst();
    }
  }, [marked, hasBingo]);

  const reset = () => {
    setCard(generateCard());
    setMarked(new Set([12]));
    setHasBingo(false);
  };

  const shareText = "BINGO! I survived another AI meeting! Try AI Jargon Bingo:";
  const shareUrl = "https://aiinasia.com/tools/ai-bingo";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Jargon Bingo | AI in Asia"
        description="Play AI Jargon Bingo during your next meeting! Mark off buzzwords as you hear them and try to get 5 in a row."
        canonical="https://aiinasia.com/tools/ai-bingo"
      />
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-lg mx-auto text-center">
          <ToolBreadcrumb toolName="AI Jargon Bingo" />
          <h1 className="font-display text-2xl md:text-3xl font-black text-foreground mb-2">
            AI Jargon Bingo
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Click terms as you hear them in meetings. Get 5 in a row to win!
          </p>

          {/* Bingo grid */}
          <div className="grid grid-cols-5 gap-1.5 mb-6">
            {card.map((term, idx) => {
              const isMarked = marked.has(idx);
              const isFree = idx === 12;
              return (
                <button
                  key={idx}
                  onClick={() => toggle(idx)}
                  className={`aspect-square rounded-lg flex items-center justify-center p-1 text-[10px] sm:text-xs font-bold leading-tight transition-all border ${
                    isMarked
                      ? "bg-amber-500 text-black border-amber-600 scale-95"
                      : "bg-card border-border text-foreground hover:border-amber-500/50 hover:bg-amber-500/5"
                  } ${isFree ? "cursor-default" : "cursor-pointer"}`}
                >
                  {isFree ? "FREE" : term}
                </button>
              );
            })}
          </div>

          {/* Bingo result */}
          {hasBingo && (
            <div className="animate-fade-in rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 mb-6">
              <PartyPopper className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <h2 className="font-display text-xl font-black text-amber-500 mb-1">
                BINGO!
              </h2>
              <p className="text-sm text-foreground/80 mb-4">
                You survived another AI meeting!
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share on X
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-amber-500/40 transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" /> LinkedIn
                </a>
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> New Card
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIBingo;

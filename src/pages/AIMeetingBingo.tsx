import { useState, useCallback, useEffect } from "react";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { RefreshCw, Share2, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

const PHRASES = [
  "Synergy", "Leverage AI", "Paradigm shift", "Digital transformation", "Low-hanging fruit",
  "Move the needle", "Circle back", "Deep dive", "Scalable solution", "Best practices",
  "Action items", "Bandwidth", "Touch base", "Take offline", "North star",
  "Ecosystem", "Thought leadership", "Disruptive innovation", "Value proposition", "AI-first",
  "Data-driven", "End-to-end", "Game changer", "Alignment", "Bleeding edge",
  "Unlock value", "Future-proof", "Democratise AI", "Holistic approach", "Stakeholder buy-in",
  "Agile", "Pivot", "ROI", "KPIs", "Machine learning pipeline",
  "Responsible AI", "Ethical framework", "Use case", "Proof of concept", "Go-to-market",
  "Operationalise", "AI copilot", "Guardrails", "Human-in-the-loop", "Multimodal",
  "Foundation model", "Fine-tune", "Prompt engineering", "RAG", "Inference at scale",
  "Edge computing", "Real-time analytics", "Cloud-native", "API economy", "Zero-shot",
  "Generative AI", "LLM", "Autonomous agents", "Digital twin", "Hyperautomation",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCard(): string[] {
  const picked = shuffle(PHRASES).slice(0, 24);
  picked.splice(12, 0, "FREE");
  return picked;
}

const WINNING_LINES = [
  [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
  [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
  [0,6,12,18,24],[4,8,12,16,20],
];

function checkBingo(marked: Set<number>): number[] | null {
  for (const line of WINNING_LINES) {
    if (line.every((i) => marked.has(i))) return line;
  }
  return null;
}

const AIMeetingBingo = () => {
  const [card, setCard] = useState(generateCard);
  const [marked, setMarked] = useState<Set<number>>(new Set([12]));
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [hasWon, setHasWon] = useState(false);

  const toggle = useCallback((idx: number) => {
    if (idx === 12 || hasWon) return;
    setMarked((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, [hasWon]);

  useEffect(() => {
    if (hasWon) return;
    const line = checkBingo(marked);
    if (line) {
      setWinLine(line);
      setHasWon(true);
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: ["#f59e0b", "#ffffff", "#fbbf24"] });
    }
  }, [marked, hasWon]);

  const reset = () => {
    setCard(generateCard());
    setMarked(new Set([12]));
    setWinLine(null);
    setHasWon(false);
  };

  const shareText = encodeURIComponent("BINGO! I survived another AI meeting! Try AI Meeting Bingo:");
  const shareUrl = encodeURIComponent("https://aiinasia.com/tools/ai-meeting-bingo");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Meeting Bingo | AI in Asia"
        description="Play AI Meeting Bingo during your next meeting. Mark off cliché phrases as you hear them and try to get 5 in a row!"
        canonical="https://aiinasia.com/tools/ai-meeting-bingo"
      />
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-xl mx-auto text-center">
          <ToolBreadcrumb toolName="AI Meeting Bingo" />
          <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
            <Trophy className="h-3.5 w-3.5" /> INTERACTIVE TOOL
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-2">
            AI Meeting Bingo
          </h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Hear a cliché in your next AI meeting? Click it! Get 5 in a row to win.
          </p>

          {hasWon && (
            <div className="mb-6 rounded-xl bg-amber-500/15 border border-amber-500/30 p-5 animate-scale-in">
              <p className="text-xl font-black text-amber-500 mb-2">BINGO!</p>
              <p className="text-sm text-foreground mb-4">You survived another AI meeting!</p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share on X
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted/30 transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" /> LinkedIn
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 gap-1.5 mb-6">
            {card.map((phrase, i) => {
              const isMarked = marked.has(i);
              const isWinCell = winLine?.includes(i);
              const isFree = i === 12;
              return (
                <button
                  key={`${phrase}-${i}`}
                  onClick={() => toggle(i)}
                  className={`
                    aspect-square rounded-lg text-[10px] sm:text-xs font-bold p-1 flex items-center justify-center text-center leading-tight transition-all duration-200 border
                    ${isFree
                      ? "bg-amber-500 text-black border-amber-500 cursor-default"
                      : isWinCell
                        ? "bg-amber-500 text-black border-amber-400 scale-105 shadow-lg shadow-amber-500/30"
                        : isMarked
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-card text-muted-foreground border-border hover:border-amber-500/40 hover:bg-amber-500/5 cursor-pointer"
                    }
                  `}
                >
                  {phrase}
                </button>
              );
            })}
          </div>

          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> New Card
          </button>

          <div className="mt-10 text-left">
            <h2 className="font-display text-lg font-bold text-foreground mb-3">How to play</h2>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open this page during your next AI meeting or webinar</li>
              <li>Click on phrases as you hear them - they'll light up in amber</li>
              <li>Get 5 in a row (horizontal, vertical, or diagonal) to win!</li>
              <li>Share your victory to prove you survived another AI meeting</li>
            </ol>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <Link to="/tools" className="text-sm text-amber-500 font-semibold hover:underline">
              ← Back to all tools
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIMeetingBingo;

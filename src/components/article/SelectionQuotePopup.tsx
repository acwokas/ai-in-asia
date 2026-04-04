import { useState, useRef } from "react";
import { ImageIcon } from "lucide-react";
import { useTextSelection } from "@/hooks/useTextSelection";
import { QuoteCardGenerator } from "./QuoteCardGenerator";

interface SelectionQuotePopupProps {
  containerRef: React.RefObject<HTMLElement | null>;
  articleTitle: string;
  articleUrl: string;
  categoryColor: string;
  authorName?: string;
}

export function SelectionQuotePopup({
  containerRef,
  articleTitle,
  articleUrl,
  categoryColor,
  authorName,
}: SelectionQuotePopupProps) {
  const { selection, clearSelection } = useTextSelection(containerRef);
  const [modalOpen, setModalOpen] = useState(false);
  const [savedQuote, setSavedQuote] = useState("");

  const handleClick = () => {
    setSavedQuote(selection.text);
    setModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      clearSelection();
    }
  };

  return (
    <>
      {/* Floating popup */}
      {selection.visible && !modalOpen && (
        <button
          onClick={handleClick}
          className="fixed z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border border-border/60 text-xs font-medium transition-all duration-200 animate-in fade-in-0 zoom-in-95"
          style={{
            left: Math.max(20, Math.min(selection.x - 70, window.innerWidth - 180)),
            top: Math.max(10, selection.y + window.scrollY - 44),
            position: "absolute",
            backgroundColor: categoryColor,
            color: "#fff",
          }}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Share as Quote Card
        </button>
      )}

      {/* Quote card modal */}
      <QuoteCardGenerator
        open={modalOpen}
        onOpenChange={handleModalClose}
        quote={savedQuote}
        articleTitle={articleTitle}
        articleUrl={articleUrl}
        categoryColor={categoryColor}
        authorName={authorName}
      />
    </>
  );
}

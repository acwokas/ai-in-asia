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
      {/* Floating popup above selection */}
      {selection.visible && !modalOpen && (
        <div
          className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: Math.max(20, Math.min(selection.x - 80, window.innerWidth - 200)),
            top: Math.max(10, selection.y + window.scrollY - 48),
            position: "absolute",
          }}
        >
          <button
            onClick={handleClick}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full px-3 py-1 text-sm font-medium shadow-lg transition-colors duration-150"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Share as Quote
          </button>
          {/* Arrow pointing down */}
          <div
            className="mx-auto w-0 h-0"
            style={{
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid rgb(245 158 11)",
              width: 0,
              marginTop: 0,
              marginLeft: "calc(50% - 6px)",
            }}
          />
        </div>
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

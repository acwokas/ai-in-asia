import { useState, useEffect, useCallback, useRef } from "react";

interface SelectionState {
  text: string;
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Detects text selection within a container and returns position info
 * for a floating action button.
 */
export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<SelectionState>({
    text: "",
    x: 0,
    y: 0,
    visible: false,
  });
  const debounceRef = useRef<number>(0);

  const handleSelectionChange = useCallback(() => {
    cancelAnimationFrame(debounceRef.current);
    debounceRef.current = requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelection((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 10 || text.length > 500) {
        setSelection((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      // Check selection is inside the container
      const anchorNode = sel.anchorNode;
      if (!anchorNode || !containerRef.current?.contains(anchorNode)) {
        setSelection((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelection({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        visible: true,
      });
    });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      cancelAnimationFrame(debounceRef.current);
    };
  }, [handleSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelection({ text: "", x: 0, y: 0, visible: false });
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selection, clearSelection };
}

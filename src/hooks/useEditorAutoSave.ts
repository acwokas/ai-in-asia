import { useEffect, useRef, useState, useCallback } from "react";
import { format } from "date-fns";

interface UseEditorAutoSaveOptions {
  status: string;
  buildSaveData: () => any;
  onSave: ((data: any) => void) | undefined;
  articleId?: string | null;
}

export const useEditorAutoSave = ({ status, buildSaveData, onSave, articleId }: UseEditorAutoSaveOptions) => {
  const [autoSaveLabel, setAutoSaveLabel] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<string>("");

  // Mark dirty whenever buildSaveData changes
  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Auto-save every 60s for drafts only
  useEffect(() => {
    if (status === "published" || !onSave || !articleId) return;

    const interval = setInterval(() => {
      if (!isDirty) return;
      const data = buildSaveData();
      const snapshot = JSON.stringify(data);
      if (snapshot === lastSavedRef.current) return;

      setAutoSaveLabel("Saving...");
      try {
        onSave(data);
        lastSavedRef.current = snapshot;
        setIsDirty(false);
        setAutoSaveLabel(`Saved at ${format(new Date(), "HH:mm")}`);
      } catch {
        setAutoSaveLabel("Auto-save failed");
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [status, isDirty, buildSaveData, onSave, articleId]);

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return { autoSaveLabel, isDirty, markDirty, setIsDirty };
};

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

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
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

  // Block browser tab close / refresh AND back/forward navigation
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);

    // Push a dummy history entry so the back button triggers popstate
    window.history.pushState({ editorDirtyGuard: true }, "");
    const onPopState = (_e: PopStateEvent) => {
      const confirmed = window.confirm(
        "You have unsaved changes. Leave anyway and lose your work?"
      );
      if (!confirmed) {
        // Re-push the guard entry so the next back press is also caught
        window.history.pushState({ editorDirtyGuard: true }, "");
      }
      // If confirmed, the browser naturally navigates back
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("popstate", onPopState);
    };
  }, [isDirty]);

  return { autoSaveLabel, isDirty, markDirty, markClean, setIsDirty };
};

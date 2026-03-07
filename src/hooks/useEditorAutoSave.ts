import { useEffect, useRef, useState, useCallback } from "react";
import { useBlocker } from "react-router-dom";
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

  // Block browser tab close / refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Block React Router back/forward navigation (catches mobile back button)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // When blocker fires, show native confirm dialog
  useEffect(() => {
    if (blocker.state === "blocked") {
      const confirmed = window.confirm(
        "You have unsaved changes. Leave anyway and lose your work?"
      );
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  return { autoSaveLabel, isDirty, markDirty, markClean, setIsDirty };
};

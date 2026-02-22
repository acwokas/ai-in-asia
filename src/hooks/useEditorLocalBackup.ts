import { useEffect, useCallback } from "react";
import { toast } from "sonner";

const BACKUP_KEY_PREFIX = "editor-backup-";

interface UseEditorLocalBackupOptions {
  articleId?: string | null;
  buildSaveData: () => any;
  initialData?: any;
  onRestore: (data: any) => void;
}

export const useEditorLocalBackup = ({
  articleId,
  buildSaveData,
  initialData,
  onRestore,
}: UseEditorLocalBackupOptions) => {
  const key = articleId ? `${BACKUP_KEY_PREFIX}${articleId}` : null;

  // Save backup every 30s
  useEffect(() => {
    if (!key) return;
    const interval = setInterval(() => {
      try {
        const data = buildSaveData();
        localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
      } catch {
        // localStorage quota exceeded, silently ignore
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [key, buildSaveData]);

  // On mount, check for a newer backup
  useEffect(() => {
    if (!key || !initialData) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const { data, ts } = JSON.parse(raw) as { data: any; ts: number };
      const dbUpdated = initialData.updated_at ? new Date(initialData.updated_at).getTime() : 0;
      if (ts > dbUpdated) {
        toast("Unsaved backup found", {
          description: `From ${new Date(ts).toLocaleString()}`,
          action: {
            label: "Restore",
            onClick: () => {
              onRestore(data);
              toast.success("Backup restored");
            },
          },
          duration: 10_000,
        });
      } else {
        // Backup is older, remove it
        localStorage.removeItem(key);
      }
    } catch {
      // ignore parse errors
    }
  }, [key, initialData]);

  const clearBackup = useCallback(() => {
    if (key) localStorage.removeItem(key);
  }, [key]);

  return { clearBackup };
};

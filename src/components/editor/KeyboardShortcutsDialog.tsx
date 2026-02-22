import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

const shortcuts = [
  { keys: `${mod}+S`, description: "Save article" },
  { keys: `${mod}+Shift+P`, description: "Toggle Content / Preview" },
  { keys: `${mod}+K`, description: "Focus slug field" },
];

const KeyboardShortcutsDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Keyboard shortcuts">
        <HelpCircle className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        {shortcuts.map((s) => (
          <div key={s.keys} className="flex items-center justify-between">
            <span className="text-sm">{s.description}</span>
            <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
              {s.keys}
            </kbd>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default KeyboardShortcutsDialog;

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ReturnTriggerBlock = () => {
  const { toast } = useToast();

  const handleBookmarkPrompt = () => {
    // Detect OS for correct keyboard shortcut
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? '⌘+D' : 'Ctrl+D';
    
    toast({
      title: "Add to bookmarks",
      description: `Press ${shortcut} to bookmark this page in your browser`,
    });
  };

  return (
    <div className="my-8 p-6 bg-muted/50 border border-border rounded-lg">
      <h3 className="text-lg font-semibold text-foreground mb-3">
        This story isn't finished
      </h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We track how AI, platforms, policy, and adoption evolve across Asia.
        This article may be updated as things change, with follow-ups and regional context.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleBookmarkPrompt}
        className="gap-2"
      >
        <Bookmark className="h-4 w-4" />
        Bookmark this page
      </Button>
    </div>
  );
};

export default ReturnTriggerBlock;

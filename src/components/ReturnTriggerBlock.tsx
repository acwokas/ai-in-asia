import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReturnTriggerBlockProps {
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

const ReturnTriggerBlock = ({ onBookmark, isBookmarked }: ReturnTriggerBlockProps) => {
  return (
    <div className="my-8 p-6 bg-muted/50 border border-border rounded-lg">
      <h3 className="text-lg font-semibold text-foreground mb-3">
        This story isn't finished
      </h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We track how AI, platforms, policy, and adoption evolve across Asia.
        This article may be updated as things change, with follow-ups and regional context.
      </p>
      {onBookmark ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onBookmark}
          className="gap-2"
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          {isBookmarked ? 'Bookmarked - check back for updates' : 'Bookmark AIinASIA and check back for updates'}
        </Button>
      ) : (
        <p className="text-foreground font-medium flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          Bookmark AIinASIA and check back for updates.
        </p>
      )}
    </div>
  );
};

export default ReturnTriggerBlock;

import { MessageSquare } from "lucide-react";
import { Button } from "./ui/button";

interface ShareThoughtsCTAProps {
  commentCount?: number;
}

const ShareThoughtsCTA = ({ commentCount = 0 }: ShareThoughtsCTAProps) => {
  const scrollToComments = () => {
    const commentsSection = document.getElementById("comments-section");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 my-8 text-center">
      <MessageSquare className="h-8 w-8 text-primary mx-auto mb-3" />
      <h3 className="text-lg font-semibold mb-2">Share your thoughts</h3>
      <p className="text-muted-foreground text-sm mb-4">
        {commentCount > 0 
          ? `Join ${commentCount} reader${commentCount > 1 ? 's' : ''} in the discussion below`
          : "Be the first to share your perspective on this story"
        }
      </p>
      <Button onClick={scrollToComments} variant="outline" className="gap-2">
        <MessageSquare className="h-4 w-4" />
        Jump to Comments
      </Button>
    </div>
  );
};

export default ShareThoughtsCTA;

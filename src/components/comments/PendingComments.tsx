import { Button } from "@/components/ui/button";
import { User, Check, X } from "lucide-react";
import { Comment } from "./CommentThread";

interface PendingCommentsProps {
  comments: Comment[];
  onApprove: (commentId: string) => void;
  onReject: (commentId: string) => void;
}

export const PendingComments = ({
  comments,
  onApprove,
  onReject,
}: PendingCommentsProps) => {
  if (comments.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      <h3 className="font-semibold text-lg text-destructive">
        Pending Approval ({comments.length})
      </h3>
      {comments.map((comment) => (
        <div 
          key={comment.id} 
          className="flex gap-4 bg-destructive/10 p-4 rounded-lg border-2 border-destructive"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-destructive to-destructive/70 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-destructive">
                {comment.author_name || "Anonymous"}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(comment.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <p className="text-foreground mb-3">{comment.content}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => onApprove(comment.id)}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onReject(comment.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PendingComments;

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Comment } from "./CommentThread";

interface CommentEditDialogProps {
  editingComment: Comment | null;
  editContent: string;
  setEditContent: (content: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const CommentEditDialog = ({
  editingComment,
  editContent,
  setEditContent,
  onClose,
  onSave,
}: CommentEditDialogProps) => {
  return (
    <Dialog open={!!editingComment} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Comment</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[150px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommentEditDialog;

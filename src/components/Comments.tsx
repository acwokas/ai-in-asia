import { useState } from "react";
import { MessageCircle, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useComments } from "@/hooks/useComments";
import {
  CommentThread,
  AICommentControls,
  CommentForm,
  PendingComments,
  CommentEditDialog,
  Comment,
} from "@/components/comments";

interface CommentsProps {
  articleId: string;
}

const Comments = ({ articleId }: CommentsProps) => {
  const {
    comments,
    aiComments,
    pendingComments,
    loading,
    generating,
    isAdmin,
    handleGenerateComments,
    handleRegenerateAll,
    handleDeleteAllAiComments,
    handlePublishComment,
    handlePublishAll,
    handleUnpublishAll,
    handleDeleteAiComment,
    handleSaveEdit,
    handleUpdateCommentDate,
    handleApprove,
    handleReject,
    handleSubmitComment,
    handleReplySubmit,
  } = useComments(articleId);

  const [isOpen, setIsOpen] = useState(true);
  const [isAiControlsOpen, setIsAiControlsOpen] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");
  const [isNotRobot, setIsNotRobot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Calculate total comments including replies
  const countAllComments = (comments: Comment[]): number => {
    return comments.reduce((total, comment) => {
      return total + 1 + (comment.replies ? countAllComments(comment.replies) : 0);
    }, 0);
  };
  const totalCommentCount = countAllComments(comments);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const success = await handleSubmitComment(authorName, authorEmail, content);
    if (success) {
      setAuthorName("");
      setAuthorEmail("");
      setContent("");
      setIsNotRobot(false);
    }
    setSubmitting(false);
  };

  const handleReplyFormSubmit = async (parentComment: Comment) => {
    if (!replyContent.trim()) return;
    setSubmittingReply(true);
    const success = await handleReplySubmit(parentComment, replyContent);
    if (success) {
      setReplyingTo(null);
      setReplyContent("");
    }
    setSubmittingReply(false);
  };

  const handleEditSave = async () => {
    if (!editingComment) return;
    await handleSaveEdit(editingComment.id, editContent);
    setEditingComment(null);
    setEditContent("");
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-12 pt-8 border-t border-border">
      <CollapsibleTrigger className="flex items-center justify-between w-full group mb-8">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="headline text-3xl">Comments ({totalCommentCount})</h2>
        </div>
        <ChevronDown className={`h-6 w-6 text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>

      <CollapsibleContent>
        {/* Admin AI Comment Controls */}
        {isAdmin && (
          <AICommentControls
            isOpen={isAiControlsOpen}
            setIsOpen={setIsAiControlsOpen}
            aiComments={aiComments}
            generating={generating}
            onGenerate={handleGenerateComments}
            onRegenerateAll={handleRegenerateAll}
            onPublishAll={handlePublishAll}
            onUnpublishAll={handleUnpublishAll}
            onDeleteAll={handleDeleteAllAiComments}
            onPublishComment={handlePublishComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteAiComment}
            onUpdateCommentDate={handleUpdateCommentDate}
          />
        )}

        {/* Comments List */}
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading comments...</div>
        ) : (
          <>
            {/* Pending Comments (Admin Only) */}
            {isAdmin && (
              <PendingComments
                comments={pendingComments}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}

            {/* Latest Comments */}
            {comments.length === 0 && pendingComments.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No comments yet. Be the first to share your thoughts!</p>
              </div>
            ) : comments.length > 0 && (
              <div className="space-y-6 mb-8">
                {comments.length > 0 && <h3 className="font-semibold text-lg">Latest Comments ({totalCommentCount})</h3>}
                {comments.map((comment) => (
                  <CommentThread 
                    key={comment.id} 
                    comment={comment} 
                    isAdmin={isAdmin}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyContent={replyContent}
                    setReplyContent={setReplyContent}
                    submittingReply={submittingReply}
                    handleReplySubmit={handleReplyFormSubmit}
                    depth={0}
                  />
                ))}
              </div>
            )}

            {/* Comment Form */}
            <CommentForm
              authorName={authorName}
              setAuthorName={setAuthorName}
              authorEmail={authorEmail}
              setAuthorEmail={setAuthorEmail}
              content={content}
              setContent={setContent}
              isNotRobot={isNotRobot}
              setIsNotRobot={setIsNotRobot}
              submitting={submitting}
              onSubmit={handleFormSubmit}
            />
          </>
        )}

        {/* Edit Comment Dialog */}
        <CommentEditDialog
          editingComment={editingComment}
          editContent={editContent}
          setEditContent={setEditContent}
          onClose={() => setEditingComment(null)}
          onSave={handleEditSave}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Comments;

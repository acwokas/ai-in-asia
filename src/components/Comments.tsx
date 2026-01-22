import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { 
  MessageCircle, User, ChevronDown, Check, X, 
  Sparkles, RefreshCw, Trash2, Edit2, Eye, EyeOff,
  Loader2, AlertTriangle, Reply, CornerDownRight
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import DOMPurify from "dompurify";

interface Comment {
  id: string;
  content: string;
  author_name: string | null;
  author_handle?: string | null;
  avatar_url?: string | null;
  created_at: string;
  approved: boolean;
  is_ai?: boolean;
  published?: boolean;
  comment_date?: string;
  parent_id?: string | null;
  replies?: Comment[];
}

interface CommentsProps {
  articleId: string;
}

// Helper to wrap emojis in teal-colored spans with XSS protection
const formatCommentWithEmojis = (content: string): string => {
  // First sanitize to remove any malicious HTML/scripts
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['br'], // Only allow line breaks
    ALLOWED_ATTR: [] // No attributes allowed
  });
  // Then wrap emojis
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  return sanitized.replace(emojiRegex, '<span class="text-primary">$1</span>');
};

// Helper to organize comments into threaded structure
const organizeThreadedComments = (comments: Comment[]): Comment[] => {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create map of all comments
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: organize into tree structure
  comments.forEach(comment => {
    const mappedComment = commentMap.get(comment.id)!;
    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      const parent = commentMap.get(comment.parent_id)!;
      parent.replies = parent.replies || [];
      parent.replies.push(mappedComment);
    } else {
      rootComments.push(mappedComment);
    }
  });

  // Sort replies by date (oldest first for natural conversation flow)
  const sortReplies = (comments: Comment[]) => {
    comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        sortReplies(comment.replies);
      }
    });
  };
  sortReplies(rootComments);

  return rootComments;
};

// Threaded comment display component
interface CommentThreadProps {
  comment: Comment;
  isAdmin: boolean;
  replyingTo: Comment | null;
  setReplyingTo: (comment: Comment | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  submittingReply: boolean;
  handleReplySubmit: (parentComment: Comment) => void;
  depth: number;
}

const CommentThread = ({ 
  comment, 
  isAdmin, 
  replyingTo, 
  setReplyingTo, 
  replyContent, 
  setReplyContent, 
  submittingReply, 
  handleReplySubmit,
  depth 
}: CommentThreadProps) => {
  const maxDepth = 3; // Maximum nesting level
  const isReplying = replyingTo?.id === comment.id;

  return (
    <div className={depth > 0 ? "ml-6 sm:ml-10 border-l-2 border-primary/20 pl-4" : ""}>
      <div className="flex gap-4">
        {comment.avatar_url ? (
          <img 
            src={comment.avatar_url} 
            alt={comment.author_name || "User"} 
            className={`${depth > 0 ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex-shrink-0 object-cover`}
          />
        ) : (
          <div className={`${depth > 0 ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0`}>
            <User className={depth > 0 ? "h-4 w-4 text-white" : "h-5 w-5 text-white"} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={`font-semibold truncate ${depth > 0 ? 'text-sm' : ''}`}>
                {comment.author_name || "Anonymous"}
              </span>
              {comment.author_handle && (
                <span className="text-xs sm:text-sm text-muted-foreground">
                  @{comment.author_handle}
                </span>
              )}
              {comment.is_ai && (
                <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                  AI
                </Badge>
              )}
              {isAdmin && comment.is_ai && !comment.published && (
                <Badge variant="outline" className="h-5 px-2 text-[10px]">
                  Unpublished
                </Badge>
              )}
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <p className={`text-muted-foreground ${depth > 0 ? 'text-sm' : ''}`} dangerouslySetInnerHTML={{ __html: formatCommentWithEmojis(comment.content) }} />
          
          {/* Reply button - only show if not at max depth and user is admin */}
          {isAdmin && depth < maxDepth && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={() => setReplyingTo(isReplying ? null : comment)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}

          {/* Reply form */}
          {isReplying && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-2">
                <CornerDownRight className="h-4 w-4 text-muted-foreground mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to ${comment.author_name}...`}
                    className="min-h-[80px] text-sm"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => handleReplySubmit(comment)}
                      disabled={submittingReply || !replyContent.trim()}
                    >
                      {submittingReply ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Posting...</>
                      ) : (
                        "Post Reply"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              isAdmin={isAdmin}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              submittingReply={submittingReply}
              handleReplySubmit={handleReplySubmit}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Comments = ({ articleId }: CommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [aiComments, setAiComments] = useState<Comment[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");
  const [isNotRobot, setIsNotRobot] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isAiControlsOpen, setIsAiControlsOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const { toast } = useToast();

  // Fetch comments when admin status is determined
  useEffect(() => {
    if (!isAdminLoading) {
      fetchComments();
    }
  }, [articleId, isAdmin, isAdminLoading]);

  const fetchComments = async () => {
    try {
      // Fetch approved real comments from public view (excludes author_email for privacy)
      const { data: approvedData, error: approvedError } = await supabase
        .from("comments_public")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false });

      if (approvedError) throw approvedError;

      // Fetch AI generated comments - admins see all, users see only published AND where comment_date has passed
      console.log("[Comments] Fetching AI comments", { articleId, isAdmin });

      const aiQuery = supabase
        .from("ai_generated_comments")
        .select("id, content, comment_date, published, parent_id, author_id")
        .eq("article_id", articleId)
        .order("comment_date", { ascending: false });

      // Non-admins only see published comments where the comment_date has passed
      if (!isAdmin) {
        aiQuery.eq("published", true);
        aiQuery.lte("comment_date", new Date().toISOString());
      }

      const { data: aiCommentsData, error: aiError } = await aiQuery;

      if (aiError) throw aiError;

      console.log("[Comments] AI comments fetched", { count: aiCommentsData?.length ?? 0 });

      const authorIds = Array.from(
        new Set((aiCommentsData || []).map((c: any) => c.author_id).filter(Boolean))
      );

      const authorsById = new Map<string, { name: string; handle: string; avatar_url: string | null }>();
      if (authorIds.length > 0) {
        const { data: authorsData, error: authorsError } = await supabase
          .from("ai_comment_authors")
          .select("id, name, handle, avatar_url")
          .in("id", authorIds);

        if (authorsError) throw authorsError;

        (authorsData || []).forEach((a: any) => {
          authorsById.set(a.id, { name: a.name, handle: a.handle, avatar_url: a.avatar_url });
        });
      }

      // Transform AI comments to match Comment interface
      const transformedAiComments: Comment[] = (aiCommentsData || []).map((aiComment: any) => {
        const author = authorsById.get(aiComment.author_id);
        return {
          id: aiComment.id,
          content: aiComment.content,
          author_name: author?.name || "Unknown",
          author_handle: author?.handle,
          avatar_url: author?.avatar_url ?? undefined,
          created_at: aiComment.comment_date,
          approved: true,
          is_ai: true,
          published: aiComment.published ?? false,
          comment_date: aiComment.comment_date,
          parent_id: aiComment.parent_id,
        };
      });

      setAiComments(transformedAiComments);

      // Combine AI comments with real comments for display
      const displayAiComments = isAdmin
        ? transformedAiComments
        : transformedAiComments.filter((c) => c.published);

      const allDisplayComments = [...(approvedData || []), ...displayAiComments];
      allDisplayComments.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Organize into threaded structure
      const threadedComments = organizeThreadedComments(allDisplayComments);
      setComments(threadedComments);

      // Fetch pending comments if admin
      if (isAdmin) {
        const { data: pendingData, error: pendingError } = await supabase
          .from("comments")
          .select("*")
          .eq("article_id", articleId)
          .eq("approved", false)
          .order("created_at", { ascending: false });

        if (pendingError) throw pendingError;
        setPendingComments(pendingData || []);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      if (isAdmin) {
        const message = error instanceof Error ? error.message : "Unknown error";
        toast({
          title: "Failed to load comments",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateComments = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-comments", {
        body: { articleIds: [articleId] },
      });

      if (error) throw error;

      toast({
        title: "Comments generated",
        description: `Generated ${data.commentsGenerated} comments. They are unpublished by default.`,
      });

      // Small delay to ensure database has committed the new records
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchComments();
    } catch (error) {
      console.error("Error generating comments:", error);
      toast({
        title: "Failed to generate comments",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateAll = async () => {
    setGenerating(true);
    try {
      // Delete existing AI comments first
      await supabase
        .from("ai_generated_comments")
        .delete()
        .eq("article_id", articleId);

      // Generate new ones
      const { data, error } = await supabase.functions.invoke("generate-ai-comments", {
        body: { articleIds: [articleId] },
      });

      if (error) throw error;

      toast({
        title: "Comments regenerated",
        description: `Generated ${data.commentsGenerated} new comments.`,
      });

      fetchComments();
    } catch (error) {
      console.error("Error regenerating comments:", error);
      toast({
        title: "Failed to regenerate comments",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAllAiComments = async () => {
    try {
      const { error } = await supabase
        .from("ai_generated_comments")
        .delete()
        .eq("article_id", articleId);

      if (error) throw error;

      toast({
        title: "All AI comments deleted",
        description: "AI comments have been removed from this article.",
      });

      fetchComments();
    } catch (error) {
      toast({
        title: "Failed to delete comments",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handlePublishComment = async (commentId: string, publish: boolean) => {
    try {
      const { error } = await supabase
        .from("ai_generated_comments")
        .update({ published: publish })
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: publish ? "Comment published" : "Comment unpublished",
        description: publish ? "The comment is now visible to everyone." : "The comment is now hidden.",
      });

      fetchComments();
    } catch (error) {
      toast({
        title: "Failed to update comment",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handlePublishAll = async () => {
    try {
      const now = new Date().toISOString();
      
      // Only publish comments where comment_date has passed
      const { error, count } = await supabase
        .from("ai_generated_comments")
        .update({ published: true })
        .eq("article_id", articleId)
        .lte("comment_date", now)
        .eq("published", false);

      if (error) throw error;

      // Count how many future-dated comments remain unpublished
      const futureCount = aiComments.filter(c => 
        !c.published && new Date(c.created_at) > new Date()
      ).length;

      toast({
        title: "Comments published",
        description: futureCount > 0 
          ? `Published current comments. ${futureCount} future-dated comment(s) will auto-publish when their date arrives.`
          : "All AI comments are now visible to everyone.",
      });

      fetchComments();
    } catch (error) {
      toast({
        title: "Failed to publish comments",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleUnpublishAll = async () => {
    try {
      const { error } = await supabase
        .from("ai_generated_comments")
        .update({ published: false })
        .eq("article_id", articleId);

      if (error) throw error;

      toast({
        title: "All comments unpublished",
        description: "All AI comments are now hidden.",
      });

      fetchComments();
    } catch (error) {
      toast({
        title: "Failed to unpublish comments",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAiComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("ai_generated_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment deleted",
        description: "The comment has been removed.",
      });

      fetchComments();
    } catch (error) {
      toast({
        title: "Failed to delete comment",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editingComment) return;

    try {
      const { error } = await supabase
        .from("ai_generated_comments")
        .update({ content: editContent })
        .eq("id", editingComment.id);

      if (error) throw error;

      toast({
        title: "Comment updated",
        description: "The comment has been saved.",
      });

      setEditingComment(null);
      setEditContent("");
      fetchComments();
    } catch (error) {
      toast({
        title: "Failed to update comment",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ approved: true })
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment approved",
        description: "The comment is now visible to everyone.",
      });

      fetchComments();
    } catch (error) {
      toast({
        title: "Failed to approve comment",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment rejected",
        description: "The comment has been deleted.",
      });

      fetchComments();
    } catch (error) {
      toast({
        title: "Failed to reject comment",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: newComment, error } = await supabase
        .from("comments")
        .insert([
          {
            article_id: articleId,
            author_name: authorName,
            author_email: authorEmail,
            content: content,
            approved: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      try {
        await supabase.functions.invoke("notify-new-comment", {
          body: {
            comment_id: newComment.id,
            article_id: articleId,
            author_name: authorName,
            author_email: authorEmail,
            content: content,
          },
        });
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
      }

      toast({
        title: "Comment submitted",
        description: "Your comment is awaiting moderation and will appear shortly.",
      });

      setAuthorName("");
      setAuthorEmail("");
      setContent("");
      setIsNotRobot(false);
    } catch (error) {
      toast({
        title: "Failed to submit comment",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentComment: Comment) => {
    if (!replyContent.trim()) return;
    setSubmittingReply(true);

    try {
      // For AI comments, create a reply in the ai_generated_comments table
      if (parentComment.is_ai) {
        // Get a random author for the reply
        const { data: authors } = await supabase
          .from("ai_comment_authors")
          .select("id")
          .limit(50);
        
        if (!authors || authors.length === 0) {
          throw new Error("No AI authors available");
        }
        
        const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
        
        const { error } = await supabase
          .from("ai_generated_comments")
          .insert({
            article_id: articleId,
            author_id: randomAuthor.id,
            content: replyContent,
            comment_date: new Date().toISOString(),
            published: true,
            parent_id: parentComment.id,
          });

        if (error) throw error;
      } else {
        // For real comments, create a reply in the comments table (awaiting moderation)
        const { error } = await supabase
          .from("comments")
          .insert({
            article_id: articleId,
            author_name: "Reply", // This would need a form for real users
            content: replyContent,
            approved: false,
            parent_id: parentComment.id,
          });

        if (error) throw error;
      }

      toast({
        title: "Reply added",
        description: parentComment.is_ai ? "Reply has been published." : "Reply is awaiting moderation.",
      });

      setReplyingTo(null);
      setReplyContent("");
      fetchComments();
    } catch (error) {
      console.error("Error submitting reply:", error);
      toast({
        title: "Failed to submit reply",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReply(false);
    }
  };

  // Calculate total comments including replies
  const countAllComments = (comments: Comment[]): number => {
    return comments.reduce((total, comment) => {
      return total + 1 + (comment.replies ? countAllComments(comment.replies) : 0);
    }, 0);
  };
  const totalCommentCount = countAllComments(comments);

  const unpublishedCount = aiComments.filter(c => !c.published).length;
  const publishedCount = aiComments.filter(c => c.published).length;

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
          <Collapsible open={isAiControlsOpen} onOpenChange={setIsAiControlsOpen} className="mb-8">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <CollapsibleTrigger className="flex items-center gap-2 w-full">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">AI Comment Controls</h3>
                <span className="text-sm text-muted-foreground ml-auto mr-2">
                  {publishedCount} published / {unpublishedCount} unpublished
                </span>
                <ChevronDown className={`h-5 w-5 text-primary transition-transform duration-200 ${isAiControlsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    size="sm"
                    onClick={handleGenerateComments}
                    disabled={generating}
                  >
                    {generating ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-1" /> Generate Comments</>
                    )}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" disabled={generating || aiComments.length === 0}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Regenerate All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate all AI comments?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all existing AI comments for this article and generate new ones.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRegenerateAll}>Regenerate</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handlePublishAll}
                    disabled={unpublishedCount === 0}
                  >
                    <Eye className="h-4 w-4 mr-1" /> Publish All
                  </Button>

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleUnpublishAll}
                    disabled={publishedCount === 0}
                  >
                    <EyeOff className="h-4 w-4 mr-1" /> Unpublish All
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={aiComments.length === 0}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete all AI comments?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all AI-generated comments for this article.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAllAiComments} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* AI Comments List for Admin */}
                {aiComments.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <h4 className="text-sm font-medium text-muted-foreground">AI Comments ({aiComments.length})</h4>
                    {aiComments.map((comment) => (
                      <div 
                        key={comment.id} 
                        className={`flex gap-3 p-3 rounded-lg border ${
                          comment.published 
                            ? 'bg-background border-border' 
                            : 'bg-muted/50 border-dashed border-muted-foreground/30'
                        }`}
                      >
                        {comment.avatar_url ? (
                          <img 
                            src={comment.avatar_url} 
                            alt={comment.author_name || "User"} 
                            className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-secondary/60 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {comment.author_name}
                            </span>
                            {comment.author_handle && (
                              <span className="text-xs text-muted-foreground">
                                @{comment.author_handle}
                              </span>
                            )}
                            {!comment.published && (
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                Unpublished
                              </span>
                            )}
                            {comment.comment_date && (
                              <span className="text-xs text-muted-foreground">
                                Scheduled: {new Date(comment.comment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatCommentWithEmojis(comment.content) }} />
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handlePublishComment(comment.id, !comment.published)}
                            title={comment.published ? "Unpublish" : "Publish"}
                          >
                            {comment.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleEditComment(comment)}
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this AI-generated comment.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteAiComment(comment.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Comments List */}
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading comments...</div>
        ) : (
          <>
            {/* Pending Comments (Admin Only) */}
            {isAdmin && pendingComments.length > 0 && (
              <div className="mb-8 space-y-4">
                <h3 className="font-semibold text-lg text-destructive">Pending Approval ({pendingComments.length})</h3>
                {pendingComments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 bg-destructive/10 p-4 rounded-lg border-2 border-destructive">
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
                          onClick={() => handleApprove(comment.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(comment.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                    handleReplySubmit={handleReplySubmit}
                    depth={0}
                  />
                ))}
              </div>
            )}

            {/* Comment Form */}
            <div className="bg-muted/30 rounded-lg p-6 mt-8">
              <h3 className="font-semibold text-lg mb-4">Leave a Comment</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Name *
                    </label>
                    <Input
                      id="name"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      required
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={authorEmail}
                      onChange={(e) => setAuthorEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your email will not be published
                    </p>
                  </div>
                </div>
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium mb-2">
                    Comment *
                  </label>
                  <Textarea
                    id="comment"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    placeholder="Share your thoughts..."
                    className="min-h-[120px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="robot-check"
                    checked={isNotRobot}
                    onCheckedChange={(checked) => setIsNotRobot(checked as boolean)}
                    required
                  />
                  <label
                    htmlFor="robot-check"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I'm not a robot *
                  </label>
                </div>
                <Button type="submit" disabled={submitting || !isNotRobot}>
                  {submitting ? "Submitting..." : "Post Comment"}
                </Button>
              </form>
            </div>
          </>
        )}

        {/* Edit Comment Dialog */}
        <Dialog open={!!editingComment} onOpenChange={() => setEditingComment(null)}>
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
              <Button variant="outline" onClick={() => setEditingComment(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Comments;

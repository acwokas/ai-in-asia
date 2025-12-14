import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, User, ChevronDown, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Comment {
  id: string;
  content: string;
  author_name: string | null;
  author_handle?: string | null;
  avatar_url?: string | null;
  created_at: string;
  approved: boolean;
  is_ai?: boolean;
}

interface CommentsProps {
  articleId: string;
}

// Helper to wrap emojis in teal-colored spans
const formatCommentWithEmojis = (content: string): string => {
  // Emoji regex pattern
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  return content.replace(emojiRegex, '<span class="text-primary">$1</span>');
};

const Comments = ({ articleId }: CommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");
  const [isNotRobot, setIsNotRobot] = useState(false);
  const [isOpen, setIsOpen] = useState(true); // Open by default
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    fetchComments();
  }, [articleId, isAdmin]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    setIsAdmin(roles?.some(r => r.role === "admin") || false);
  };

  const fetchComments = async () => {
    try {
      // Fetch approved real comments
      const { data: approvedData, error: approvedError } = await supabase
        .from("comments")
        .select("*")
        .eq("article_id", articleId)
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (approvedError) throw approvedError;

      // Fetch AI generated comments
      const { data: aiComments, error: aiError } = await supabase
        .from("ai_generated_comments")
        .select(`
          id,
          content,
          comment_date,
          ai_comment_authors (
            name,
            handle,
            avatar_url
          )
        `)
        .eq("article_id", articleId)
        .order("comment_date", { ascending: false });

      if (aiError) throw aiError;

      // Transform AI comments to match Comment interface
      const transformedAiComments: Comment[] = (aiComments || []).map((aiComment: any) => ({
        id: aiComment.id,
        content: aiComment.content,
        author_name: aiComment.ai_comment_authors.name,
        author_handle: aiComment.ai_comment_authors.handle,
        avatar_url: aiComment.ai_comment_authors.avatar_url,
        created_at: aiComment.comment_date,
        approved: true,
        is_ai: true,
      }));

      // Combine and sort all comments by date
      const allComments = [...(approvedData || []), ...transformedAiComments];
      allComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setComments(allComments);

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
    } finally {
      setLoading(false);
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
            approved: false, // Requires moderation
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send email notification
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
        // Don't fail the whole operation if email fails
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-12 pt-8 border-t border-border">
      <CollapsibleTrigger className="flex items-center justify-between w-full group mb-8">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="headline text-3xl">Comments ({comments.length})</h2>
        </div>
        <ChevronDown className={`h-6 w-6 text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>

      <CollapsibleContent>
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
              {comments.length > 0 && <h3 className="font-semibold text-lg">Latest Comments ({comments.length})</h3>}
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  {comment.avatar_url ? (
                    <img 
                      src={comment.avatar_url} 
                      alt={comment.author_name || "User"} 
                      className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {comment.author_name || "Anonymous"}
                      </span>
                      {comment.author_handle && (
                        <span className="text-sm text-muted-foreground">
                          @{comment.author_handle}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        •
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: formatCommentWithEmojis(comment.content) }} />
                  </div>
                </div>
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
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Comments;

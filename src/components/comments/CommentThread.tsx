import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, Reply, CornerDownRight, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { awardPoints } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export interface Comment {
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
  user_id?: string | null;
  user_level?: string | null;
  replies?: Comment[];
}

const levelBadgeConfig: Record<string, { className: string; prefix?: string }> = {
  'Explorer': { className: 'bg-secondary text-secondary-foreground' },
  'Enthusiast': { className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20' },
  'Expert': { className: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20' },
  'Thought Leader': { className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20', prefix: '✨ ' },
};

// Helper to wrap emojis in teal-colored spans with XSS protection
export const formatCommentWithEmojis = (content: string): string => {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['br'],
    ALLOWED_ATTR: []
  });
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  return sanitized.replace(emojiRegex, '<span class="text-primary">$1</span>');
};

// Helper to organize comments into threaded structure
export const organizeThreadedComments = (comments: Comment[]): Comment[] => {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

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

interface CommentReactionsBarProps {
  commentId: string;
}

const COMMENT_REACTIONS = [
  { type: "thumbsup", emoji: "👍" },
  { type: "heart", emoji: "❤️" },
  { type: "lightbulb", emoji: "💡" },
];

const CommentReactionsBar = ({ commentId }: CommentReactionsBarProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: counts = {} } = useQuery({
    queryKey: ["comment-reactions-counts", commentId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("comment_reactions")
        .select("reaction")
        .eq("comment_id", commentId);
      const map: Record<string, number> = {};
      for (const r of data || []) {
        map[r.reaction] = (map[r.reaction] || 0) + 1;
      }
      return map;
    },
  });

  const { data: userReactions = [] } = useQuery({
    queryKey: ["comment-reactions-user", commentId, user?.id],
    staleTime: 30_000,
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("comment_reactions")
        .select("reaction")
        .eq("comment_id", commentId)
        .eq("user_id", user.id);
      return (data || []).map((r) => r.reaction);
    },
  });

  const mutation = useMutation({
    mutationFn: async (reaction: string) => {
      if (!user) return;
      const hasReaction = userReactions.includes(reaction);
      if (hasReaction) {
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .eq("reaction", reaction);
      } else {
        await supabase.from("comment_reactions").insert({
          comment_id: commentId,
          user_id: user.id,
          reaction,
        });
        await awardPoints(user.id, 1);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["comment-reactions-counts", commentId] });
      queryClient.invalidateQueries({ queryKey: ["comment-reactions-user", commentId] });
    },
  });

  if (!user) return null;

  return (
    <div className="flex items-center gap-1 mt-1.5">
      {COMMENT_REACTIONS.map(({ type, emoji }) => {
        const count = counts[type] || 0;
        const isActive = userReactions.includes(type);
        return (
          <button
            key={type}
            onClick={() => mutation.mutate(type)}
            disabled={mutation.isPending}
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs transition-all cursor-pointer",
              "hover:bg-primary/10",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
            )}
          >
            <span className="text-sm">{emoji}</span>
            {count > 0 && <span className="text-[10px] font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

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

export const CommentThread = ({ 
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
  const maxDepth = 3;
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
              {comment.user_id && comment.user_level && !comment.is_ai && (() => {
                const config = levelBadgeConfig[comment.user_level!] || levelBadgeConfig['Explorer'];
                return (
                  <Badge variant="outline" className={`h-5 px-2 text-[10px] border ${config.className}`}>
                    {config.prefix || ''}{comment.user_level}
                  </Badge>
                );
              })()}
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
          
          <div className="flex items-center gap-2 flex-wrap">
            <CommentReactionsBar commentId={comment.id} />
            
            {isAdmin && depth < maxDepth && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={() => setReplyingTo(isReplying ? null : comment)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>

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

export default CommentThread;

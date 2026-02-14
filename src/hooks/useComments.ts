import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Comment, organizeThreadedComments } from "@/components/comments/CommentThread";

export const useComments = (articleId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [aiComments, setAiComments] = useState<Comment[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdminLoading) {
      fetchComments();
    }
  }, [articleId, isAdmin, isAdminLoading]);

  const fetchComments = async () => {
    try {
      const { data: approvedData, error: approvedError } = await supabase
        .from("comments_public")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false });

      if (approvedError) throw approvedError;

      const aiQuery = supabase
        .from("ai_generated_comments")
        .select("id, content, comment_date, published, parent_id, author_id")
        .eq("article_id", articleId)
        .order("comment_date", { ascending: false });

      if (!isAdmin) {
        aiQuery.eq("published", true);
        aiQuery.lte("comment_date", new Date().toISOString());
      }

      const { data: aiCommentsData, error: aiError } = await aiQuery;
      if (aiError) throw aiError;

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

      const displayAiComments = isAdmin
        ? transformedAiComments
        : transformedAiComments.filter((c) => c.published);

      const allDisplayComments = [...(approvedData || []), ...displayAiComments];
      allDisplayComments.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const threadedComments = organizeThreadedComments(allDisplayComments);
      setComments(threadedComments);

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
        toast({
          title: "Failed to load comments",
          description: error instanceof Error ? error.message : "Unknown error",
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
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchComments();
    } catch (error) {
      toast({ title: "Failed to generate comments", description: "Please try again later.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateAll = async () => {
    setGenerating(true);
    try {
      await supabase.from("ai_generated_comments").delete().eq("article_id", articleId);
      const { data, error } = await supabase.functions.invoke("generate-ai-comments", {
        body: { articleIds: [articleId] },
      });
      if (error) throw error;
      toast({ title: "Comments regenerated", description: `Generated ${data.commentsGenerated} new comments.` });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to regenerate comments", description: "Please try again later.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAllAiComments = async () => {
    try {
      const { error } = await supabase.from("ai_generated_comments").delete().eq("article_id", articleId);
      if (error) throw error;
      toast({ title: "All AI comments deleted", description: "AI comments have been removed from this article." });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to delete comments", description: "Please try again later.", variant: "destructive" });
    }
  };

  const handlePublishComment = async (commentId: string, publish: boolean) => {
    try {
      const { error } = await supabase.from("ai_generated_comments").update({ published: publish }).eq("id", commentId);
      if (error) throw error;
      toast({
        title: publish ? "Comment published" : "Comment unpublished",
        description: publish ? "The comment is now visible to everyone." : "The comment is now hidden.",
      });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to update comment", description: "Please try again later.", variant: "destructive" });
    }
  };

  const handlePublishAll = async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("ai_generated_comments")
        .update({ published: true })
        .eq("article_id", articleId)
        .lte("comment_date", now)
        .eq("published", false);
      if (error) throw error;

      const futureCount = aiComments.filter(c => !c.published && new Date(c.created_at) > new Date()).length;
      toast({
        title: "Comments published",
        description: futureCount > 0 
          ? `Published current comments. ${futureCount} future-dated comment(s) will auto-publish when their date arrives.`
          : "All AI comments are now visible to everyone.",
      });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to publish comments", description: "Please try again later.", variant: "destructive" });
    }
  };

  const handleUnpublishAll = async () => {
    try {
      const { error } = await supabase.from("ai_generated_comments").update({ published: false }).eq("article_id", articleId);
      if (error) throw error;
      toast({ title: "All comments unpublished", description: "All AI comments are now hidden." });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to unpublish comments", description: "Please try again later.", variant: "destructive" });
    }
  };

  const handleDeleteAiComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from("ai_generated_comments").delete().eq("id", commentId);
      if (error) throw error;
      toast({ title: "Comment deleted", description: "The comment has been removed." });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to delete comment", description: "Please try again later.", variant: "destructive" });
    }
  };

  const handleSaveEdit = async (commentId: string, newContent: string) => {
    try {
      const { error } = await supabase.from("ai_generated_comments").update({ content: newContent }).eq("id", commentId);
      if (error) throw error;
      toast({ title: "Comment updated", description: "The comment has been saved." });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to update comment", description: "Please try again later.", variant: "destructive" });
    }
  };

  const handleUpdateCommentDate = async (commentId: string, newDate: string) => {
    try {
      const selectedDate = new Date(newDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const shouldPublish = selectedDate <= today;

      const updateData: { comment_date: string; published?: boolean } = { comment_date: newDate };
      if (shouldPublish) {
        updateData.published = true;
      }

      const { error } = await supabase.from("ai_generated_comments").update(updateData).eq("id", commentId);
      if (error) throw error;
      toast({
        title: shouldPublish ? "Date updated & published" : "Date updated",
        description: shouldPublish
          ? "The comment date is today or earlier, so it has been published."
          : "The comment date has been updated. It will auto-publish when the date arrives.",
      });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to update date", description: "Please try again later.", variant: "destructive" });
    }
  };

  const handleApprove = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").update({ approved: true }).eq("id", commentId);
      if (error) throw error;
      toast({ title: "Comment approved", description: "The comment is now visible to everyone." });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to approve comment", description: "Please try again later.", variant: "destructive" });
    }
  };

  const handleReject = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
      toast({ title: "Comment rejected", description: "The comment has been deleted." });
      fetchComments();
    } catch (error) {
      toast({ title: "Failed to reject comment", description: "Please try again later.", variant: "destructive" });
    }
  };

  const handleSubmitComment = async (authorName: string, authorEmail: string, content: string) => {
    try {
      const { data: newComment, error } = await supabase
        .from("comments")
        .insert([{ article_id: articleId, author_name: authorName, author_email: authorEmail, content, approved: false }])
        .select()
        .single();

      if (error) throw error;

      try {
        await supabase.functions.invoke("notify-new-comment", {
          body: { comment_id: newComment.id, article_id: articleId, author_name: authorName, author_email: authorEmail, content },
        });
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
      }

      toast({ title: "Comment submitted", description: "Your comment is awaiting moderation and will appear shortly." });
      return true;
    } catch (error) {
      toast({ title: "Failed to submit comment", description: "Please try again later.", variant: "destructive" });
      return false;
    }
  };

  const handleReplySubmit = async (parentComment: Comment, replyContent: string) => {
    try {
      if (parentComment.is_ai) {
        const { data: authors } = await supabase.from("ai_comment_authors").select("id").limit(50);
        if (!authors || authors.length === 0) throw new Error("No AI authors available");
        
        const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
        const { error } = await supabase.from("ai_generated_comments").insert({
          article_id: articleId,
          author_id: randomAuthor.id,
          content: replyContent,
          comment_date: new Date().toISOString(),
          published: true,
          parent_id: parentComment.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comments").insert({
          article_id: articleId,
          author_name: "Reply",
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
      fetchComments();
      return true;
    } catch (error) {
      console.error("Error submitting reply:", error);
      toast({ title: "Failed to submit reply", description: "Please try again later.", variant: "destructive" });
      return false;
    }
  };

  return {
    comments,
    aiComments,
    pendingComments,
    loading,
    generating,
    isAdmin,
    isAdminLoading,
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
  };
};

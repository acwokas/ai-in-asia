import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const REACTIONS = [
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "important", emoji: "🔥", label: "Important" },
  { type: "surprising", emoji: "😮", label: "Surprising" },
  { type: "outdated", emoji: "🤔", label: "Needs Update" },
] as const;

function getSessionId(): string {
  let id = localStorage.getItem("reaction_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("reaction_session_id", id);
  }
  return id;
}

interface ArticleReactionsProps {
  articleId: string;
}

export default function ArticleReactions({ articleId }: ArticleReactionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sessionId = getSessionId();
  const [animating, setAnimating] = useState<string | null>(null);

  // Fetch counts per reaction type
  const { data: counts = {} } = useQuery({
    queryKey: ["article-reactions-counts", articleId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("article_reactions")
        .select("reaction_type")
        .eq("article_id", articleId);

      const map: Record<string, number> = {};
      for (const r of data || []) {
        map[r.reaction_type] = (map[r.reaction_type] || 0) + 1;
      }
      return map;
    },
  });

  // Fetch the current user's/session's reaction
  const { data: userReaction } = useQuery({
    queryKey: ["article-reactions-user", articleId, user?.id, sessionId],
    staleTime: 30_000,
    queryFn: async () => {
      if (user) {
        const { data } = await supabase
          .from("article_reactions")
          .select("reaction_type")
          .eq("article_id", articleId)
          .eq("user_id", user.id)
          .maybeSingle();
        return data?.reaction_type || null;
      }
      // Anonymous: could have one reaction per type, just get the first
      const { data } = await supabase
        .from("article_reactions")
        .select("reaction_type")
        .eq("article_id", articleId)
        .eq("session_id", sessionId)
        .limit(1)
        .maybeSingle();
      return data?.reaction_type || null;
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["article-reactions-counts", articleId] });
    queryClient.invalidateQueries({ queryKey: ["article-reactions-user", articleId] });
  }, [queryClient, articleId]);

  const mutation = useMutation({
    mutationFn: async (reactionType: string) => {
      const isSame = userReaction === reactionType;

      if (isSame) {
        // Remove reaction
        if (user) {
          await supabase
            .from("article_reactions")
            .delete()
            .eq("article_id", articleId)
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("article_reactions")
            .delete()
            .eq("article_id", articleId)
            .eq("session_id", sessionId)
            .eq("reaction_type", reactionType);
        }
        return;
      }

      // Remove existing reaction first (for logged-in users switching)
      if (user && userReaction) {
        await supabase
          .from("article_reactions")
          .delete()
          .eq("article_id", articleId)
          .eq("user_id", user.id);
      } else if (!user && userReaction) {
        await supabase
          .from("article_reactions")
          .delete()
          .eq("article_id", articleId)
          .eq("session_id", sessionId);
      }

      // Insert new reaction
      await supabase.from("article_reactions").insert({
        article_id: articleId,
        user_id: user?.id || null,
        session_id: user ? null : sessionId,
        reaction_type: reactionType,
      });

      // Award points for logged-in users
      if (user && !userReaction) {
        try {
          await supabase.rpc("award_points", {
            _user_id: user.id,
            _points: 2,
          });
        } catch {
          // Points are optional, don't fail
        }
      }
    },
    onMutate: (reactionType) => {
      setAnimating(reactionType);
      setTimeout(() => setAnimating(null), 400);
    },
    onSettled: invalidate,
  });

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      {REACTIONS.map(({ type, emoji, label }) => {
        const count = counts[type] || 0;
        const isActive = userReaction === type;
        return (
          <button
            key={type}
            onClick={() => mutation.mutate(type)}
            disabled={mutation.isPending}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all duration-200 cursor-pointer",
              "hover:border-primary/50 hover:bg-primary/5",
              isActive
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground"
            )}
          >
            <span className={cn(
              "text-base transition-transform duration-300",
              animating === type && "scale-125"
            )}>
              {emoji}
            </span>
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && (
              <span className={cn(
                "text-xs font-medium transition-all duration-300",
                animating === type && "scale-110 text-primary"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Bookmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "unread_bookmarks_nudge_dismissed";

const UnreadBookmarksNudge = memo(() => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  const { data: unreadCount } = useQuery({
    queryKey: ["unread-bookmarks-count", user?.id],
    enabled: !!user?.id && !dismissed,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("article_id")
        .eq("user_id", user!.id);

      if (!bookmarks?.length) return 0;

      const articleIds = bookmarks.map((b) => b.article_id);

      const { data: readArticles } = await supabase
        .from("reading_history")
        .select("article_id")
        .eq("user_id", user!.id)
        .in("article_id", articleIds);

      const readSet = new Set((readArticles || []).map((r) => r.article_id));
      return articleIds.filter((id) => !readSet.has(id)).length;
    },
  });

  if (!user || dismissed || !unreadCount) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="container mx-auto px-4 pt-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-accent/30 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Bookmark className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground truncate">
            You have{" "}
            <span className="font-medium text-foreground">{unreadCount}</span>{" "}
            saved article{unreadCount !== 1 ? "s" : ""} waiting
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to="/saved">Read Now</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

UnreadBookmarksNudge.displayName = "UnreadBookmarksNudge";

export default UnreadBookmarksNudge;

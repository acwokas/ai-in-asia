import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Bookmark, Clock, Flame, Zap, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ReadingQueue = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: queue } = useQuery({
    queryKey: ["saved-articles-sheet", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select(`
          *,
          articles:article_id (
            id,
            title,
            slug,
            excerpt,
            featured_image_url,
            reading_time_minutes,
            categories:primary_category_id (name, slug)
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const completeArticle = useMutation({
    mutationFn: async (bookmarkId: string) => {
      const { error } = await supabase
        .from("bookmarks")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", bookmarkId);
      if (error) throw error;
      return bookmarkId;
    },
    onMutate: async (bookmarkId) => {
      await queryClient.cancelQueries({ queryKey: ["saved-articles-sheet", user?.id] });
      const prev = queryClient.getQueryData(["saved-articles-sheet", user?.id]);
      queryClient.setQueryData(["saved-articles-sheet", user?.id], (old: any) => {
        if (!old) return old;
        return old.map((item: any) =>
          item.id === bookmarkId ? { ...item, completed_at: new Date().toISOString() } : item
        );
      });
      return { prev };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["saved-articles-sheet", user?.id], context?.prev);
    },
    onSuccess: () => toast("Marked as read!"),
  });

  const removeFromQueue = useMutation({
    mutationFn: async (bookmarkId: string) => {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", bookmarkId);
      if (error) throw error;
      return bookmarkId;
    },
    onMutate: async (bookmarkId) => {
      await queryClient.cancelQueries({ queryKey: ["saved-articles-sheet", user?.id] });
      const prev = queryClient.getQueryData(["saved-articles-sheet", user?.id]);
      queryClient.setQueryData(["saved-articles-sheet", user?.id], (old: any) => {
        if (!old) return old;
        return old.filter((item: any) => item.id !== bookmarkId);
      });
      return { prev };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["saved-articles-sheet", user?.id], context?.prev);
    },
    onSuccess: () => toast("Removed from saved"),
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <Flame className="h-3 w-3 text-red-500" />;
      case "medium": return <Clock className="h-3 w-3 text-yellow-500" />;
      case "low": return <Zap className="h-3 w-3 text-blue-500" />;
      default: return null;
    }
  };

  if (!user) return null;

  const allItems = queue || [];
  const activeItems = allItems.filter((i: any) => !i.completed_at);
  const completedItems = allItems.filter((i: any) => !!i.completed_at);
  const totalCount = allItems.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10" aria-label="Saved Articles">
              <Bookmark className="h-5 w-5" />
              {totalCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {totalCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Saved Articles</TooltipContent>
      </Tooltip>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Saved Articles
            <Badge variant="secondary">{totalCount}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {allItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No saved articles yet</p>
              <p className="text-sm">Bookmark articles to add them here</p>
            </div>
          ) : (
            <>
              {activeItems.map((item: any) => {
                const article = item.articles;
                if (!article) return null;
                return (
                  <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex gap-3">
                      {article.featured_image_url && (
                        <img src={article.featured_image_url} alt={article.title} className="w-20 h-20 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          {getPriorityIcon(item.reading_priority)}
                          <Link
                            to={`/${article.categories?.slug}/${article.slug}`}
                            className="font-medium text-sm line-clamp-2 hover:text-primary"
                            onClick={() => setOpen(false)}
                          >
                            {article.title}
                          </Link>
                        </div>
                        {article.reading_time_minutes && (
                          <p className="text-xs text-muted-foreground mb-2">{article.reading_time_minutes} min read</p>
                        )}
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => completeArticle.mutate(item.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Done
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => removeFromQueue.mutate(item.id)}>
                            <X className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {completedItems.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider pt-2">Completed</p>
                  {completedItems.map((item: any) => {
                    const article = item.articles;
                    if (!article) return null;
                    return (
                      <Card key={item.id} className="p-3 opacity-60">
                        <div className="flex gap-3">
                          {article.featured_image_url && (
                            <img src={article.featured_image_url} alt={article.title} className="w-16 h-16 object-cover rounded grayscale" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1">
                              <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                              <Link
                                to={`/${article.categories?.slug}/${article.slug}`}
                                className="font-medium text-sm line-clamp-2 hover:text-primary"
                                onClick={() => setOpen(false)}
                              >
                                {article.title}
                              </Link>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => removeFromQueue.mutate(item.id)}>
                              <X className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </>
              )}

              <Link
                to="/saved"
                onClick={() => setOpen(false)}
                className="block text-center text-sm text-primary hover:underline pt-2"
              >
                View all →
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReadingQueue;

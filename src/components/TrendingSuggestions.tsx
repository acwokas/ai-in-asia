import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Loader2, RefreshCw, Check, Eye, MessageSquare, ThumbsUp, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

interface ArticleSuggestion {
  id: string;
  title: string;
  slug: string;
  featured_image_url: string;
  view_count: number;
  comment_count: number;
  like_count: number;
  published_at: string;
  engagement_score: number;
  homepage_trending: boolean;
  authors: { name: string; slug: string } | null;
  categories: { name: string; slug: string } | null;
}

interface SuggestionsResponse {
  suggestions: ArticleSuggestion[];
  alreadyTrending: ArticleSuggestion[];
  stats: {
    totalArticlesAnalyzed: number;
    timeRange: string;
    cutoffDate: string;
    newSuggestionsCount: number;
    alreadyTrendingCount: number;
  };
}

export function TrendingSuggestions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState("48");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["trending-suggestions", timeRange],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("suggest-trending-articles", {
        body: { hours: parseInt(timeRange) },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      return data as SuggestionsResponse;
    },
  });

  const markTrendingMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase
        .from("articles")
        .update({ homepage_trending: true })
        .eq("id", articleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Article marked as homepage trending",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAllSuggestionsMutation = useMutation({
    mutationFn: async (articleIds: string[]) => {
      const { error } = await supabase
        .from("articles")
        .update({ homepage_trending: true })
        .in("id", articleIds);

      if (error) throw error;
    },
    onSuccess: (_, articleIds) => {
      toast({
        title: "Success",
        description: `Marked ${articleIds.length} articles as homepage trending`,
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Trending Suggestions
            </CardTitle>
            <CardDescription>
              AI-powered suggestions based on engagement metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">Last 24h</SelectItem>
                <SelectItem value="48">Last 48h</SelectItem>
                <SelectItem value="72">Last 72h</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.suggestions || data.suggestions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No trending suggestions found for the selected time range
            </p>
            {data?.stats && (
              <p className="text-sm text-muted-foreground mt-2">
                Analyzed {data.stats.totalArticlesAnalyzed} articles from the last {timeRange} hours
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {data.stats && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">{data.stats.totalArticlesAnalyzed}</span> articles analyzed
                  {" • "}
                  <span className="font-medium">{data.stats.newSuggestionsCount}</span> suggestions
                  {" • "}
                  <span className="font-medium">{data.stats.alreadyTrendingCount}</span> already trending
                </div>
                {data.suggestions.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => markAllSuggestionsMutation.mutate(data.suggestions.map(s => s.id))}
                    disabled={markAllSuggestionsMutation.isPending}
                  >
                    {markAllSuggestionsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Mark All as Trending
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-3">
              {data.suggestions.map((article, index) => (
                <div
                  key={article.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  
                  {article.featured_image_url && (
                    <img
                      src={article.featured_image_url}
                      alt={article.title}
                      className="w-24 h-16 object-cover rounded flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                      {article.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.view_count || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {article.comment_count || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {article.like_count || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {article.categories && (
                        <Badge variant="secondary" className="text-xs">
                          {article.categories.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        Score: {article.engagement_score.toFixed(0)}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => markTrendingMutation.mutate(article.id)}
                    disabled={markTrendingMutation.isPending}
                  >
                    {markTrendingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Mark Trending
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {data.alreadyTrending && data.alreadyTrending.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                  Already Marked as Trending ({data.alreadyTrending.length})
                </h4>
                <div className="space-y-2">
                  {data.alreadyTrending.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg text-sm"
                    >
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="flex-1 line-clamp-1">{article.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {article.engagement_score.toFixed(0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

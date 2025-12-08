import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Search, Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TopListItem } from "@/components/TopListsEditor";
import { StarRating } from "@/components/StarRating";
import { useAuth } from "@/contexts/AuthContext";
import { PromptBookmarkButton } from "@/components/PromptBookmarkButton";
import { PromptVariationDialog } from "@/components/PromptVariationDialog";
import { PromptQuickActions } from "@/components/PromptQuickActions";
import { RelatedPrompts } from "@/components/RelatedPrompts";

interface PromptsGridProps {
  searchQuery?: string;
}

const PromptsGrid = ({ searchQuery: externalSearchQuery = "" }: PromptsGridProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [useCaseFilter, setUseCaseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const searchQuery = externalSearchQuery || internalSearchQuery;

  const { data: articles, isLoading } = useQuery({
    queryKey: ["prompts-grid-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, top_list_items, created_at, categories:primary_category_id(name, slug)")
        .eq("article_type", "top_lists")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: ratingsData } = useQuery({
    queryKey: ["prompt-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_ratings")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  const { data: copyCountsData } = useQuery({
    queryKey: ["prompt-copy-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_copies")
        .select("prompt_item_id");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((copy) => {
        counts[copy.prompt_item_id] = (counts[copy.prompt_item_id] || 0) + 1;
      });
      return counts;
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async ({ promptItemId, articleId, rating }: { promptItemId: string; articleId: string; rating: number }) => {
      if (!user) {
        throw new Error("Must be logged in to rate");
      }

      const { data, error } = await supabase
        .from("prompt_ratings")
        .upsert({
          user_id: user.id,
          prompt_item_id: promptItemId,
          article_id: articleId,
          rating,
        }, {
          onConflict: "user_id,prompt_item_id"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-ratings"] });
      toast({
        title: "Rating submitted!",
        description: "You earned 5 points for rating this prompt.",
      });
    },
    onError: (error: Error) => {
      if (error.message === "Must be logged in to rate") {
        toast({
          title: "Sign in required",
          description: "Please sign in to rate prompts.",
          action: (
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          ),
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit rating",
          variant: "destructive",
        });
      }
    },
  });

  const handleRating = (promptItemId: string, articleId: string, rating: number) => {
    ratingMutation.mutate({ promptItemId, articleId, rating });
  };

  const allPrompts = useMemo(() => {
    if (!articles) return [];

    const prompts: Array<TopListItem & {
      articleTitle: string;
      articleSlug: string;
      categorySlug: string;
      articleId: string;
      articleCreatedAt: string;
      avgRating: number;
      ratingCount: number;
      userRating?: number;
      copyCount: number;
    }> = [];

    articles.forEach((article) => {
      if (Array.isArray(article.top_list_items)) {
        article.top_list_items.forEach((item: any) => {
          const promptRatings = ratingsData?.filter((r) => r.prompt_item_id === item.id) || [];
          const avgRating = promptRatings.length > 0
            ? promptRatings.reduce((sum, r) => sum + r.rating, 0) / promptRatings.length
            : 0;
          const userRating = user ? promptRatings.find((r) => r.user_id === user.id)?.rating : undefined;
          const copyCount = copyCountsData?.[item.id] || 0;

          prompts.push({
            ...item,
            articleTitle: article.title,
            articleSlug: article.slug,
            categorySlug: (article.categories as any)?.slug || "uncategorized",
            articleId: article.id,
            articleCreatedAt: article.created_at,
            avgRating,
            ratingCount: promptRatings.length,
            userRating,
            copyCount,
          });
        });
      }
    });

    return prompts;
  }, [articles, ratingsData, user, copyCountsData]);

  const filteredPrompts = useMemo(() => {
    let filtered = allPrompts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(query) ||
        item.prompt.toLowerCase().includes(query) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
        item.articleTitle.toLowerCase().includes(query)
      );
    }

    if (difficultyFilter !== "all") {
      filtered = filtered.filter((item) => item.difficulty === difficultyFilter);
    }

    if (modelFilter !== "all") {
      filtered = filtered.filter((item) =>
        item.ai_models?.includes(modelFilter) || item.ai_models?.includes("all")
      );
    }

    if (useCaseFilter !== "all") {
      filtered = filtered.filter((item) => item.use_cases?.includes(useCaseFilter));
    }

    if (sortBy === "popular") {
      filtered = [...filtered].sort((a, b) => {
        if (b.avgRating !== a.avgRating) {
          return b.avgRating - a.avgRating;
        }
        return b.ratingCount - a.ratingCount;
      });
    } else if (sortBy === "newest") {
      filtered = [...filtered].sort((a, b) =>
        new Date(b.articleCreatedAt).getTime() - new Date(a.articleCreatedAt).getTime()
      );
    } else if (sortBy === "most-copied") {
      filtered = [...filtered].sort((a, b) => b.copyCount - a.copyCount);
    }

    return filtered;
  }, [allPrompts, searchQuery, difficultyFilter, modelFilter, useCaseFilter, sortBy]);

  const copyPrompt = async (prompt: string, itemId: string, articleId: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(itemId);

      await supabase.from("prompt_copies").insert({
        prompt_item_id: itemId,
        article_id: articleId,
        user_id: user?.id || null,
      });

      queryClient.invalidateQueries({ queryKey: ["prompt-copy-counts"] });

      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy prompt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-xl">
        {!externalSearchQuery && (
          <div>
            <label className="text-sm font-medium mb-2 block text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search prompts..."
                value={internalSearchQuery}
                onChange={(e) => setInternalSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">Sort By</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="most-copied">Most Copied</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">Difficulty</label>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">AI Model</label>
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              <SelectItem value="chatgpt">ChatGPT</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">Use Case</label>
          <Select value={useCaseFilter} onValueChange={setUseCaseFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Use Cases</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="productivity">Productivity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">{filteredPrompts.length}</span>
        {" "}prompt{filteredPrompts.length !== 1 ? "s" : ""}
      </p>

      {/* Prompts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No prompts match your filters. Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {filteredPrompts.map((prompt) => (
              <Card
                key={prompt.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedPrompt(prompt.id)}
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{prompt.title}</h3>
                      {prompt.copyCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Copied {prompt.copyCount} times
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <PromptBookmarkButton
                        promptItemId={prompt.id}
                        articleId={prompt.articleId}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPrompt(prompt.prompt, prompt.id, prompt.articleId);
                        }}
                      >
                        {copiedId === prompt.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {prompt.difficulty && (
                      <Badge variant="outline" className="capitalize">
                        {prompt.difficulty}
                      </Badge>
                    )}
                    {prompt.use_cases?.map((useCase) => (
                      <Badge key={useCase} variant="secondary" className="capitalize">
                        {useCase}
                      </Badge>
                    ))}
                    {prompt.ai_models?.slice(0, 2).map((model) => (
                      <Badge key={model} variant="default" className="capitalize">
                        {model}
                      </Badge>
                    ))}
                    {prompt.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StarRating
                        rating={prompt.avgRating}
                        size={18}
                        interactive={!!user}
                        onRatingChange={(rating) => handleRating(prompt.id, prompt.articleId, rating)}
                        userRating={prompt.userRating}
                      />
                      <span className="text-xs text-muted-foreground">
                        {prompt.avgRating > 0 ? `${prompt.avgRating.toFixed(1)} (${prompt.ratingCount})` : "No ratings yet"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <pre className="whitespace-pre-wrap font-mono text-xs line-clamp-4">
                      {prompt.prompt}
                    </pre>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                    <Link
                      to={`/${prompt.categorySlug}/${prompt.articleSlug}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      From: {prompt.articleTitle}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <PromptVariationDialog
                      promptItemId={prompt.id}
                      articleId={prompt.articleId}
                      originalPrompt={prompt.prompt}
                    />
                    <PromptQuickActions
                      prompt={prompt.prompt}
                      title={prompt.title}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedPrompt && (
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <RelatedPrompts
                  currentPromptId={selectedPrompt}
                  allPrompts={allPrompts}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptsGrid;

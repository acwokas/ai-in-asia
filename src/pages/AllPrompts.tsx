import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import { Search, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { TopListItem } from "@/components/TopListsEditor";
import { PromptAndGoBanner } from "@/components/PromptAndGoBanner";
import promptAndGoLogo from "@/assets/promptandgo-logo.png";
import { StarRating } from "@/components/StarRating";
import { useAuth } from "@/contexts/AuthContext";
import { PromptBookmarkButton } from "@/components/PromptBookmarkButton";
import { PromptVariationDialog } from "@/components/PromptVariationDialog";
import { PromptQuickActions } from "@/components/PromptQuickActions";
import { RelatedPrompts } from "@/components/RelatedPrompts";
import { Slider } from "@/components/ui/slider";

const AllPrompts = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [useCaseFilter, setUseCaseFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [minRating, setMinRating] = useState<number[]>([0]);
  const [minCopies, setMinCopies] = useState<number[]>([0]);
  const [showUnrated, setShowUnrated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const { data: articles, isLoading } = useQuery({
    queryKey: ['all-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, top_list_items, created_at, categories:primary_category_id(name, slug)')
        .eq('article_type', 'top_lists')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch all ratings
  const { data: ratingsData } = useQuery({
    queryKey: ['prompt-ratings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_ratings')
        .select('*');

      if (error) throw error;
      return data;
    },
  });

  // Fetch copy counts
  const { data: copyCountsData } = useQuery({
    queryKey: ['prompt-copy-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_copies')
        .select('prompt_item_id');

      if (error) throw error;

      // Count copies per prompt
      const counts: Record<string, number> = {};
      data.forEach(copy => {
        counts[copy.prompt_item_id] = (counts[copy.prompt_item_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Track prompt view
  useEffect(() => {
    if (selectedPrompt && user) {
      supabase.from('prompt_views').insert({
        user_id: user.id,
        prompt_item_id: selectedPrompt,
        article_id: allPrompts.find(p => p.id === selectedPrompt)?.articleId || '',
      });
    }
  }, [selectedPrompt, user]);
  const ratingMutation = useMutation({
    mutationFn: async ({ promptItemId, articleId, rating }: { promptItemId: string; articleId: string; rating: number }) => {
      if (!user) {
        throw new Error("Must be logged in to rate");
      }

      const { data, error } = await supabase
        .from('prompt_ratings')
        .upsert({
          user_id: user.id,
          prompt_item_id: promptItemId,
          article_id: articleId,
          rating,
        }, {
          onConflict: 'user_id,prompt_item_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Award points for rating (5 points)
      await supabase.rpc('award_points', {
        _user_id: user.id,
        _points: 5
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-ratings'] });
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
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
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

    articles.forEach(article => {
      if (Array.isArray(article.top_list_items)) {
        article.top_list_items.forEach((item: any) => {
          // Calculate ratings for this prompt
          const promptRatings = ratingsData?.filter(r => r.prompt_item_id === item.id) || [];
          const avgRating = promptRatings.length > 0
            ? promptRatings.reduce((sum, r) => sum + r.rating, 0) / promptRatings.length
            : 0;
          const userRating = user ? promptRatings.find(r => r.user_id === user.id)?.rating : undefined;
          const copyCount = copyCountsData?.[item.id] || 0;

          prompts.push({
            ...item,
            articleTitle: article.title,
            articleSlug: article.slug,
            categorySlug: (article.categories as any)?.slug || 'uncategorized',
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

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.prompt.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        item.articleTitle.toLowerCase().includes(query)
      );
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(item => item.difficulty === difficultyFilter);
    }

    // Model filter
    if (modelFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.ai_models?.includes(modelFilter) || item.ai_models?.includes('all')
      );
    }

    // Use case filter
    if (useCaseFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.use_cases?.includes(useCaseFilter)
      );
    }

    // Advanced filters
    if (minRating[0] > 0) {
      filtered = filtered.filter(item => item.avgRating >= minRating[0]);
    }

    if (minCopies[0] > 0) {
      filtered = filtered.filter(item => item.copyCount >= minCopies[0]);
    }

    if (showUnrated && user) {
      filtered = filtered.filter(item => !item.userRating);
    }

    // Sorting
    if (sortBy === 'popular') {
      filtered = [...filtered].sort((a, b) => {
        // Sort by average rating first, then by rating count
        if (b.avgRating !== a.avgRating) {
          return b.avgRating - a.avgRating;
        }
        return b.ratingCount - a.ratingCount;
      });
    } else if (sortBy === 'newest') {
      filtered = [...filtered].sort((a, b) => 
        new Date(b.articleCreatedAt).getTime() - new Date(a.articleCreatedAt).getTime()
      );
    } else if (sortBy === 'most-copied') {
      filtered = [...filtered].sort((a, b) => b.copyCount - a.copyCount);
    }

    return filtered;
  }, [allPrompts, searchQuery, difficultyFilter, modelFilter, useCaseFilter, sortBy, minRating, minCopies, showUnrated, user]);

  const copyPrompt = async (prompt: string, itemId: string, articleId: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(itemId);
      
      // Track copy
      await supabase.from('prompt_copies').insert({
        prompt_item_id: itemId,
        article_id: articleId,
        user_id: user?.id || null,
      });
      
      queryClient.invalidateQueries({ queryKey: ['prompt-copy-counts'] });
      
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

  const copyAllPrompts = async () => {
    const allPromptsText = filteredPrompts.map((item, index) => 
      `${index + 1}. ${item.title}\n${item.prompt}\n\nFrom: ${item.articleTitle}`
    ).join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(allPromptsText);
      toast({
        title: "All prompts copied!",
        description: `${filteredPrompts.length} prompts copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy all prompts",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="All AI Prompts - Complete Collection"
        description="Browse our complete collection of AI prompts for ChatGPT, Gemini, Claude, and more. Filter by difficulty, use case, and AI model."
        canonical="https://aiinasia.com/prompts"
      />

      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">All AI Prompts</h1>
            <p className="text-xl text-muted-foreground mb-2">
              Browse our complete collection of AI prompts
            </p>
            <a
              href="https://www.promptandgo.ai"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <img
                src={promptAndGoLogo}
                alt="Prompt and Go AI"
                className="h-9 object-contain"
              />
              <span className="italic">Your AI prompt companion</span>
            </a>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Search & Filter</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  {showFilters ? (
                    <>
                      Hide <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {showFilters && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Search prompts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
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
                      <label className="text-sm font-medium mb-2 block">Difficulty</label>
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
                      <label className="text-sm font-medium mb-2 block">AI Model</label>
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
                      <label className="text-sm font-medium mb-2 block">Use Case</label>
                      <Select value={useCaseFilter} onValueChange={setUseCaseFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Use Cases</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="creative">Creative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Advanced Filters - Hidden for now */}
                  {/* <div className="mt-6 pt-6 border-t space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">Advanced Filters</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-medium mb-3 block">
                          Minimum Rating: {minRating[0]} stars
                        </label>
                        <Slider
                          value={minRating}
                          onValueChange={setMinRating}
                          max={5}
                          step={0.5}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-3 block">
                          Minimum Copies: {minCopies[0]}
                        </label>
                        <Slider
                          value={minCopies}
                          onValueChange={setMinCopies}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showUnrated}
                            onChange={(e) => setShowUnrated(e.target.checked)}
                            className="rounded"
                          />
                          Show only prompts I haven't rated
                        </label>
                      </div>
                    </div>
                  </div> */}
                </>
              )}
            </CardContent>
          </Card>

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
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No prompts match your filters. Try adjusting your search criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main prompts - 2/3 width */}
              <div className="lg:col-span-2 space-y-6">
                {filteredPrompts.map((prompt) => (
                  <Card 
                    key={prompt.id} 
                    className="hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedPrompt(prompt.id)}
                  >
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{prompt.title}</h3>
                          {prompt.copyCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              📋 Copied {prompt.copyCount} times
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
                        {prompt.use_cases?.map(useCase => (
                          <Badge key={useCase} variant="secondary" className="capitalize">
                            {useCase}
                          </Badge>
                        ))}
                        {prompt.ai_models?.slice(0, 2).map(model => (
                          <Badge key={model} variant="default" className="capitalize">
                            {model}
                          </Badge>
                        ))}
                        {prompt.tags?.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline">
                            #{tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Rating Section */}
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
                            {prompt.avgRating > 0 ? `${prompt.avgRating.toFixed(1)} (${prompt.ratingCount})` : 'No ratings yet'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <pre className="whitespace-pre-wrap font-mono text-xs line-clamp-4">
                          {prompt.prompt}
                        </pre>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                        <Link
                          to={`/${prompt.categorySlug}/${prompt.articleSlug}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          From: {prompt.articleTitle}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>

                      {/* Action Buttons */}
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

              {/* Related Prompts Sidebar - 1/3 width */}
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

          {/* Prompt and Go Banner at Bottom */}
          <div className="mt-12">
            <PromptAndGoBanner />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AllPrompts;

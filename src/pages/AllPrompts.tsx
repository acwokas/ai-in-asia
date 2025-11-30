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
import { useState, useMemo } from "react";
import { Search, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { TopListItem } from "@/components/TopListsEditor";
import { PromptAndGoBanner } from "@/components/PromptAndGoBanner";
import promptAndGoLogo from "@/assets/promptandgo-logo.png";
import { StarRating } from "@/components/StarRating";
import { useAuth } from "@/contexts/AuthContext";

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

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

  // Rating mutation
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
          });
        });
      }
    });

    return prompts;
  }, [articles, ratingsData, user]);

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
    }

    return filtered;
  }, [allPrompts, searchQuery, difficultyFilter, modelFilter, useCaseFilter, sortBy]);

  const copyPrompt = async (prompt: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(itemId);
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
      <Helmet>
        <title>All AI Prompts - Complete Collection | AI in ASIA</title>
        <meta name="description" content="Browse our complete collection of AI prompts for ChatGPT, Gemini, Claude, and more. Filter by difficulty, use case, and AI model." />
      </Helmet>

      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">All AI Prompts</h1>
            <p className="text-xl text-muted-foreground mb-2">
              Browse our complete collection of {allPrompts.length} AI prompts
            </p>
            <a
              href="https://www.promptandgo.ai"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span>In partnership with</span>
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

                  <div className="mt-4 text-sm text-muted-foreground">
                    Showing {filteredPrompts.length} of {allPrompts.length} prompts
                  </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPrompts.map((prompt) => (
                <Card key={prompt.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold flex-1">{prompt.title}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPrompt(prompt.prompt, prompt.id)}
                      >
                        {copiedId === prompt.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
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
                      {!user && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/auth')}
                          className="text-xs"
                        >
                          Sign in to rate
                        </Button>
                      )}
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <pre className="whitespace-pre-wrap font-mono text-xs line-clamp-4">
                        {prompt.prompt}
                      </pre>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <Link
                        to={`/${prompt.categorySlug}/${prompt.articleSlug}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        From: {prompt.articleTitle}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Prompt and Go Banner at Bottom */}
          <div className="mt-12">
            <div className="text-sm text-muted-foreground mb-2 text-center">
              In partnership with
            </div>
            <PromptAndGoBanner />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AllPrompts;

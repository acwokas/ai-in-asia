import { useQuery } from "@tanstack/react-query";
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
import { Search, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { TopListItem } from "@/components/TopListsEditor";
import { PromptAndGoBanner } from "@/components/PromptAndGoBanner";
import { PromptAndGoSponsor } from "@/components/PromptAndGoSponsor";

const AllPrompts = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [useCaseFilter, setUseCaseFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: articles, isLoading } = useQuery({
    queryKey: ['all-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, top_list_items, categories:primary_category_id(name, slug)')
        .eq('article_type', 'top_lists')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const allPrompts = useMemo(() => {
    if (!articles) return [];

    const prompts: Array<TopListItem & { articleTitle: string; articleSlug: string; categorySlug: string }> = [];

    articles.forEach(article => {
      if (Array.isArray(article.top_list_items)) {
        article.top_list_items.forEach((item: any) => {
          prompts.push({
            ...item,
            articleTitle: article.title,
            articleSlug: article.slug,
            categorySlug: (article.categories as any)?.slug || 'uncategorized',
          });
        });
      }
    });

    return prompts;
  }, [articles]);

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
      filtered = filtered.filter(item => item.use_case === useCaseFilter);
    }

    return filtered;
  }, [allPrompts, searchQuery, difficultyFilter, modelFilter, useCaseFilter]);

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
            <p className="text-xl text-muted-foreground">
              Browse our complete collection of {allPrompts.length} AI prompts
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Filters and Prompts */}
            <div className="lg:col-span-8 space-y-8">
              {/* Filters */}
              <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredPrompts.length} of {allPrompts.length} prompts
              </div>
            </CardContent>
          </Card>

              {/* Prompts Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 gap-6">
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
                <div className="grid grid-cols-1 gap-6">
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
                          {prompt.use_case && (
                            <Badge variant="secondary" className="capitalize">
                              {prompt.use_case}
                            </Badge>
                          )}
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

            {/* Right Column: Sponsor */}
            <div className="lg:col-span-4">
              <PromptAndGoSponsor />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AllPrompts;

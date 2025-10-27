import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Sparkles, Building2, ShoppingCart, Zap, Code, Brain, Star, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Tools = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [session, setSession] = useState<any>(null);

  // Get current user session
  useState(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  });

  // Fetch tools from database
  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['ai-tools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_tools')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch user's ratings
  const { data: userRatings = [] } = useQuery({
    queryKey: ['tool-ratings', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from('tool_ratings')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id
  });

  // Rate tool mutation
  const rateMutation = useMutation({
    mutationFn: async ({ toolId, rating }: { toolId: string; rating: number }) => {
      if (!session?.user?.id) {
        throw new Error('Please sign in to rate tools');
      }

      const { error } = await supabase
        .from('tool_ratings')
        .upsert({
          tool_id: toolId,
          user_id: session.user.id,
          rating
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tools'] });
      queryClient.invalidateQueries({ queryKey: ['tool-ratings'] });
      toast({
        title: "Rating submitted",
        description: "Thank you for rating this tool! (+5 points)"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Filter tools
  const filteredTools = tools
    .filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .slice(0, 50);

  const categories = Array.from(new Set(tools.map(t => t.category).filter(Boolean)));

  const getUserRating = (toolId: string) => {
    return userRatings.find(r => r.tool_id === toolId)?.rating || 0;
  };

  const renderStars = (toolId: string, avgRating: number, ratingCount: number) => {
    const userRating = getUserRating(toolId);
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => rateMutation.mutate({ toolId, rating: star })}
              disabled={!session?.user?.id || rateMutation.isPending}
              className="disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 transition-transform"
            >
              <Star
                className={`h-5 w-5 ${
                  star <= (userRating || avgRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {avgRating > 0 ? `${avgRating.toFixed(1)} (${ratingCount})` : 'No ratings yet'}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>AI Tools Directory - AI in ASIA</title>
        <meta name="description" content="Discover the best AI tools and platforms curated by AI in ASIA. From productivity to business automation, explore cutting-edge AI solutions." />
        <link rel="canonical" href="https://aiinasia.com/tools" />
        <meta property="og:title" content="AI Tools Directory - AI in ASIA" />
        <meta property="og:description" content="Discover the best AI tools and platforms curated by AI in ASIA." />
        <meta property="og:url" content="https://aiinasia.com/tools" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 rounded-full text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                Curated AI Tools
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                AI Tools Directory
              </h1>
              <p className="text-lg opacity-90">
                Discover powerful AI tools and platforms that are transforming how we work, create, and innovate across Asia and beyond.
              </p>
            </div>
          </div>
        </section>

        {/* Tools Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3">Top AI Tools in Asia</h2>
            <p className="text-muted-foreground text-lg mb-6">
              Discover and rate the best AI tools across the Asia-Pacific region
            </p>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading tools...</p>
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tools found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => (
                <Card key={tool.id} className="p-6 hover:shadow-lg transition-all duration-300">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-xl mb-2">{tool.name}</h3>
                        {tool.category && (
                          <Badge variant="secondary" className="mb-2">
                            {tool.category}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {tool.description && (
                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {tool.description}
                      </p>
                    )}

                    {/* Star Rating */}
                    <div className="pt-2">
                      {renderStars(tool.id, Number(tool.rating_avg), tool.rating_count)}
                      {!session?.user?.id && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Sign in to rate this tool
                        </p>
                      )}
                    </div>

                    <Button className="w-full gap-2" variant="outline" asChild>
                      <a href={tool.url} target="_blank" rel="noopener noreferrer">
                        Visit Tool
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Coming Soon Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-4">More Tools Coming Soon</h2>
              <p className="text-muted-foreground text-lg mb-8">
                We're constantly discovering and curating the best AI tools from across the Asia-Pacific region and beyond. Stay tuned for more additions to our directory.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Badge variant="outline" className="text-sm px-4 py-2">AI Code Assistants</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">Content Generation</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">Data Analytics</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">Image Generation</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">Voice AI</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">AI Automation</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <Card className="p-8 md:p-12 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">
                Have an AI Tool to Recommend?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Know of an amazing AI tool that should be featured? We'd love to hear about it and potentially add it to our directory.
              </p>
              <Button size="lg" asChild>
                <a href="/contact">
                  Submit a Tool
                </a>
              </Button>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Tools;

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Star, Search, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import PerplexityCometPromo from "@/components/PerplexityCometPromo";
import ElevenLabsPromo from "@/components/ElevenLabsPromo";

interface ToolsGridProps {
  searchQuery?: string;
}

const ToolsGrid = ({ searchQuery: externalSearchQuery = "" }: ToolsGridProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [session, setSession] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const searchQuery = externalSearchQuery || internalSearchQuery;
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['ai-tools'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_tools')
        .select('*')
        .order('rating_avg', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: userRatings = [] } = useQuery({
    queryKey: ['tool-ratings', session?.user?.id],
    staleTime: 2 * 60 * 1000,
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

  const filteredTools = useMemo(() => {
    const filtered = tools.filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                           tool.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [tools, debouncedSearchQuery, categoryFilter, currentPage, itemsPerPage]);

  const totalFilteredTools = useMemo(() => {
    return tools.filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                           tool.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).length;
  }, [tools, debouncedSearchQuery, categoryFilter]);

  const totalPages = Math.ceil(totalFilteredTools / itemsPerPage);

  const categories = useMemo(() => 
    Array.from(new Set(tools.map(t => t.category).filter(Boolean))),
    [tools]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, categoryFilter]);

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
    <div className="space-y-8">
      {/* Filters - only show if no external search */}
      {!externalSearchQuery && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={internalSearchQuery}
              onChange={(e) => setInternalSearchQuery(e.target.value)}
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
      )}

      {/* Results count */}
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">{totalFilteredTools}</span>
        {" "}tool{totalFilteredTools !== 1 ? "s" : ""} available
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                </div>
                <div className="h-10 bg-muted rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="py-24 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
            <Wrench className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mb-3 text-xl font-semibold">No tools found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Try adjusting your search or filters to find what you are looking for.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PerplexityCometPromo variant="tools" />
            <ElevenLabsPromo variant="tools" />
            
            {filteredTools.map((tool) => (
              <Card key={tool.id} className="p-6 hover:shadow-lg transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-xl mb-2">{tool.name}</h3>
                      {tool.category && (
                        <Badge className="mb-2 bg-green-600 text-white hover:bg-green-700">
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
          
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ToolsGrid;

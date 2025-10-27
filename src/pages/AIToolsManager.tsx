import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AddToolDialog } from "@/components/AddToolDialog";

const AIToolsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScrapingDialogOpen, setIsScrapingDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fetch tools
  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['ai-tools-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_tools')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Scrape mutation
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('scrape-ai-tools', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-tools-admin'] });
      setIsScrapingDialogOpen(false);
      toast({
        title: "Scraping completed",
        description: `Inserted: ${data.stats.inserted}, Updated: ${data.stats.updated}, Skipped: ${data.stats.skipped}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scraping failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const { error } = await supabase
        .from('ai_tools')
        .delete()
        .eq('id', toolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tools-admin'] });
      toast({
        title: "Tool deleted",
        description: "The tool has been removed successfully"
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Tools Management</h2>
          <p className="text-muted-foreground">
            Manage AI tools scraped from external sources
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
            Add Tool Manually
          </Button>

          <Button 
            variant="outline"
            onClick={async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Not authenticated');

                const { error } = await supabase.functions.invoke('seed-sample-tools', {
                  headers: {
                    Authorization: `Bearer ${session.access_token}`
                  }
                });

                if (error) throw error;
                
                queryClient.invalidateQueries({ queryKey: ['ai-tools-admin'] });
                toast({
                  title: "Sample tools seeded",
                  description: "Sample AI tools have been added to the database"
                });
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message,
                  variant: "destructive"
                });
              }
            }}
          >
            Seed Sample Tools
          </Button>
          
          <AlertDialog open={isScrapingDialogOpen} onOpenChange={setIsScrapingDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button disabled={scrapeMutation.isPending}>
              {scrapeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Scrape Tools
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Scrape AI Tools</AlertDialogTitle>
              <AlertDialogDescription>
                This will scrape AI tools from Slashdot and SourceForge. The process may take a few minutes. Existing tools will be updated with new information.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => scrapeMutation.mutate()}>
                Start Scraping
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>

      <AddToolDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading tools...</p>
        </div>
      ) : tools.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No tools found</p>
          <Button onClick={() => setIsScrapingDialogOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Scrape Tools Now
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Total tools: {tools.length} (showing up to 50 on public page)
          </div>
          
          {tools.map((tool) => (
            <Card key={tool.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{tool.name}</h3>
                    {tool.category && (
                      <span className="text-xs px-2 py-1 bg-secondary rounded">
                        {tool.category}
                      </span>
                    )}
                  </div>
                  
                  {tool.description && (
                    <p className="text-muted-foreground text-sm mb-3">
                      {tool.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>⭐ {Number(tool.rating_avg).toFixed(1)} ({tool.rating_count} ratings)</span>
                    <a href={tool.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {tool.url}
                    </a>
                  </div>
                  
                  {tool.source_urls && tool.source_urls.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Sources: {tool.source_urls.join(', ')}
                    </div>
                  )}
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Tool</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{tool.name}"? This action cannot be undone and will also delete all ratings for this tool.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(tool.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIToolsManager;
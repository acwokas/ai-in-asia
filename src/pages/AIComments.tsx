import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Trash2, RefreshCw, Users, Edit, Settings, Home, ChevronRight, ListChecks, BarChart3, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import Header from "@/components/Header";
import { BulkOperationQueue } from "@/components/BulkOperationQueue";

const AIComments = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingComment, setEditingComment] = useState<{ id: string; content: string; comment_date: string } | null>(null);
  const [editingAuthor, setEditingAuthor] = useState<any>(null);
  const [isManageAuthorsOpen, setIsManageAuthorsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check admin status
  const { data: isAdmin } = useQuery({
    queryKey: ['admin-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      return data;
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch AI authors stats
  const { data: authorStats } = useQuery({
    queryKey: ['ai-author-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_comment_authors')
        .select('*');
      if (error) throw error;
      
      // Group by region dynamically
      const byRegion: Record<string, number> = {};
      data.forEach(a => {
        byRegion[a.region] = (byRegion[a.region] || 0) + 1;
      });
      
      return {
        total: data.length,
        powerUsers: data.filter(a => a.is_power_user).length,
        byRegion,
      };
    },
    enabled: isAdmin,
  });

  // Fetch all authors for management
  const { data: allAuthors, refetch: refetchAuthors } = useQuery({
    queryKey: ['all-ai-authors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_comment_authors')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && isManageAuthorsOpen,
  });

  // Fetch articles with AI comments
  const { data: articlesWithComments, refetch } = useQuery({
    queryKey: ['articles-with-ai-comments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          ai_generated_comments (
            id,
            content,
            comment_date,
            ai_comment_authors (
              name,
              handle,
              avatar_url,
              region,
              is_power_user
            )
          )
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      
      // Only return articles that have AI comments
      return data.filter(article => article.ai_generated_comments && article.ai_generated_comments.length > 0);
    },
    enabled: isAdmin,
  });

  // Quality analysis
  const { data: qualityData, refetch: refetchQuality } = useQuery({
    queryKey: ['comment-quality-analysis'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-comment-quality');
      if (error) throw error;
      return data;
    },
    enabled: false, // Only run when manually triggered
  });

  // Seed authors mutation
  const seedAuthorsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seed-ai-authors');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Authors Seeded",
        description: `${data.count} authors created (${data.powerUsers} power users)`,
      });
      queryClient.invalidateQueries({ queryKey: ['ai-author-stats'] });
      queryClient.invalidateQueries({ queryKey: ['all-ai-authors'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reseed authors mutation (delete all + seed new)
  const reseedAuthorsMutation = useMutation({
    mutationFn: async () => {
      // First delete all existing authors
      const { error: deleteError } = await supabase
        .from('ai_comment_authors')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;
      
      // Then seed new authors
      const { data, error } = await supabase.functions.invoke('seed-ai-authors');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Authors Reseeded",
        description: `${data.count} authors created (${data.powerUsers} power users)`,
      });
      queryClient.invalidateQueries({ queryKey: ['ai-author-stats'] });
      queryClient.invalidateQueries({ queryKey: ['all-ai-authors'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate comments mutation
  const generateCommentsMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-ai-comments', {
        body: { categoryId },
      });
      if (error) {
        // Extract error message from response body if available
        const errorMessage = (data as any)?.error || error.message || 'Failed to generate comments';
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Comments Generated",
        description: `${data.commentsGenerated} comments for ${data.articlesProcessed} articles`,
      });
      setIsGenerating(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  // Delete ALL AI comments mutation
  const deleteAllCommentsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ai_generated_comments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "All AI Comments Deleted",
        description: "All AI-generated comments have been removed. You can now regenerate them.",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['ai-author-stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('ai_generated_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Comment deleted" });
      refetch();
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, content, comment_date }: { id: string; content: string; comment_date: string }) => {
      const { error } = await supabase
        .from('ai_generated_comments')
        .update({ content, comment_date })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Comment updated" });
      setEditingComment(null);
      refetch();
    },
  });

  // Update author mutation
  const updateAuthorMutation = useMutation({
    mutationFn: async (author: any) => {
      const { error } = await supabase
        .from('ai_comment_authors')
        .update({
          name: author.name,
          handle: author.handle,
          region: author.region,
          is_power_user: author.is_power_user,
        })
        .eq('id', author.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Author updated successfully" });
      setEditingAuthor(null);
      refetchAuthors();
      queryClient.invalidateQueries({ queryKey: ['ai-author-stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating author",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Regenerate comments for article
  const regenerateForArticle = async (articleId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-comments', {
        body: { articleIds: [articleId] },
      });
      if (error) {
        // Extract error message from response body if available
        const errorMessage = (data as any)?.error || error.message || 'Failed to regenerate';
        throw new Error(errorMessage);
      }
      toast({
        title: "Comments Regenerated",
        description: `${data.commentsGenerated} new comments generated`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to regenerate',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate single comment
  const regenerateSingleComment = useMutation({
    mutationFn: async ({ commentId, articleId }: { commentId: string; articleId: string }) => {
      // First delete the existing comment
      const { error: deleteError } = await supabase
        .from('ai_generated_comments')
        .delete()
        .eq('id', commentId);
      
      if (deleteError) throw deleteError;

      // Then generate a new comment for this article
      const { data, error } = await supabase.functions.invoke('generate-ai-comments', {
        body: { 
          articleIds: [articleId],
          count: 1 // Request just one comment
        },
      });
      
      if (error) {
        const errorMessage = (data as any)?.error || error.message || 'Failed to regenerate comment';
        throw new Error(errorMessage);
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Comment Regenerated",
        description: "New comment generated successfully",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete all legacy comments
  const deleteLegacyComments = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Legacy Comments Deleted",
        description: "All legacy comments have been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Queue bulk operation for all articles without comments
  // Handle quality analysis
  const handleAnalyzeQuality = async () => {
    setIsAnalyzing(true);
    try {
      await refetchQuality();
      toast({
        title: "Quality Analysis Complete",
        description: `Analyzed ${qualityData?.totalArticles || 0} articles`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-regenerate low quality comments mutation
  const autoRegenerateMutation = useMutation({
    mutationFn: async (articleIds: string[]) => {
      // Delete existing comments for these articles
      for (const articleId of articleIds) {
        await supabase
          .from('ai_generated_comments')
          .delete()
          .eq('article_id', articleId);
      }

      // Queue the regeneration
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('bulk_operation_queue')
        .insert({
          operation_type: 'generate_ai_comments',
          article_ids: articleIds,
          status: 'queued',
          total_items: articleIds.length,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Auto-Regeneration Queued",
        description: `Regenerating comments for ${data.total_items} low-quality articles`,
      });
      queryClient.invalidateQueries({ queryKey: ['bulk-operation-queue'] });
      setActiveTab('queue');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAutoRegenerate = () => {
    if (!qualityData?.results) return;
    
    const lowQualityArticles = qualityData.results
      .filter((r: any) => r.qualityScore < 60)
      .map((r: any) => r.articleId);

    if (lowQualityArticles.length === 0) {
      toast({
        title: "No Articles Need Regeneration",
        description: "All articles have acceptable quality scores!",
      });
      return;
    }

    if (confirm(`This will delete and regenerate comments for ${lowQualityArticles.length} articles with quality scores below 60. Continue?`)) {
      autoRegenerateMutation.mutate(lowQualityArticles);
    }
  };

  const handleQueueBulkOperation = async (categoryId?: string, regenerateAll: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get published articles, optionally filtered by category
      let articlesQuery = supabase
        .from('articles')
        .select('id')
        .eq('status', 'published');
      
      if (categoryId) {
        articlesQuery = articlesQuery.eq('primary_category_id', categoryId);
      }

      const { data: allArticles, error: articlesError } = await articlesQuery;

      if (articlesError) throw articlesError;
      if (!allArticles || allArticles.length === 0) {
        toast({
          title: "No Articles",
          description: "No published articles found to process",
          variant: "destructive",
        });
        return;
      }

      let articleIdsToProcess: string[];
      
      if (regenerateAll) {
        // Delete existing comments for these articles first
        const articleIds = allArticles.map(a => a.id);
        await supabase
          .from('ai_generated_comments')
          .delete()
          .in('article_id', articleIds);
        
        articleIdsToProcess = articleIds;
      } else {
        // Get articles that already have AI comments
        const { data: articlesWithComments, error: commentsError } = await supabase
          .from('ai_generated_comments')
          .select('article_id');

        if (commentsError) throw commentsError;

        const articlesWithCommentsIds = new Set(
          articlesWithComments?.map(c => c.article_id) || []
        );

        // Filter to only articles without comments
        articleIdsToProcess = allArticles
          .filter(a => !articlesWithCommentsIds.has(a.id))
          .map(a => a.id);
      }

      if (articleIdsToProcess.length === 0) {
        toast({
          title: "All Set",
          description: regenerateAll 
            ? "No articles to process" 
            : "All published articles already have AI comments",
        });
        return;
      }

      // Create queue job
      const { error: queueError } = await supabase
        .from('bulk_operation_queue')
        .insert({
          operation_type: 'generate_ai_comments',
          article_ids: articleIdsToProcess,
          total_items: articleIdsToProcess.length,
          created_by: user.id,
          status: 'queued',
          options: categoryId ? { categoryId } : {}
        });

      if (queueError) throw queueError;

      toast({
        title: "Operation Queued",
        description: `${articleIdsToProcess.length} articles queued for AI comment generation. Processing will start automatically.`,
      });

      queryClient.invalidateQueries({ queryKey: ['bulk-operation-queue'] });
      setActiveTab("queue");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin">Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>AI Comments</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Comment Generator</h1>
          <p className="text-muted-foreground">
            Generate natural, authentic-looking comments for published articles
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">
              <MessageSquare className="mr-2 h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="queue">
              <ListChecks className="mr-2 h-4 w-4" />
              Queue & History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">

      {/* Quality Analysis */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comment Quality Analysis
          </CardTitle>
          <CardDescription>
            Detect repetitive patterns and similarity issues in AI comments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              onClick={handleAnalyzeQuality}
              disabled={isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              Analyze Comment Quality
            </Button>
            {qualityData && qualityData.flaggedArticles > 0 && (
              <Button
                onClick={handleAutoRegenerate}
                disabled={autoRegenerateMutation.isPending}
                variant="destructive"
              >
                {autoRegenerateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Auto-Regenerate ({qualityData.flaggedArticles})
              </Button>
            )}
          </div>

          {qualityData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{qualityData.summary.excellent}</div>
                  <div className="text-sm text-muted-foreground">Excellent (80+)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{qualityData.summary.good}</div>
                  <div className="text-sm text-muted-foreground">Good (60-79)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{qualityData.summary.needsImprovement}</div>
                  <div className="text-sm text-muted-foreground">Needs Work (&lt;60)</div>
                </div>
              </div>

              {qualityData.flaggedArticles > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {qualityData.flaggedArticles} article{qualityData.flaggedArticles > 1 ? 's' : ''} flagged for quality issues. 
                    Consider regenerating comments for these articles.
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-4 space-y-3">
                  {qualityData.results.map((result: any) => (
                    <div key={result.articleId} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{result.articleTitle}</h4>
                          <p className="text-xs text-muted-foreground">{result.commentCount} comments</p>
                        </div>
                        <Badge 
                          variant={result.qualityScore >= 80 ? "default" : result.qualityScore >= 60 ? "secondary" : "destructive"}
                        >
                          Score: {result.qualityScore}
                        </Badge>
                      </div>
                      {result.issues.length > 0 && (
                        <div className="space-y-1">
                          {result.issues.map((issue: string, idx: number) => (
                            <div key={idx} className="text-xs text-red-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {issue}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Ending Similarity: {result.endingSimilarity}%</div>
                        <div>Phrase Repetition: {result.phraseRepetition}%</div>
                        <div>Structure Similarity: {result.structureSimilarity}%</div>
                        <div>Length Variation: {result.lengthVariation}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Author Pool Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Author Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authorStats && authorStats.total > 0 ? (
            <>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <div className="text-2xl font-bold">{authorStats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Authors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{authorStats.powerUsers}</div>
                  <div className="text-sm text-muted-foreground">Power Users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{authorStats.byRegion.china || 0}</div>
                  <div className="text-sm text-muted-foreground">China</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{authorStats.byRegion.usa || 0}</div>
                  <div className="text-sm text-muted-foreground">USA</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{authorStats.byRegion.france || 0}</div>
                  <div className="text-sm text-muted-foreground">France</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {(authorStats.byRegion.singapore || 0) + 
                     (authorStats.byRegion.india || 0) + 
                     (authorStats.byRegion.hong_kong || 0) +
                     (authorStats.byRegion.uk || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Other</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsManageAuthorsOpen(true)}
                    className="flex-1"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Author Pool
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (confirm('This will delete all existing authors and create the new expanded pool (~300 authors). Continue?')) {
                        reseedAuthorsMutation.mutate();
                      }
                    }}
                    disabled={reseedAuthorsMutation.isPending}
                    className="flex-1"
                  >
                    {reseedAuthorsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Reseed Authors
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete ALL AI comments? This cannot be undone.')) {
                        deleteAllCommentsMutation.mutate();
                      }
                    }}
                    disabled={deleteAllCommentsMutation.isPending}
                    className="flex-1"
                    size="sm"
                  >
                    {deleteAllCommentsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete All AI Comments
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete ALL legacy comments? This cannot be undone.')) {
                        deleteLegacyComments.mutate();
                      }
                    }}
                    disabled={deleteLegacyComments.isPending}
                    size="sm"
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Legacy Comments
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                {seedAuthorsMutation.isPending 
                  ? "Creating author pool... This may take a few moments." 
                  : "No author pool exists yet"}
              </p>
              <Button 
                onClick={() => seedAuthorsMutation.mutate()}
                disabled={seedAuthorsMutation.isPending}
              >
                {seedAuthorsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Seed Author Pool
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Queue Operation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bulk Generate Comments</CardTitle>
          <CardDescription>
            Queue AI comment generation. Jobs process automatically in batches of 5 articles at a time with real-time progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={() => handleQueueBulkOperation()}
              disabled={!authorStats}
              variant="default"
            >
              <ListChecks className="mr-2 h-4 w-4" />
              Queue Articles Without Comments
            </Button>
            <Button
              onClick={() => {
                if (confirm('This will DELETE all existing AI comments and regenerate for ALL articles. This will take a long time. Continue?')) {
                  handleQueueBulkOperation(undefined, true);
                }
              }}
              disabled={!authorStats}
              variant="destructive"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate All Comments
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Or queue by category:</p>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleQueueBulkOperation(selectedCategory)}
                disabled={!selectedCategory || !authorStats}
                variant="secondary"
              >
                <ListChecks className="mr-2 h-4 w-4" />
                Queue Category
              </Button>
              <Button
                onClick={() => {
                  if (confirm(`This will DELETE and regenerate all comments for articles in this category. Continue?`)) {
                    handleQueueBulkOperation(selectedCategory, true);
                  }
                }}
                disabled={!selectedCategory || !authorStats}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regen Category
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles with AI Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Articles with AI Comments</CardTitle>
          <CardDescription>
            {articlesWithComments?.length || 0} articles have AI-generated comments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {articlesWithComments?.map((article) => (
              <div key={article.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{article.title}</h3>
                    <p className="text-sm text-muted-foreground">/{article.slug}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateForArticle(article.id)}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>

                <div className="space-y-3">
                  {article.ai_generated_comments?.map((comment: any) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {comment.ai_comment_authors.avatar_url && (
                            <img
                              src={comment.ai_comment_authors.avatar_url}
                              alt={comment.ai_comment_authors.name}
                              className="h-8 w-8 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              {comment.ai_comment_authors.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @{comment.ai_comment_authors.handle}
                              {comment.ai_comment_authors.is_power_user && (
                                <Badge variant="secondary" className="ml-2">Power User</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.comment_date).toLocaleDateString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => regenerateSingleComment.mutate({ 
                              commentId: comment.id, 
                              articleId: article.id 
                            })}
                            disabled={regenerateSingleComment.isPending}
                            title="Regenerate this comment"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingComment({ 
                                  id: comment.id, 
                                  content: comment.content,
                                  comment_date: comment.comment_date 
                                })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Comment</DialogTitle>
                                <DialogDescription>
                                  Update the comment content and publish date
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Publish Date</Label>
                                  <Input
                                    type="datetime-local"
                                    value={editingComment?.id === comment.id 
                                      ? new Date(editingComment.comment_date).toISOString().slice(0, 16) 
                                      : new Date(comment.comment_date).toISOString().slice(0, 16)}
                                    onChange={(e) => setEditingComment(prev => prev ? { 
                                      ...prev, 
                                      comment_date: new Date(e.target.value).toISOString() 
                                    } : null)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Comment Content</Label>
                                  <Textarea
                                    value={editingComment?.id === comment.id ? editingComment.content : comment.content}
                                    onChange={(e) => setEditingComment(prev => prev ? { 
                                      ...prev, 
                                      content: e.target.value 
                                    } : null)}
                                    rows={5}
                                  />
                                </div>
                              </div>
                              <Button
                                onClick={() => editingComment && updateCommentMutation.mutate(editingComment)}
                                disabled={updateCommentMutation.isPending}
                              >
                                Save Changes
                              </Button>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            title="Delete this comment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manage Authors Dialog */}
      <Dialog open={isManageAuthorsOpen} onOpenChange={setIsManageAuthorsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage Author Pool</DialogTitle>
            <DialogDescription>
              Edit author details, regions, and power user status
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Power User</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allAuthors?.map((author) => (
                  <TableRow key={author.id}>
                    <TableCell className="font-medium">{author.name}</TableCell>
                    <TableCell>@{author.handle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {author.region.replace('_', '/')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {author.is_power_user && (
                        <Badge variant="secondary">Power User</Badge>
                      )}
                    </TableCell>
                    <TableCell>{author.comment_count || 0}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingAuthor(author)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Author</DialogTitle>
                            <DialogDescription>
                              Update author information
                            </DialogDescription>
                          </DialogHeader>
                          {editingAuthor?.id === author.id && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="name">Name</Label>
                                <Input
                                  id="name"
                                  value={editingAuthor.name}
                                  onChange={(e) => setEditingAuthor({ ...editingAuthor, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="handle">Handle</Label>
                                <Input
                                  id="handle"
                                  value={editingAuthor.handle}
                                  onChange={(e) => setEditingAuthor({ ...editingAuthor, handle: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="region">Region</Label>
                                <Select
                                  value={editingAuthor.region}
                                  onValueChange={(value) => setEditingAuthor({ ...editingAuthor, region: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="singapore">Singapore</SelectItem>
                                    <SelectItem value="india">India</SelectItem>
                                    <SelectItem value="philippines">Philippines</SelectItem>
                                    <SelectItem value="china_hk">China/HK</SelectItem>
                                    <SelectItem value="west">West</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="power-user"
                                  checked={editingAuthor.is_power_user}
                                  onCheckedChange={(checked) => 
                                    setEditingAuthor({ ...editingAuthor, is_power_user: checked })
                                  }
                                />
                                <Label htmlFor="power-user">Power User</Label>
                              </div>
                              <Button
                                onClick={() => updateAuthorMutation.mutate(editingAuthor)}
                                disabled={updateAuthorMutation.isPending}
                                className="w-full"
                              >
                                {updateAuthorMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Save Changes
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="queue">
        <BulkOperationQueue operationType="generate_ai_comments" />
      </TabsContent>
      
      </Tabs>
      </div>
    </div>
  );
};

export default AIComments;

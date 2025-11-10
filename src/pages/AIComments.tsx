import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Trash2, RefreshCw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const AIComments = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
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
      return {
        total: data.length,
        powerUsers: data.filter(a => a.is_power_user).length,
        byRegion: {
          singapore: data.filter(a => a.region === 'singapore').length,
          india: data.filter(a => a.region === 'india').length,
          philippines: data.filter(a => a.region === 'philippines').length,
          china_hk: data.filter(a => a.region === 'china_hk').length,
          west: data.filter(a => a.region === 'west').length,
        }
      };
    },
    enabled: isAdmin,
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
      if (error) throw error;
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
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('ai_generated_comments')
        .update({ content })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Comment updated" });
      setEditingComment(null);
      refetch();
    },
  });

  // Regenerate comments for article
  const regenerateForArticle = async (articleId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-comments', {
        body: { articleIds: [articleId] },
      });
      if (error) throw error;
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Comment Generator</h1>
        <p className="text-muted-foreground">
          Generate natural, authentic-looking comments for published articles
        </p>
      </div>

      {/* Author Pool Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Author Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authorStats ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <div className="text-2xl font-bold">{authorStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Authors</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{authorStats.powerUsers}</div>
                <div className="text-sm text-muted-foreground">Power Users</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{authorStats.byRegion.singapore}</div>
                <div className="text-sm text-muted-foreground">Singapore</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{authorStats.byRegion.india}</div>
                <div className="text-sm text-muted-foreground">India</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{authorStats.byRegion.philippines}</div>
                <div className="text-sm text-muted-foreground">Philippines</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{authorStats.byRegion.china_hk + authorStats.byRegion.west}</div>
                <div className="text-sm text-muted-foreground">CN/HK/West</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">No author pool exists yet</p>
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

      {/* Generate Comments */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Comments by Category</CardTitle>
          <CardDescription>
            Select a category to generate AI comments for all published articles in that category
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
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
            onClick={() => generateCommentsMutation.mutate(selectedCategory)}
            disabled={!selectedCategory || isGenerating || !authorStats}
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <MessageSquare className="mr-2 h-4 w-4" />
            Generate Comments
          </Button>
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingComment({ id: comment.id, content: comment.content })}
                              >
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Comment</DialogTitle>
                                <DialogDescription>
                                  Update the comment content below
                                </DialogDescription>
                              </DialogHeader>
                              <Textarea
                                value={editingComment?.id === comment.id ? editingComment.content : comment.content}
                                onChange={(e) => setEditingComment({ id: comment.id, content: e.target.value })}
                                rows={5}
                              />
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
    </div>
  );
};

export default AIComments;

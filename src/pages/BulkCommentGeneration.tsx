import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home, MessageSquare, CheckCircle, RotateCcw, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BulkCommentGeneration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check admin access
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["admin-check"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      return !!data;
    },
  });

  // Get all published articles without comments
  const { data: eligibleArticles, isLoading: loadingArticles } = useQuery({
    queryKey: ["eligible-articles"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data: articles, error } = await supabase
        .from("articles")
        .select("id, title, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;

      // Filter out articles that already have comments
      const articlesWithCommentCounts = await Promise.all(
        articles.map(async (article) => {
          const { count } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("article_id", article.id);

          return { ...article, commentCount: count || 0 };
        })
      );

      return articlesWithCommentCounts.filter(a => a.commentCount === 0);
    },
  });

  const generateComments = async () => {
    if (!eligibleArticles || eligibleArticles.length === 0) {
      toast({
        title: "No articles to process",
        description: "All articles already have comments",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setProcessedCount(0);
    setTotalCount(eligibleArticles.length);
    setResults([]);

    const newResults = [];

    for (let i = 0; i < eligibleArticles.length; i++) {
      const article = eligibleArticles[i];
      
      try {
        const { data, error } = await supabase.functions.invoke("generate-article-comments", {
          body: { articleId: article.id, batchMode: true },
        });

        if (error) throw error;

        newResults.push({
          articleId: article.id,
          title: article.title,
          success: true,
          commentsAdded: data.pendingComments,
        });

        toast({
          title: `Comments scheduled for: ${article.title}`,
          description: `${data.pendingComments} comments scheduled for generation`,
        });

      } catch (error) {
        console.error("Error generating comments:", error);
        newResults.push({
          articleId: article.id,
          title: article.title,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      setProcessedCount(i + 1);
      setProgress(((i + 1) / eligibleArticles.length) * 100);
      setResults(newResults);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsGenerating(false);
    toast({
      title: "Bulk generation complete",
      description: `Processed ${eligibleArticles.length} articles`,
    });
  };

  const deleteAllComments = async () => {
    setShowDeleteAllDialog(false);
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

      if (error) throw error;

      // Also delete all pending comments
      await supabase
        .from("pending_comments")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      toast({
        title: "All comments deleted",
        description: "Successfully deleted all comments from the site",
      });
    } catch (error) {
      console.error("Error deleting comments:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete comments",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const regenerateAllComments = async () => {
    setShowRegenerateDialog(false);

    // Get all published articles
    const { data: allArticles, error } = await supabase
      .from("articles")
      .select("id, title")
      .eq("status", "published");

    if (error || !allArticles || allArticles.length === 0) {
      toast({
        title: "Error",
        description: "Could not fetch articles",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setProcessedCount(0);
    setTotalCount(allArticles.length);
    setResults([]);

    const newResults = [];

    for (let i = 0; i < allArticles.length; i++) {
      const article = allArticles[i];
      
      try {
        // Delete existing comments for this article
        await supabase
          .from("comments")
          .delete()
          .eq("article_id", article.id);

        // Generate new comments
        const { data, error } = await supabase.functions.invoke("generate-article-comments", {
          body: { articleId: article.id, batchMode: true },
        });

        if (error) throw error;

        newResults.push({
          articleId: article.id,
          title: article.title,
          success: true,
          commentsAdded: data.pendingComments,
        });

        toast({
          title: `Comments scheduled for: ${article.title}`,
          description: `${data.pendingComments} comments scheduled for generation`,
        });

      } catch (error) {
        console.error("Error regenerating comments:", error);
        newResults.push({
          articleId: article.id,
          title: article.title,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      setProcessedCount(i + 1);
      setProgress(((i + 1) / allArticles.length) * 100);
      setResults(newResults);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsGenerating(false);
    toast({
      title: "Regeneration complete",
      description: `Processed ${allArticles.length} articles`,
    });
  };

  if (checkingAdmin || loadingArticles) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary inline-flex items-center gap-1">
            <Home className="h-3 w-3" />
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link to="/admin" className="hover:text-primary">Admin</Link>
          <span className="mx-2">›</span>
          <span>Bulk Comment Generation</span>
        </nav>

        <div className="mb-8">
          <h1 className="headline text-4xl mb-2">Bulk Comment Generation</h1>
          <p className="text-muted-foreground">
            Generate AI-powered comments for all published articles
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Articles Without Comments
            </CardTitle>
            <CardDescription>
              Found {eligibleArticles?.length || 0} published articles that need comments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{processedCount} / {totalCount}</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={generateComments}
                  disabled={isGenerating || isDeleting || !eligibleArticles || eligibleArticles.length === 0}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Comments...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Generate Comments for All Articles
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => setShowRegenerateDialog(true)}
                  disabled={isGenerating || isDeleting}
                  size="lg"
                  variant="destructive"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate ALL Comments
                </Button>

                <Button 
                  onClick={() => setShowDeleteAllDialog(true)}
                  disabled={isGenerating || isDeleting}
                  size="lg"
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ALL Comments
                    </>
                  )}
                </Button>
              </div>

              {results.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h3 className="font-semibold">Results:</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {results.map((result, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border ${
                          result.success 
                            ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                            : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <span className="text-red-600 mt-0.5">✗</span>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{result.title}</p>
                            {result.success ? (
                              <p className="text-xs text-muted-foreground">
                                {result.commentsAdded} comments scheduled
                              </p>
                            ) : (
                              <p className="text-xs text-red-600">{result.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate ALL Comments?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete ALL existing comments on ALL published articles and generate new ones. 
              This action cannot be undone. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={regenerateAllComments} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Regenerate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ALL Comments from Site?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL comments from the entire site, including both approved and pending comments. 
              This action cannot be undone. Are you absolutely sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAllComments} className="bg-red-600 text-white hover:bg-red-700">
              Yes, Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BulkCommentGeneration;

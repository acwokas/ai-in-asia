import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Home, FolderTree } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ProcessingResult {
  articleId: string;
  title: string;
  status: 'success' | 'error';
  categoryName?: string;
  error?: string;
}

export default function AssignCategories() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);

  useEffect(() => {
    checkAdminAndLoadCount();
  }, []);

  const checkAdminAndLoadCount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Count uncategorized articles
    const { count } = await supabase
      .from("articles")
      .select("*", { count: 'exact', head: true })
      .is("primary_category_id", null);

    setUncategorizedCount(count || 0);
    setLoading(false);
  };

  const processArticles = async () => {
    setProcessing(true);
    setResults([]);
    setProgress(0);

    try {
      // Fetch all uncategorized articles
      const { data: articles, error: fetchError } = await supabase
        .from("articles")
        .select("id, title, excerpt, content")
        .is("primary_category_id", null)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      if (!articles || articles.length === 0) {
        toast({
          title: "No Articles Found",
          description: "All articles already have categories assigned.",
        });
        setProcessing(false);
        return;
      }

      // Fetch all categories
      const { data: categories, error: catError } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .order("name");

      if (catError) throw catError;

      const totalArticles = articles.length;
      const processedResults: ProcessingResult[] = [];

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        
        try {
          // Call edge function to assign category
          const { data: assignmentData, error: assignError } = await supabase.functions.invoke(
            "assign-article-category",
            {
              body: {
                articleId: article.id,
                articleTitle: article.title,
                articleExcerpt: article.excerpt,
                articleContent: article.content,
                categories: categories
              }
            }
          );

          if (assignError) throw assignError;

          // Update article with assigned category
          const { error: updateError } = await supabase
            .from("articles")
            .update({ primary_category_id: assignmentData.categoryId })
            .eq("id", article.id);

          if (updateError) throw updateError;

          processedResults.push({
            articleId: article.id,
            title: article.title,
            status: 'success',
            categoryName: assignmentData.categoryName
          });

          console.log(`✓ Assigned category "${assignmentData.categoryName}" to: ${article.title}`);
        } catch (error) {
          console.error(`✗ Failed to assign category for: ${article.title}`, error);
          processedResults.push({
            articleId: article.id,
            title: article.title,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        setProgress(((i + 1) / totalArticles) * 100);
        setResults([...processedResults]);
      }

      toast({
        title: "Category Assignment Complete",
        description: `Processed ${processedResults.filter(r => r.status === 'success').length} of ${totalArticles} articles successfully.`,
      });

      // Refresh count
      const { count } = await supabase
        .from("articles")
        .select("*", { count: 'exact', head: true })
        .is("primary_category_id", null);

      setUncategorizedCount(count || 0);

    } catch (error) {
      console.error("Error processing articles:", error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "An error occurred during processing",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6 max-w-4xl mx-auto">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="inline-flex items-center gap-1">
                  <Home className="h-3 w-3" />
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
              <BreadcrumbLink asChild>
                <Link to="/admin/migration">Migration</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Assign Categories</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <FolderTree className="h-8 w-8" />
              Auto-Assign Categories
            </h1>
            <p className="text-muted-foreground">
              Automatically assign categories to uncategorized articles using AI analysis
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Uncategorized Articles</CardTitle>
              <CardDescription>
                Found {uncategorizedCount} article{uncategorizedCount !== 1 ? 's' : ''} without categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={processArticles}
                disabled={processing || uncategorizedCount === 0}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FolderTree className="mr-2 h-4 w-4" />
                    Assign Categories to All
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {processing && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Processing Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(progress)}% complete
                </p>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {results.filter(r => r.status === 'success').length} successful, {results.filter(r => r.status === 'error').length} errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 p-3 rounded-lg ${
                        result.status === 'success' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
                      }`}
                    >
                      {result.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{result.title}</p>
                        {result.status === 'success' && result.categoryName && (
                          <p className="text-xs text-muted-foreground">
                            Assigned to: <span className="font-semibold">{result.categoryName}</span>
                          </p>
                        )}
                        {result.status === 'error' && result.error && (
                          <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

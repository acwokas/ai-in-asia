import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, AlertCircle, CheckCircle2, RefreshCw, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface UpdateResult {
  articleId: string;
  articleTitle: string;
  oldUrl: string;
  newUrl: string;
  status: 'success' | 'failed';
  error?: string;
}

export default function UpdateArticleImages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const parseCSV = (csvText: string): Map<string, string> => {
    const lines = csvText.trim().split('\n');
    const mappings = new Map<string, string>();
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Parse CSV line (handle quoted values)
      const match = line.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
      if (match) {
        const [, oldUrl, newUrl, status] = match;
        if (status === 'success' && newUrl) {
          mappings.set(oldUrl, newUrl);
        }
      }
    }
    
    return mappings;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      const urlMappings = parseCSV(csvText);

      if (urlMappings.size === 0) {
        toast({
          title: "No mappings found",
          description: "The CSV file doesn't contain any successful image migrations.",
          variant: "destructive",
        });
        return;
      }

      await processUpdates(urlMappings);
    };
    reader.readAsText(file);
  };

  const processUpdates = async (urlMappings: Map<string, string>) => {
    setProcessing(true);
    setResults([]);
    setProgress(0);
    setTotalUpdates(urlMappings.size);
    setSuccessCount(0);

    const updateResults: UpdateResult[] = [];
    const batchId = crypto.randomUUID();
    let successful = 0;

    // Create initial log entry
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("migration_logs").insert({
      batch_id: batchId,
      operation_type: "article_image_update",
      status: "in_progress",
      total_records: urlMappings.size,
      created_by: user?.id,
    });

    let processed = 0;

    // Process each mapping
    for (const [oldUrl, newUrl] of urlMappings.entries()) {
      try {
        // Find articles with this old URL
        const { data: articles, error: fetchError } = await supabase
          .from("articles")
          .select("id, title, featured_image_url")
          .eq("featured_image_url", oldUrl);

        if (fetchError) throw fetchError;

        if (articles && articles.length > 0) {
          // Update all matching articles
          for (const article of articles) {
            const { error: updateError } = await supabase
              .from("articles")
              .update({ 
                featured_image_url: newUrl,
                updated_at: new Date().toISOString()
              })
              .eq("id", article.id);

            if (updateError) {
              updateResults.push({
                articleId: article.id,
                articleTitle: article.title,
                oldUrl,
                newUrl,
                status: 'failed',
                error: updateError.message,
              });
            } else {
              updateResults.push({
                articleId: article.id,
                articleTitle: article.title,
                oldUrl,
                newUrl,
                status: 'success',
              });
              successful++;
            }
          }
        }
      } catch (error: any) {
        updateResults.push({
          articleId: 'unknown',
          articleTitle: 'Unknown',
          oldUrl,
          newUrl,
          status: 'failed',
          error: error.message,
        });
      }

      processed++;
      setProgress(Math.round((processed / urlMappings.size) * 100));
      setSuccessCount(successful);
      setResults([...updateResults]);
    }

    // Update log entry
    await supabase
      .from("migration_logs")
      .update({
        status: successful === updateResults.length ? "completed" : "completed_with_errors",
        successful_records: successful,
        failed_records: updateResults.length - successful,
        error_details: JSON.parse(JSON.stringify(updateResults.filter(r => r.status === 'failed'))),
      })
      .eq("batch_id", batchId);

    setProcessing(false);

    toast({
      title: "Update Complete",
      description: `Successfully updated ${successful} article images.`,
    });
  };

  const downloadResults = () => {
    const csv = [
      'Article ID,Article Title,Old URL,New URL,Status,Error',
      ...results.map(r => 
        `"${r.articleId}","${r.articleTitle}","${r.oldUrl}","${r.newUrl}","${r.status}","${r.error || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `article-image-updates-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
              <BreadcrumbPage>Update Article Images</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Update Article Images</h1>
            <p className="text-muted-foreground">
              Upload the migration results CSV to automatically update article image URLs
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Migration CSV</CardTitle>
              <CardDescription>
                Upload the CSV file generated by the Image Migration tool to update article images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Before uploading:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>Run the Image Migration tool first (Admin → Image Migration)</li>
                    <li>Download the results CSV after migration completes</li>
                    <li>Upload that CSV here to update all article references</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={processing}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {processing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Updating articles...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">
                    Updated {successCount} articles successfully
                  </p>
                </div>
              )}

              {!processing && results.length > 0 && (
                <>
                  <Alert className="border-green-500">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      Successfully updated {successCount} article images
                    </AlertDescription>
                  </Alert>

                  <Button onClick={downloadResults} variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Download Results CSV
                  </Button>
                </>
              )}

              {results.some(r => r.status === 'failed') && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">
                      {results.filter(r => r.status === 'failed').length} updates failed:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {results
                        .filter(r => r.status === 'failed')
                        .slice(0, 5)
                        .map((result, idx) => (
                          <p key={idx} className="text-xs">
                            {result.articleTitle}: {result.error}
                          </p>
                        ))}
                      {results.filter(r => r.status === 'failed').length > 5 && (
                        <p className="text-xs">
                          ...and {results.filter(r => r.status === 'failed').length - 5} more errors
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/admin/image-migration">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Go to Image Migration Tool
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
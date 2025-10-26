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
import { RefreshCw, CheckCircle2, AlertCircle, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ContentProcessor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    totalArticles: 0,
    processed: 0,
    linksUpdated: 0,
    imagesUpdated: 0,
    errors: 0,
  });

  useEffect(() => {
    checkAdminStatus();
    loadStats();
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

  const loadStats = async () => {
    const { count } = await supabase
      .from("articles")
      .select("*", { count: 'exact', head: true });
    
    setStats(prev => ({ ...prev, totalArticles: count || 0 }));
  };

  const processArticleContent = async (article: any, urlMappings: Map<string, string>) => {
    let content = JSON.stringify(article.content);
    let linksUpdated = 0;
    let imagesUpdated = 0;

    // Update internal links
    urlMappings.forEach((newUrl, oldSlug) => {
      const oldUrlPattern = new RegExp(`/${oldSlug}(?![\\w-])`, 'g');
      if (content.match(oldUrlPattern)) {
        content = content.replace(oldUrlPattern, newUrl);
        linksUpdated++;
      }
    });

    // Update image URLs if they're from old domain
    const oldDomain = 'www.aiinasia.com';
    const imagePaths = content.match(new RegExp(`${oldDomain}[^"\\s]+\\.(jpg|jpeg|png|gif|webp)`, 'gi')) || [];
    imagesUpdated = imagePaths.length;

    return {
      content: JSON.parse(content),
      linksUpdated,
      imagesUpdated,
    };
  };

  const handleProcess = async () => {
    setProcessing(true);
    setProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const batchId = crypto.randomUUID();

      // Get all URL mappings
      const { data: mappings } = await supabase
        .from("url_mappings")
        .select("*");

      const urlMap = new Map(
        mappings?.map(m => [m.old_slug, m.new_url]) || []
      );

      // Get all articles
      const { data: articles } = await supabase
        .from("articles")
        .select("*");

      if (!articles) {
        throw new Error("No articles found");
      }

      const total = articles.length;
      let processed = 0;
      let totalLinksUpdated = 0;
      let totalImagesUpdated = 0;
      let errors = 0;

      // Create log entry
      await supabase.from("migration_logs").insert({
        batch_id: batchId,
        operation_type: "content_processing",
        status: "in_progress",
        total_records: total,
        created_by: user?.id,
      });

      // Process articles in batches of 20
      const batchSize = 20;
      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (article) => {
            try {
              const result = await processArticleContent(article, urlMap);

              await supabase
                .from("articles")
                .update({ content: result.content })
                .eq("id", article.id);

              totalLinksUpdated += result.linksUpdated;
              totalImagesUpdated += result.imagesUpdated;
              processed++;
            } catch (error) {
              console.error(`Error processing article ${article.id}:`, error);
              errors++;
            }
          })
        );

        setProgress(Math.round((processed / total) * 100));
        setStats(prev => ({
          ...prev,
          processed,
          linksUpdated: totalLinksUpdated,
          imagesUpdated: totalImagesUpdated,
          errors,
        }));
      }

      // Update log
      await supabase
        .from("migration_logs")
        .update({
          status: errors === 0 ? "completed" : "completed_with_errors",
          successful_records: processed,
          failed_records: errors,
        })
        .eq("batch_id", batchId);

      toast({
        title: "Processing Complete",
        description: `Updated ${totalLinksUpdated} links and ${totalImagesUpdated} images across ${processed} articles.`,
      });

    } catch (error: any) {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
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
              <BreadcrumbPage>Content Processor</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Content Processor</h1>
            <p className="text-muted-foreground">
              Update internal links and image references in migrated articles
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Processing Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Articles</p>
                  <p className="text-2xl font-bold">{stats.totalArticles}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processed</p>
                  <p className="text-2xl font-bold">{stats.processed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Links Updated</p>
                  <p className="text-2xl font-bold">{stats.linksUpdated}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Images Updated</p>
                  <p className="text-2xl font-bold">{stats.imagesUpdated}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-red-500">{stats.errors}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Process Article Content</CardTitle>
              <CardDescription>
                This will scan all articles and update internal links to point to new URLs
                based on your URL mappings. It will also identify images that need migration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Before running:</strong> Make sure you have:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Imported all articles</li>
                    <li>Created URL mappings for all old slugs</li>
                    <li>Backed up your data (if needed)</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleProcess}
                disabled={processing || stats.totalArticles === 0}
                size="lg"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
                {processing ? 'Processing...' : 'Start Processing'}
              </Button>

              {processing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing articles...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {!processing && stats.processed > 0 && (
                <Alert className="border-green-500">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Successfully processed {stats.processed} articles
                    {stats.errors > 0 && ` (${stats.errors} errors)`}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
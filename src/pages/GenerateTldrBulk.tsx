import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, Home, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const GenerateTldrBulk = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, processed: 0, success: 0, failed: 0 });
  const { toast } = useToast();
  const navigate = useNavigate();

  const processBulkTldr = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Get ALL articles without TL;DR (regardless of status or date)
      const { data: articles, error: fetchError } = await supabase
        .from("articles")
        .select("id, title, content, tldr_snapshot, status")
        .or("tldr_snapshot.is.null,tldr_snapshot.eq.[]");

      if (fetchError) throw fetchError;
      if (!articles || articles.length === 0) {
        toast({
          title: "No articles to process",
          description: "All articles already have TL;DR Snapshots.",
        });
        setIsProcessing(false);
        return;
      }

      setStats({ total: articles.length, processed: 0, success: 0, failed: 0 });

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        
        try {
          const { data, error } = await supabase.functions.invoke("generate-tldr-snapshot", {
            body: {
              articleId: article.id,
              content: article.content,
              title: article.title,
            },
          });

          if (error) {
            console.error(`TL;DR generation error for article ${article.id}:`, error);
            throw error;
          }

          if (!data || !data.success) {
            console.error(`TL;DR generation failed for article ${article.id}:`, data);
            throw new Error(data?.error || "Failed to generate TL;DR");
          }

          setStats(prev => ({
            ...prev,
            processed: i + 1,
            success: prev.success + 1,
          }));
        } catch (error) {
          console.error(`Failed to generate TL;DR for article ${article.id}:`, error);
          
          // Show first error to user
          if (i === 0) {
            toast({
              title: "Error generating TL;DR",
              description: error instanceof Error ? error.message : "Unknown error occurred",
              variant: "destructive",
            });
          }
          
          setStats(prev => ({
            ...prev,
            processed: i + 1,
            failed: prev.failed + 1,
          }));
        }

        setProgress(((i + 1) / articles.length) * 100);
        
        // Small delay to avoid rate limiting
        if (i < articles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast({
        title: "Bulk TL;DR Generation Complete!",
        description: `Successfully generated: ${stats.success}, Failed: ${stats.failed}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary inline-flex items-center gap-1">
            <Home className="h-3 w-3" />
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link to="/admin/migration" className="hover:text-primary">
            Migration Dashboard
          </Link>
          <span className="mx-2">›</span>
          <span>Generate TL;DR Snapshots</span>
        </nav>

        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/migration")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Migration Dashboard
          </Button>
          
          <h1 className="headline text-4xl mb-2">Generate TL;DR Snapshots</h1>
          <p className="text-muted-foreground">
            Automatically generate TL;DR Snapshots for all articles in the platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Bulk TL;DR Generation
            </CardTitle>
            <CardDescription>
              This will generate 3-bullet TL;DR Snapshots for all articles (published or draft) and remove any existing TL;DR sections from article bodies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={processBulkTldr}
              disabled={isProcessing}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate TL;DR for All Articles
                </>
              )}
            </Button>

            {isProcessing && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{stats.processed}</div>
                      <div className="text-xs text-muted-foreground">Processed</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                      <div className="text-xs text-muted-foreground">Success</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {stats.processed > 0 && !isProcessing && (
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Results</h3>
                  <div className="text-sm space-y-1">
                    <p>Total articles: {stats.total}</p>
                    <p className="text-green-600">Successfully generated: {stats.success}</p>
                    {stats.failed > 0 && (
                      <p className="text-red-600">Failed: {stats.failed}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default GenerateTldrBulk;

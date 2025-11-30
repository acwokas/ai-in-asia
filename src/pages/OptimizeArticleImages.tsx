import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image as ImageIcon, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";

interface OptimizationResult {
  articleId: string;
  articleTitle: string;
  imagesFound: number;
  imagesOptimized: number;
  errors: string[];
  originalSizeKB: number;
  optimizedSizeKB: number;
}

interface OptimizationSummary {
  articlesProcessed: number;
  totalImagesFound: number;
  totalImagesOptimized: number;
  totalOriginalSizeKB: number;
  totalOptimizedSizeKB: number;
}

const OptimizeArticleImages = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [summary, setSummary] = useState<OptimizationSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Fetch articles with potential base64 images
  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles-with-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, content, status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter articles that likely contain base64 images
      const articlesWithImages = data.filter((article) => {
        const contentStr = typeof article.content === 'string' 
          ? article.content 
          : JSON.stringify(article.content);
        return contentStr.includes('data:image/');
      });

      return articlesWithImages;
    },
  });

  const handleOptimizeAll = async () => {
    if (!articles || articles.length === 0) {
      toast({
        title: "No articles found",
        description: "No articles with base64 images found to optimize",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setSummary(null);
    setProgress(0);

    try {
      const articleIds = articles.map((a) => a.id);
      const batchSize = 5; // Process 5 articles at a time
      const batches = [];

      for (let i = 0; i < articleIds.length; i += batchSize) {
        batches.push(articleIds.slice(i, i + batchSize));
      }

      const allResults: OptimizationResult[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length}`);

        const { data, error } = await supabase.functions.invoke('optimize-article-images', {
          body: { articleIds: batch },
        });

        if (error) throw error;

        if (data?.results) {
          allResults.push(...data.results);
        }

        setProgress(Math.round(((i + 1) / batches.length) * 100));
        setResults([...allResults]);
      }

      // Calculate final summary
      const finalSummary: OptimizationSummary = {
        articlesProcessed: allResults.length,
        totalImagesFound: allResults.reduce((sum, r) => sum + r.imagesFound, 0),
        totalImagesOptimized: allResults.reduce((sum, r) => sum + r.imagesOptimized, 0),
        totalOriginalSizeKB: allResults.reduce((sum, r) => sum + r.originalSizeKB, 0),
        totalOptimizedSizeKB: allResults.reduce((sum, r) => sum + r.optimizedSizeKB, 0),
      };

      setSummary(finalSummary);

      toast({
        title: "Optimization complete!",
        description: `Optimized ${finalSummary.totalImagesOptimized} images across ${finalSummary.articlesProcessed} articles`,
      });

    } catch (error) {
      console.error('Error optimizing images:', error);
      toast({
        title: "Optimization failed",
        description: error instanceof Error ? error.message : "Failed to optimize images",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const formatSize = (kb: number) => {
    if (kb < 1024) return `${kb}KB`;
    return `${(kb / 1024).toFixed(2)}MB`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Optimize Article Images</h1>
          <p className="text-muted-foreground">
            Find and optimize base64-encoded images in articles by uploading them to cloud storage
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Articles Found</h2>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'Scanning...' : `${articles?.length || 0} articles with base64 images`}
                </p>
              </div>
              <Button
                onClick={handleOptimizeAll}
                disabled={isProcessing || isLoading || !articles || articles.length === 0}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Optimize All Images
                  </>
                )}
              </Button>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {progress}% complete
                </p>
              </div>
            )}
          </div>
        </Card>

        {summary && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="font-semibold">Articles</div>
                  <div>{summary.articlesProcessed}</div>
                </div>
                <div>
                  <div className="font-semibold">Images Found</div>
                  <div>{summary.totalImagesFound}</div>
                </div>
                <div>
                  <div className="font-semibold">Optimized</div>
                  <div>{summary.totalImagesOptimized}</div>
                </div>
                <div>
                  <div className="font-semibold">Original Size</div>
                  <div>{formatSize(summary.totalOriginalSizeKB)}</div>
                </div>
                <div>
                  <div className="font-semibold">New Size</div>
                  <div>{formatSize(summary.totalOptimizedSizeKB)}</div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Optimization Results</h2>
            
            {results.map((result) => (
              <Card key={result.articleId} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{result.articleTitle}</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                      <div>
                        <span className="text-muted-foreground">Found: </span>
                        <span className="font-medium">{result.imagesFound}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Optimized: </span>
                        <span className="font-medium">{result.imagesOptimized}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Original: </span>
                        <span className="font-medium">{formatSize(result.originalSizeKB)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">New: </span>
                        <span className="font-medium">{formatSize(result.optimizedSizeKB)}</span>
                      </div>
                    </div>

                    {result.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {result.errors.map((error, idx) => (
                          <p key={idx} className="text-sm text-destructive flex items-center gap-2">
                            <XCircle className="h-3 w-3" />
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    {result.imagesOptimized > 0 && result.errors.length === 0 ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : result.errors.length > 0 ? (
                      <XCircle className="h-6 w-6 text-destructive" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-yellow-500" />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizeArticleImages;

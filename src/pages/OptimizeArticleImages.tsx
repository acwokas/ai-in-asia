import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image as ImageIcon, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [currentArticle, setCurrentArticle] = useState<string>('');
  const [articlesProcessed, setArticlesProcessed] = useState(0);
  const [imagesProcessed, setImagesProcessed] = useState(0);
  const [totalArticles, setTotalArticles] = useState(0);
  const [shouldScan, setShouldScan] = useState(false);
  const [recompressProcessing, setRecompressProcessing] = useState(false);
  const [recompressResults, setRecompressResults] = useState<any[]>([]);
  const { toast } = useToast();

  // Only fetch articles when user clicks "Scan for Images"
  const { data: articles, isLoading, refetch } = useQuery({
    queryKey: ['articles-with-images'],
    queryFn: async () => {
      console.log('Starting article scan...');
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(50); // Scan last 50 articles only

      if (error) throw error;

      console.log(`Fetched ${data.length} articles, checking for images...`);

      // Fetch content only for articles we need to check
      const articlesWithImages = [];
      for (const article of data) {
        const { data: fullArticle, error: contentError } = await supabase
          .from('articles')
          .select('content')
          .eq('id', article.id)
          .single();

        if (!contentError && fullArticle) {
          const contentStr = typeof fullArticle.content === 'string' 
            ? fullArticle.content 
            : JSON.stringify(fullArticle.content);
          
          // Check for either base64 images OR stored images from article-images bucket
          if (contentStr.includes('data:image/') || contentStr.includes('article-images')) {
            articlesWithImages.push(article);
          }
        }
      }

      console.log(`Found ${articlesWithImages.length} articles with images`);
      return articlesWithImages;
    },
    enabled: shouldScan, // Only run when user triggers it
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleScanArticles = () => {
    setShouldScan(true);
    refetch();
  };

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
    setCurrentArticle('');
    setArticlesProcessed(0);
    setImagesProcessed(0);
    setTotalArticles(articles.length);

    try {
      const allResults: OptimizationResult[] = [];
      let totalImagesFound = 0;

      // Process one article at a time for real-time updates
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        setCurrentArticle(article.title);
        setArticlesProcessed(i + 1);
        
        console.log(`Processing article ${i + 1}/${articles.length}: ${article.title}`);

        const { data, error } = await supabase.functions.invoke('optimize-article-images', {
          body: { articleIds: [article.id] },
        });

        if (error) {
          console.error(`Error processing article ${article.id}:`, error);
          allResults.push({
            articleId: article.id,
            articleTitle: article.title,
            imagesFound: 0,
            imagesOptimized: 0,
            errors: [error.message],
            originalSizeKB: 0,
            optimizedSizeKB: 0,
          });
        } else if (data?.results) {
          allResults.push(...data.results);
          const result = data.results[0];
          totalImagesFound += result.imagesOptimized;
          setImagesProcessed(totalImagesFound);
        }

        setProgress(Math.round(((i + 1) / articles.length) * 100));
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

  const handleRecompressAll = async () => {
    if (!articles?.length) {
      toast({
        title: "No articles found",
        description: "Please scan for articles first",
        variant: "destructive",
      });
      return;
    }

    setRecompressProcessing(true);
    setRecompressResults([]);

    try {
      const articleIds = articles.map(a => a.id);
      
      toast({
        title: "Starting re-compression",
        description: `Processing ${articleIds.length} articles...`,
      });

      const { data, error } = await supabase.functions.invoke('recompress-stored-images', {
        body: { articleIds }
      });

      if (error) throw error;

      setRecompressResults(data.results || []);
      
      if (data.summary) {
        toast({
          title: "Re-compression complete!",
          description: `Compressed ${data.summary.totalImagesProcessed} images, saved ${data.summary.totalSavingsKB}KB total`,
        });
      }
    } catch (error: any) {
      console.error('Re-compression error:', error);
      toast({
        title: "Re-compression failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRecompressProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Optimize Article Images</h1>
          <p className="text-muted-foreground">
            Scan articles for base64 images to upload to storage, or re-compress existing stored images
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Scan Articles</h2>
                <p className="text-sm text-muted-foreground">
                  {!shouldScan && !articles ? (
                    'Click "Scan for Images" to find articles with images (last 50 articles)'
                  ) : isLoading ? (
                    'Scanning articles for images...'
                  ) : (
                    `${articles?.length || 0} articles with images found`
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleScanArticles}
                  disabled={isLoading}
                  size="lg"
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Scan for Images
                    </>
                  )}
                </Button>
                {articles && articles.length > 0 && (
                  <Button
                    onClick={handleOptimizeAll}
                    disabled={isProcessing || isLoading}
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
                )}
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-3">
                <Progress value={progress} className="h-2" />
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-medium">{progress}% complete</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Articles:</span>
                    <span className="font-medium">{articlesProcessed} / {totalArticles}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Images Optimized:</span>
                    <span className="font-medium text-green-600">{imagesProcessed}</span>
                  </div>
                  
                  {currentArticle && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Currently processing:</p>
                      <p className="text-sm font-medium truncate" title={currentArticle}>
                        {currentArticle}
                      </p>
                    </div>
                  )}
                </div>
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

        {/* Re-compress Existing Images Section */}
        <Card className="p-6 mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Re-compress Stored Images</h2>
              <p className="text-sm text-muted-foreground">
                Compress images that are already in storage to reduce file sizes
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will re-compress all images found in the scanned articles, potentially reducing file sizes by 30-70%.
                Images will be overwritten with compressed versions.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleRecompressAll}
              disabled={!articles?.length || recompressProcessing}
              size="lg"
            >
              {recompressProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-compressing...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Re-compress All Images ({articles?.length || 0} articles)
                </>
              )}
            </Button>

            {recompressResults.length > 0 && (
              <div className="space-y-4 mt-6">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Re-compression Complete</div>
                    <div>Processed {recompressResults.length} articles</div>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  {recompressResults.map((result) => (
                    <Card key={result.articleId} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{result.articleTitle}</h3>
                          <div className="text-sm text-muted-foreground">
                            {result.imagesFound} images found • {result.imagesProcessed} compressed • 
                            Saved {result.totalSavingsKB}KB
                          </div>
                          {result.errors && result.errors.length > 0 && (
                            <div className="text-sm text-destructive mt-2 space-y-1">
                              {result.errors.map((err: string, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <XCircle className="h-3 w-3" />
                                  {err}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {result.status === 'success' && result.imagesProcessed > 0 ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OptimizeArticleImages;

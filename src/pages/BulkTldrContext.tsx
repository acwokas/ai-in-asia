import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, Play, Eye, Loader2, CheckCircle, XCircle, SkipForward } from "lucide-react";
import { Link } from "react-router-dom";

interface PreviewResult {
  whoShouldPayAttention: string;
  whatChangesNext: string;
}

interface QueueStatus {
  id: string;
  status: string;
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
}

const BulkTldrContext = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [existingSnapshot, setExistingSnapshot] = useState<any>(null);
  const [queue, setQueue] = useState<QueueStatus | null>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const processingRef = useRef(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, tldr_snapshot")
      .in("status", ["published", "scheduled"])
      .not("tldr_snapshot", "is", null)
      .order("published_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setArticles(data);
      if (data.length > 0) {
        setSelectedArticleId(data[0].id);
      }
    }
  };

  const handlePreview = async () => {
    if (!selectedArticleId) return;
    setIsLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke("bulk-update-tldr-context", {
        body: { action: "preview", articleId: selectedArticleId }
      });

      if (error) throw error;

      setPreview(data.preview);
      setExistingSnapshot(data.existingSnapshot);
      toast({ title: "Preview generated", description: "Review the editorial context below" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBulk = async () => {
    setIsProcessing(true);
    setBatchResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("bulk-update-tldr-context", {
        body: { action: "start" }
      });

      if (error) throw error;

      setQueue({
        id: data.batchId,
        status: "queued",
        total_items: data.totalItems,
        processed_items: 0,
        successful_items: 0,
        failed_items: 0
      });

      toast({ 
        title: "Bulk update started", 
        description: `Processing ${data.totalItems} articles` 
      });

      // Start processing
      processingRef.current = true;
      processNextBatch(data.batchId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const processNextBatch = async (batchId: string) => {
    if (!processingRef.current) return;

    try {
      const { data, error } = await supabase.functions.invoke("bulk-update-tldr-context", {
        body: { action: "process", batchId, batchSize: 3 }
      });

      if (error) throw error;

      setQueue(prev => prev ? {
        ...prev,
        status: data.completed ? "completed" : "processing",
        processed_items: data.processed,
        successful_items: prev.successful_items + (data.batchResults?.filter((r: any) => r.status === "success").length || 0),
        failed_items: prev.failed_items + (data.batchResults?.filter((r: any) => r.status === "error").length || 0)
      } : null);

      if (data.batchResults) {
        setBatchResults(prev => [...prev, ...data.batchResults]);
      }

      if (data.completed) {
        toast({ title: "Complete!", description: "All articles have been processed" });
        setIsProcessing(false);
        processingRef.current = false;
      } else {
        // Continue processing after a short delay
        setTimeout(() => processNextBatch(batchId), 1000);
      }
    } catch (err: any) {
      toast({ title: "Error processing batch", description: err.message, variant: "destructive" });
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const handleStop = () => {
    processingRef.current = false;
    setIsProcessing(false);
    toast({ title: "Stopped", description: "Processing has been paused" });
  };

  const selectedArticle = articles.find(a => a.id === selectedArticleId);
  const progressPercent = queue ? (queue.processed_items / queue.total_items) * 100 : 0;

  return (
    <>
      <Helmet>
        <title>Bulk Update TL;DR Context | Admin</title>
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Link to="/admin" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>

          <h1 className="text-3xl font-bold mb-2">Bulk Update AI Snapshot Context</h1>
          <p className="text-muted-foreground mb-8">
            Add "Who should pay attention" and "What changes next" to existing articles with TL;DR snapshots.
          </p>

          {/* Preview Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">Step 1: Preview Example</CardTitle>
              <CardDescription>
                Select an article to preview what the AI will generate before running on all articles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select an article" />
                  </SelectTrigger>
                  <SelectContent>
                    {articles.map(article => (
                      <SelectItem key={article.id} value={article.id}>
                        {article.title.substring(0, 60)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handlePreview} disabled={isLoading || !selectedArticleId}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  Preview
                </Button>
              </div>

              {preview && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <h4 className="font-medium">Generated Context:</h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-semibold">Who should pay attention:</span>{" "}
                      <span className="text-muted-foreground">{preview.whoShouldPayAttention || "(empty)"}</span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">What changes next:</span>{" "}
                      <span className="text-muted-foreground">{preview.whatChangesNext || "(empty)"}</span>
                    </p>
                  </div>
                  
                  {existingSnapshot && (
                    <div className="pt-3 border-t">
                      <h5 className="text-sm font-medium mb-2">Existing TL;DR Bullets:</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {(Array.isArray(existingSnapshot) ? existingSnapshot : existingSnapshot?.bullets || []).map((b: string, i: number) => (
                          <li key={i}>• {b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bulk Processing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Step 2: Bulk Update All Articles</CardTitle>
              <CardDescription>
                Process all published and scheduled articles with existing TL;DR snapshots.
                This runs in small batches to avoid timeouts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {!isProcessing ? (
                  <Button onClick={handleStartBulk} disabled={isProcessing} className="bg-primary">
                    <Play className="h-4 w-4 mr-2" />
                    Start Bulk Update
                  </Button>
                ) : (
                  <Button onClick={handleStop} variant="destructive">
                    Stop Processing
                  </Button>
                )}
              </div>

              {queue && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress: {queue.processed_items} / {queue.total_items}</span>
                    <Badge variant={queue.status === "completed" ? "default" : "secondary"}>
                      {queue.status}
                    </Badge>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" /> {queue.successful_items} success
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" /> {queue.failed_items} failed
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <SkipForward className="h-4 w-4" /> {batchResults.filter(r => r.status === "skipped").length} skipped
                    </span>
                  </div>
                </div>
              )}

              {/* Recent results */}
              {batchResults.length > 0 && (
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="font-medium mb-2">Recent Results:</h4>
                  <div className="space-y-2 text-sm">
                    {batchResults.slice(-10).reverse().map((result, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {result.status === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {result.status === "error" && <XCircle className="h-4 w-4 text-red-600" />}
                        {result.status === "skipped" && <SkipForward className="h-4 w-4 text-muted-foreground" />}
                        <span className="truncate flex-1">{result.id}</span>
                        {result.status === "error" && (
                          <span className="text-red-600 truncate">{result.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default BulkTldrContext;

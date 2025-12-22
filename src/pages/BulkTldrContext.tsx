import { useState, useEffect } from "react";
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
import { ArrowLeft, Play, Eye, Loader2, CheckCircle, XCircle, SkipForward, StopCircle } from "lucide-react";
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
  started_at: string | null;
  completed_at: string | null;
}

const BulkTldrContext = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [existingSnapshot, setExistingSnapshot] = useState<any>(null);
  const [queue, setQueue] = useState<QueueStatus | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
    checkExistingJob();
  }, []);

  // Subscribe to realtime updates when we have an active batch
  useEffect(() => {
    if (!activeBatchId) return;

    const channel = supabase
      .channel(`bulk-queue-${activeBatchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bulk_operation_queue',
          filter: `id=eq.${activeBatchId}`
        },
        (payload) => {
          console.log('Realtime update:', payload);
          const newData = payload.new as any;
          setQueue({
            id: newData.id,
            status: newData.status,
            total_items: newData.total_items,
            processed_items: newData.processed_items,
            successful_items: newData.successful_items,
            failed_items: newData.failed_items,
            started_at: newData.started_at,
            completed_at: newData.completed_at,
          });

          if (newData.status === 'completed') {
            toast({ title: "Complete!", description: "All articles have been processed" });
          } else if (newData.status === 'cancelled') {
            toast({ title: "Cancelled", description: "Job was cancelled" });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBatchId, toast]);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("You must be signed in to run this admin tool.");
    }
    return { Authorization: `Bearer ${session.access_token}` };
  };

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

  const checkExistingJob = async () => {
    // Check for any in-progress jobs
    const { data } = await supabase
      .from("bulk_operation_queue")
      .select("*")
      .eq("operation_type", "tldr_context_update")
      .in("status", ["queued", "processing"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const job = data[0];
      setActiveBatchId(job.id);
      setQueue({
        id: job.id,
        status: job.status,
        total_items: job.total_items,
        processed_items: job.processed_items,
        successful_items: job.successful_items,
        failed_items: job.failed_items,
        started_at: job.started_at,
        completed_at: job.completed_at,
      });
    }
  };

  const handlePreview = async () => {
    if (!selectedArticleId) return;
    setIsLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke("bulk-update-tldr-context", {
        headers: await getAuthHeaders(),
        body: { action: "preview", articleId: selectedArticleId },
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
    setIsStarting(true);

    try {
      const { data, error } = await supabase.functions.invoke("bulk-update-tldr-context", {
        headers: await getAuthHeaders(),
        body: { action: "start" },
      });

      if (error) throw error;

      setActiveBatchId(data.batchId);
      setQueue({
        id: data.batchId,
        status: "queued",
        total_items: data.totalItems,
        processed_items: 0,
        successful_items: 0,
        failed_items: 0,
        started_at: null,
        completed_at: null,
      });

      toast({
        title: "Bulk update started",
        description: `Processing ${data.totalItems} articles in background`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeBatchId) return;

    try {
      const { error } = await supabase.functions.invoke("bulk-update-tldr-context", {
        headers: await getAuthHeaders(),
        body: { action: "cancel", batchId: activeBatchId },
      });

      if (error) throw error;
      toast({ title: "Cancelled", description: "Job has been cancelled" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleClear = () => {
    setQueue(null);
    setActiveBatchId(null);
  };

  const selectedArticle = articles.find(a => a.id === selectedArticleId);
  const progressPercent = queue && queue.total_items > 0 
    ? (queue.processed_items / queue.total_items) * 100 
    : 0;
  const isActive = queue && (queue.status === "queued" || queue.status === "processing");
  const skippedCount = queue 
    ? queue.processed_items - queue.successful_items - queue.failed_items 
    : 0;

  const formatDuration = () => {
    if (!queue?.started_at) return "";
    const start = new Date(queue.started_at).getTime();
    const end = queue.completed_at ? new Date(queue.completed_at).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

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
                Progress updates in real-time. Processing continues in the background.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {!isActive ? (
                  <>
                    <Button onClick={handleStartBulk} disabled={isStarting} className="bg-primary">
                      {isStarting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      Start Bulk Update
                    </Button>
                    {queue && queue.status === "completed" && (
                      <Button onClick={handleClear} variant="outline">
                        Clear
                      </Button>
                    )}
                  </>
                ) : (
                  <Button onClick={handleCancel} variant="destructive">
                    <StopCircle className="h-4 w-4 mr-2" />
                    Cancel Job
                  </Button>
                )}
              </div>

              {queue && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress: {queue.processed_items} / {queue.total_items}</span>
                    <div className="flex items-center gap-2">
                      {formatDuration() && (
                        <span className="text-muted-foreground">{formatDuration()}</span>
                      )}
                      <Badge variant={queue.status === "completed" ? "default" : queue.status === "cancelled" ? "destructive" : "secondary"}>
                        {queue.status}
                      </Badge>
                    </div>
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
                      <SkipForward className="h-4 w-4" /> {skippedCount} skipped
                    </span>
                  </div>

                  {queue.status === "completed" && (
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Processing complete! {queue.successful_items} articles updated successfully.
                      </p>
                    </div>
                  )}

                  {isActive && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Processing in background. You can leave this page - progress will continue.
                      </p>
                    </div>
                  )}
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

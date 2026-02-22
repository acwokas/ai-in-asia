import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Clock, CheckCircle2, XCircle, AlertTriangle, Trash2, RotateCcw, ChevronDown, ChevronUp, Play } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface QueueJob {
  id: string;
  operation_type: string;
  status: string;
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  results: any;
}

interface BulkOperationQueueProps {
  operationType?: string;
}

export const BulkOperationQueue = ({ operationType }: BulkOperationQueueProps) => {
  
  const queryClient = useQueryClient();
  const [activeJob, setActiveJob] = useState<QueueJob | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [isRetrying, setIsRetrying] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  // Track progress across polls to detect stalls
  const lastProgressRef = useRef<{ jobId: string; processedItems: number; ts: number } | null>(null);
  const lastAutoStartRef = useRef<number>(0);

  // Fetch queue jobs
  const { data: queueJobs, refetch } = useQuery({
    queryKey: ["bulk-operation-queue", operationType],
    queryFn: async () => {
      let query = supabase
        .from("bulk_operation_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (operationType) {
        query = query.eq("operation_type", operationType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as QueueJob[];
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bulk_operation_queue'
        },
        (payload: any) => {
          console.log('Queue update:', payload);
          refetch();
          
          // Show toast notification for completed or failed jobs
          if (payload.eventType === 'UPDATE') {
            const job = payload.new as QueueJob;
            
            if (job.status === 'completed') {
              toast.success("✅ Bulk Operation Complete", {
                description: `Successfully processed ${job.successful_items}/${job.total_items} articles`,
              });
            } else if (job.status === 'failed') {
              toast.error("❌ Bulk Operation Failed", {
                description: job.error_message || "Operation encountered an error",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, toast]);

  // Set active job (prioritize processing job over queued)
  useEffect(() => {
    const processing = queueJobs?.find((j) => j.status === "processing") || null;
    const queued = queueJobs?.find((j) => j.status === "queued") || null;
    setActiveJob(processing || queued);
  }, [queueJobs]);

  // Auto-start processing when jobs are queued (prevents "stuck at 0" states)
  useEffect(() => {
    const hasProcessing = queueJobs?.some((j) => j.status === "processing");
    const hasQueued = queueJobs?.some((j) => j.status === "queued");

    if (!hasProcessing && hasQueued && !isResuming) {
      const now = Date.now();
      // Guard: don't spam invocations (e.g. during refetch/realtime bursts)
      if (now - lastAutoStartRef.current > 15000) {
        lastAutoStartRef.current = now;
        console.log("Auto-starting bulk queue processor");
        supabase.functions
          .invoke("process-bulk-queue", { method: "POST" })
          .catch((err) => console.log("Auto-start error (may be expected):", err));
      }
    }
  }, [queueJobs, isResuming]);

  // Auto-continue processing for active jobs (only if progress hasn't moved)
  useEffect(() => {
    const processingJob = queueJobs?.find((j) => j.status === "processing");

    if (!processingJob) {
      lastProgressRef.current = null;
      return;
    }

    const now = Date.now();
    const prev = lastProgressRef.current;

    // First time seeing this job, or progress advanced: update marker
    if (!prev || prev.jobId !== processingJob.id || prev.processedItems !== processingJob.processed_items) {
      lastProgressRef.current = {
        jobId: processingJob.id,
        processedItems: processingJob.processed_items,
        ts: now,
      };
      return;
    }

    // Same processed_items as last poll - consider stalled
    const stalledForMs = now - prev.ts;
    if (processingJob.processed_items < processingJob.total_items && stalledForMs > 10000) {
      console.log(`Auto-continuing processing for job ${processingJob.id} (stalled ${Math.round(stalledForMs / 1000)}s)`);
      supabase.functions
        .invoke("process-bulk-queue", { method: "POST" })
        .catch((err) => console.log("Auto-continue error (may be expected):", err));

      // Reset timer so we don't spam every render
      lastProgressRef.current = { ...prev, ts: now };
    }
  }, [queueJobs]);


  const handleCancelJob = async (jobId: string, isProcessing: boolean = false) => {
    try {
      const { error } = await supabase
        .from("bulk_operation_queue")
        .update({ status: 'cancelled', completed_at: new Date().toISOString() })
        .eq("id", jobId)
        .in("status", isProcessing ? ["processing", "queued"] : ["queued"]);

      if (error) throw error;

      toast(isProcessing ? "Job Stopped" : "Job Cancelled", {
        description: isProcessing 
          ? "The bulk operation has been stopped. Current batch may still complete." 
          : "The bulk operation has been cancelled",
      });
      refetch();
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to cancel job",
      });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("bulk_operation_queue")
        .delete()
        .eq("id", jobId)
        .in("status", ["completed", "failed", "cancelled"]);

      if (error) throw error;

      toast("Job Deleted", {
        description: "The job record has been removed",
      });
      refetch();
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to delete job",
      });
    }
  };

  const handleRetryFailed = async (job: QueueJob) => {
    try {
      setIsRetrying(job.id);
      
      // Get failed article IDs from results
      const results = job.results as any[] || [];
      const failedArticleIds = results
        .filter((r: any) => r.status === "failed")
        .map((r: any) => r.articleId)
        .filter(Boolean);

      if (failedArticleIds.length === 0) {
        toast.error("No Failed Articles", {
          description: "There are no failed articles to retry",
        });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Authentication Required", {
          description: "Please log in to retry operations",
        });
        return;
      }

      // Create a new queue job for failed articles
      const { error } = await supabase
        .from("bulk_operation_queue")
        .insert({
          operation_type: job.operation_type,
          article_ids: failedArticleIds,
          total_items: failedArticleIds.length,
          created_by: userData.user.id,
          options: { retry: true, originalJobId: job.id }
        });

      if (error) throw error;

      toast.success("✅ Retry Queued", {
        description: `${failedArticleIds.length} failed articles queued for reprocessing`,
      });

      refetch();
      queryClient.invalidateQueries({ queryKey: ["bulk-operation-queue"] });
    } catch (error: any) {
      console.error("Error retrying failed articles:", error);
      toast.error("Error", {
        description: error.message || "Failed to queue retry",
      });
    } finally {
      setIsRetrying(null);
    }
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleResumeProcessing = async () => {
    try {
      setIsResuming(true);
      
      const { error } = await supabase.functions.invoke('process-bulk-queue', {
        method: 'POST'
      });

      if (error) throw error;

      toast.success("✅ Processing Resumed", {
        description: "Bulk queue processor has been triggered manually",
      });

      // Refetch queue data after a short delay
      setTimeout(() => {
        refetch();
      }, 2000);
    } catch (error: any) {
      console.error("Error resuming processing:", error);
      toast.error("Error", {
        description: error.message || "Failed to resume processing",
      });
    } finally {
      setIsResuming(false);
    }
  };

  const getFailedArticles = (job: QueueJob) => {
    const results = job.results as any[] || [];
    return results.filter((r: any) => r.status === "failed");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
      case 'processing':
        return <Badge><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateTimeRemaining = (job: QueueJob): string | null => {
    if (job.status !== 'processing' || !job.started_at || job.processed_items === 0) {
      return null;
    }

    const now = new Date();
    const startTime = new Date(job.started_at);
    const elapsedMs = now.getTime() - startTime.getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);

    // Calculate processing rate (items per minute)
    const itemsPerMinute = job.processed_items / elapsedMinutes;
    
    if (itemsPerMinute === 0) return null;

    const remainingItems = job.total_items - job.processed_items;
    const estimatedMinutesRemaining = remainingItems / itemsPerMinute;

    // Format time remaining
    if (estimatedMinutesRemaining < 1) {
      return "< 1 min";
    } else if (estimatedMinutesRemaining < 60) {
      return `~${Math.round(estimatedMinutesRemaining)} min`;
    } else {
      const hours = Math.floor(estimatedMinutesRemaining / 60);
      const mins = Math.round(estimatedMinutesRemaining % 60);
      return `~${hours}h ${mins}m`;
    }
  };

  const getProcessingRate = (job: QueueJob): string | null => {
    if (job.status !== 'processing' || !job.started_at || job.processed_items === 0) {
      return null;
    }

    const now = new Date();
    const startTime = new Date(job.started_at);
    const elapsedMs = now.getTime() - startTime.getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);

    const itemsPerMinute = job.processed_items / elapsedMinutes;
    
    if (itemsPerMinute < 1) {
      const secondsPerItem = 60 / itemsPerMinute;
      return `${secondsPerItem.toFixed(1)}s per article`;
    }
    
    return `${itemsPerMinute.toFixed(1)} articles/min`;
  };

  const getOperationTypeName = (type: string) => {
    switch (type) {
      case 'add_internal_links':
        return 'Add Internal Links';
      case 'generate_ai_comments':
        return 'Generate AI Comments';
      case 'update_seo':
        return 'Update SEO';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Job */}
      {activeJob && (
        <Alert className="border-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle className="flex items-center justify-between">
            <span>{activeJob.status === 'processing' ? 'Processing' : 'Queued'}: {getOperationTypeName(activeJob.operation_type)}</span>
            <Button
              size="sm"
              variant={activeJob.status === 'processing' ? "destructive" : "ghost"}
              onClick={() => handleCancelJob(activeJob.id, activeJob.status === 'processing')}
            >
              {activeJob.status === 'processing' ? 'Stop' : 'Cancel'}
            </Button>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-2">
                <span>{activeJob.processed_items} / {activeJob.total_items} articles</span>
                <span>{activeJob.total_items > 0 ? Math.round((activeJob.processed_items / activeJob.total_items) * 100) : 0}%</span>
              </div>
              <Progress value={activeJob.total_items > 0 ? (activeJob.processed_items / activeJob.total_items) * 100 : 0} />
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                <span>✅ {activeJob.successful_items} successful</span>
                <span>❌ {activeJob.failed_items} failed</span>
                {getProcessingRate(activeJob) && (
                  <span>⚡ {getProcessingRate(activeJob)}</span>
                )}
                {calculateTimeRemaining(activeJob) && (
                  <span className="font-medium text-foreground">⏱️ {calculateTimeRemaining(activeJob)} remaining</span>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Queue History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Queue History</CardTitle>
              <CardDescription>
                Recent and active bulk operations. Updates in real-time. Jobs process automatically every minute.
              </CardDescription>
            </div>
            {(activeJob?.status === 'processing' || queueJobs?.some(j => j.status === 'queued')) && (
              <Button
                onClick={handleResumeProcessing}
                disabled={isResuming}
                size="sm"
                variant="outline"
              >
                {isResuming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Resuming...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume Now
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!queueJobs || queueJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No queued operations
            </div>
          ) : (
            <div className="space-y-3">
              {queueJobs.map((job) => {
                const failedArticles = getFailedArticles(job);
                const isExpanded = expandedJobs.has(job.id);
                const hasFailures = failedArticles.length > 0;

                return (
                  <Card key={job.id} className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium">{getOperationTypeName(job.operation_type)}</span>
                            {getStatusBadge(job.status)}
                            {(job as any).options?.retry && (
                              <Badge variant="outline" className="text-xs">
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Retry
                              </Badge>
                            )}
                            {hasFailures && (job.status === 'completed' || job.status === 'failed') && (
                              <Badge variant="destructive" className="text-xs">
                                {failedArticles.length} failed
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>
                              Created: {format(new Date(job.created_at), 'PPp')}
                            </div>
                            {job.status === 'processing' && (
                              <>
                                <div className="flex items-center gap-2 mt-2">
                                  <Progress value={(job.processed_items / job.total_items) * 100} className="flex-1" />
                                  <span className="text-xs whitespace-nowrap">{job.processed_items}/{job.total_items}</span>
                                </div>
                                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                  {getProcessingRate(job) && (
                                    <span>⚡ {getProcessingRate(job)}</span>
                                  )}
                                  {calculateTimeRemaining(job) && (
                                    <span className="font-medium">⏱️ {calculateTimeRemaining(job)} remaining</span>
                                  )}
                                </div>
                              </>
                            )}
                            {job.status === 'completed' && (
                              <div className="text-green-600 text-sm font-medium">
                                ✅ {job.successful_items}/{job.total_items} successful
                                {job.failed_items > 0 && (
                                  <span className="text-red-600 ml-2">
                                    ❌ {job.failed_items} failed
                                  </span>
                                )}
                              </div>
                            )}
                            {job.status === 'failed' && job.error_message && (
                              <div className="text-red-600 text-xs mt-1">
                                Error: {job.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 items-start">
                          {hasFailures && (job.status === 'completed' || job.status === 'failed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetryFailed(job)}
                              disabled={isRetrying === job.id}
                            >
                              {isRetrying === job.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Queueing...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Retry Failed
                                </>
                              )}
                            </Button>
                          )}
                          {job.status === 'queued' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelJob(job.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          {['completed', 'failed', 'cancelled'].includes(job.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {hasFailures && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleJobExpansion(job.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Failed Articles Details */}
                      {hasFailures && isExpanded && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            Failed Articles ({failedArticles.length})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {failedArticles.map((result: any, index: number) => (
                              <div
                                key={index}
                                className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm"
                              >
                                <div className="font-medium text-destructive">
                                  {result.title || 'Unknown Article'}
                                </div>
                                {result.error && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Error: {result.error}
                                  </div>
                                )}
                                {result.articleId && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    ID: {result.articleId}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

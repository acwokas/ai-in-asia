import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Clock, CheckCircle2, XCircle, AlertTriangle, Trash2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

export const BulkOperationQueue = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeJob, setActiveJob] = useState<QueueJob | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  // Fetch queue jobs
  const { data: queueJobs, refetch } = useQuery({
    queryKey: ["bulk-operation-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_operation_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

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
              toast({
                title: "✅ Bulk Operation Complete",
                description: `Successfully processed ${job.successful_items}/${job.total_items} articles`,
              });
            } else if (job.status === 'failed') {
              toast({
                title: "❌ Bulk Operation Failed",
                description: job.error_message || "Operation encountered an error",
                variant: "destructive",
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

  // Set active job (first processing or queued job)
  useEffect(() => {
    const active = queueJobs?.find(j => j.status === 'processing' || j.status === 'queued');
    setActiveJob(active || null);
  }, [queueJobs]);

  const handleCancelJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("bulk_operation_queue")
        .update({ status: 'cancelled' })
        .eq("id", jobId)
        .eq("status", "queued"); // Can only cancel queued jobs

      if (error) throw error;

      toast({
        title: "Job Cancelled",
        description: "The bulk operation has been cancelled",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel job",
        variant: "destructive",
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

      toast({
        title: "Job Deleted",
        description: "The job record has been removed",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete job",
        variant: "destructive",
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
        toast({
          title: "No Failed Articles",
          description: "There are no failed articles to retry",
          variant: "destructive",
        });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to retry operations",
          variant: "destructive",
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

      toast({
        title: "✅ Retry Queued",
        description: `${failedArticleIds.length} failed articles queued for reprocessing`,
      });

      refetch();
      queryClient.invalidateQueries({ queryKey: ["bulk-operation-queue"] });
    } catch (error: any) {
      console.error("Error retrying failed articles:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to queue retry",
        variant: "destructive",
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

  const getOperationTypeName = (type: string) => {
    switch (type) {
      case 'add_internal_links':
        return 'Add Internal Links';
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
            {activeJob.status === 'queued' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCancelJob(activeJob.id)}
              >
                Cancel
              </Button>
            )}
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-2">
                <span>{activeJob.processed_items} / {activeJob.total_items} articles</span>
                <span>{activeJob.total_items > 0 ? Math.round((activeJob.processed_items / activeJob.total_items) * 100) : 0}%</span>
              </div>
              <Progress value={activeJob.total_items > 0 ? (activeJob.processed_items / activeJob.total_items) * 100 : 0} />
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>✅ {activeJob.successful_items} successful</span>
                <span>❌ {activeJob.failed_items} failed</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Queue History */}
      <Card>
        <CardHeader>
          <CardTitle>Queue History</CardTitle>
          <CardDescription>
            Recent and active bulk operations. Jobs are processed automatically every 2 minutes.
          </CardDescription>
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
                              <div className="flex items-center gap-2 mt-2">
                                <Progress value={(job.processed_items / job.total_items) * 100} className="flex-1" />
                                <span className="text-xs">{job.processed_items}/{job.total_items}</span>
                              </div>
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

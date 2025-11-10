import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Clock, CheckCircle2, XCircle, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
}

export const BulkOperationQueue = () => {
  const { toast } = useToast();
  const [activeJob, setActiveJob] = useState<QueueJob | null>(null);

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
              {queueJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">{getOperationTypeName(job.operation_type)}</span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Created: {format(new Date(job.created_at), 'PPp')}
                      </div>
                      {job.status === 'processing' && (
                        <div className="flex items-center gap-2">
                          <Progress value={(job.processed_items / job.total_items) * 100} className="flex-1" />
                          <span className="text-xs">{job.processed_items}/{job.total_items}</span>
                        </div>
                      )}
                      {job.status === 'completed' && (
                        <div className="text-green-600">
                          ✅ {job.successful_items}/{job.total_items} successful
                          {job.failed_items > 0 && `, ${job.failed_items} failed`}
                        </div>
                      )}
                      {job.status === 'failed' && job.error_message && (
                        <div className="text-red-600 text-xs">
                          Error: {job.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

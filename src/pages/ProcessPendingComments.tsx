import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Home, MessageSquare, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const ProcessPendingComments = () => {
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  // Check admin access
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["admin-check"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      return !!data;
    },
  });

  // Get count of pending comments
  const { data: pendingCount, isLoading: loadingCount, refetch } = useQuery({
    queryKey: ["pending-comments-count"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pending_comments")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const processPendingComments = async () => {
    if (!pendingCount || pendingCount === 0) {
      toast("No pending comments", { description: "All pending comments have been processed" });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);

    const totalToProcess = pendingCount;
    let totalProcessed = 0;

    // Process in batches until all are done
    while (totalProcessed < totalToProcess) {
      try {
        const { data, error } = await supabase.functions.invoke("process-pending-comments");

        if (error) {
          console.error("Error processing batch:", error);
          throw error;
        }

        const batchProcessed = data?.processed || 0;
        totalProcessed += batchProcessed;
        setProcessedCount(totalProcessed);
        setProgress((totalProcessed / totalToProcess) * 100);

        if (batchProcessed === 0) {
          // No more pending comments to process
          break;
        }

        // Small delay between batches to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Error in batch processing:", error);
        toast.error("Error processing comments", { description: error instanceof Error ? error.message : "Unknown error" });
        break;
      }
    }

    setIsProcessing(false);
    refetch();
    
    toast("Processing complete!", { description: `Successfully processed ${totalProcessed} comments` });
  };

  if (checkingAdmin || loadingCount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary inline-flex items-center gap-1">
            <Home className="h-3 w-3" />
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link to="/admin" className="hover:text-primary">Admin</Link>
          <span className="mx-2">›</span>
          <span>Process Pending Comments</span>
        </nav>

        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          
          <h1 className="headline text-4xl mb-2">Process Pending Comments</h1>
          <p className="text-muted-foreground">
            Process all scheduled comments and post them to articles
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Pending Comments Queue
            </CardTitle>
            <CardDescription>
              {pendingCount ? (
                `There are ${pendingCount.toLocaleString()} pending comments waiting to be processed`
              ) : (
                "No pending comments in the queue"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{processedCount.toLocaleString()} / {pendingCount?.toLocaleString()}</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button 
                onClick={processPendingComments}
                disabled={isProcessing || !pendingCount || pendingCount === 0}
                size="lg"
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing Comments...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Process All Pending Comments
                  </>
                )}
              </Button>

               <div className="bg-muted p-4 rounded-lg text-sm">
                <h3 className="font-semibold mb-2">How it works:</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Processes pending comments in batches of 5</li>
                  <li>Uses AI to generate realistic comments</li>
                  <li>Posts comments with their original scheduled times</li>
                  <li>Will process {pendingCount ? Math.ceil(pendingCount / 5) : 0} batches total</li>
                  <li>Keep clicking until counter reaches 0</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProcessPendingComments;

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RotateCcw, Clock, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BulkLinksUndo = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  // Fetch bulk link operation history
  const { data: operations, isLoading, refetch } = useQuery({
    queryKey: ["bulk-links-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_link_operations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    }
  });

  const handleRestore = async (operationId: string) => {
    setIsRestoring(operationId);
    
    try {
      const operation = operations?.find(op => op.id === operationId);
      if (!operation || !operation.backup_data) {
        throw new Error("Backup data not found");
      }

      toast({
        title: "Restoring Articles",
        description: `Restoring ${operation.articles_modified} articles to previous state...`,
      });

      // Restore each article from backup
      const backupData = operation.backup_data as any[];
      let restored = 0;
      let failed = 0;

      for (const backup of backupData) {
        try {
          const { error: updateError } = await supabase
            .from("articles")
            .update({ content: backup.original_content })
            .eq("id", backup.article_id);

          if (updateError) {
            console.error(`Failed to restore article ${backup.article_id}:`, updateError);
            failed++;
          } else {
            restored++;
          }
        } catch (err) {
          console.error(`Error restoring article ${backup.article_id}:`, err);
          failed++;
        }
      }

      // Mark operation as undone
      await supabase
        .from("bulk_link_operations")
        .update({ undone_at: new Date().toISOString() })
        .eq("id", operationId);

      queryClient.invalidateQueries({ queryKey: ["bulk-links-history"] });
      queryClient.invalidateQueries({ queryKey: ["articles-internal-links"] });

      toast({
        title: "Restore Complete",
        description: `Successfully restored ${restored} articles. ${failed} failed.`,
      });

      refetch();
    } catch (error: any) {
      console.error("Error restoring articles:", error);
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore articles",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(null);
    }
  };

  const completedOps = operations?.filter(op => !op.undone_at).length || 0;
  const undonOps = operations?.filter(op => op.undone_at).length || 0;
  const totalArticlesModified = operations?.reduce((sum, op) => sum + (op.articles_modified || 0), 0) || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <a href="/admin" className="hover:text-foreground">Admin</a>
            <span>/</span>
            <a href="/admin/internal-links" className="hover:text-foreground">Internal Links</a>
            <span>/</span>
            <span>Undo History</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Bulk Link Operations History</h1>
          <p className="text-muted-foreground">
            View and undo bulk link additions to restore articles to their previous state
          </p>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>How Undo Works</AlertTitle>
          <AlertDescription>
            When you perform bulk link operations, we save the original article content. 
            You can restore articles to their pre-link state by clicking "Undo" on any operation.
            This is useful if the AI added incorrect links or if you want to try a different approach.
          </AlertDescription>
        </Alert>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{operations?.length || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Can Be Undone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{completedOps}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active operations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Articles Modified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{totalArticlesModified}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total affected</p>
            </CardContent>
          </Card>
        </div>

        {/* Operations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Operation History</CardTitle>
            <CardDescription>
              View past bulk link operations and restore articles if needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : operations && operations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Articles Modified</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((operation) => {
                    const successRate = operation.articles_modified > 0
                      ? Math.round((operation.articles_modified - (operation.failed_count || 0)) / operation.articles_modified * 100)
                      : 0;
                    
                    return (
                      <TableRow key={operation.id}>
                        <TableCell className="font-medium">
                          {format(new Date(operation.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{operation.articles_modified} articles</span>
                            {operation.failed_count > 0 && (
                              <span className="text-xs text-destructive">
                                {operation.failed_count} failed
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={successRate >= 90 ? "default" : "secondary"}>
                            {successRate}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {operation.undone_at ? (
                            <Badge variant="outline">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Undone {format(new Date(operation.undone_at), "MMM d")}
                            </Badge>
                          ) : (
                            <Badge variant="default">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!operation.undone_at && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRestore(operation.id)}
                              disabled={isRestoring === operation.id}
                            >
                              {isRestoring === operation.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Restoring...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Undo
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No bulk link operations found. Operations will appear here after you use the bulk link tool.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default BulkLinksUndo;

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface NotFoundLog {
  id: string;
  path: string;
  referrer: string | null;
  created_at: string;
  resolved: boolean;
  redirect_created: boolean;
}

interface PathSummary {
  path: string;
  count: number;
  last_seen: string;
  resolved: boolean;
  redirect_created: boolean;
}

const NotFoundAnalytics = () => {
  const [resolvingPath, setResolvingPath] = useState<string | null>(null);

  const { data: pathSummaries, isLoading, refetch } = useQuery({
    queryKey: ["404-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_not_found_log")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by path and count occurrences
      const summaryMap = new Map<string, PathSummary>();
      
      data?.forEach((log: NotFoundLog) => {
        const existing = summaryMap.get(log.path);
        if (existing) {
          existing.count++;
          if (new Date(log.created_at) > new Date(existing.last_seen)) {
            existing.last_seen = log.created_at;
          }
        } else {
          summaryMap.set(log.path, {
            path: log.path,
            count: 1,
            last_seen: log.created_at,
            resolved: log.resolved,
            redirect_created: log.redirect_created,
          });
        }
      });

      return Array.from(summaryMap.values()).sort((a, b) => b.count - a.count);
    },
  });

  const markAsResolved = async (path: string) => {
    setResolvingPath(path);
    try {
      const { error } = await supabase
        .from("page_not_found_log")
        .update({ resolved: true })
        .eq("path", path);

      if (error) throw error;

      toast.success("Path marked as resolved");
      refetch();
    } catch (error) {
      console.error("Error marking as resolved:", error);
      toast.error("Failed to mark as resolved");
    } finally {
      setResolvingPath(null);
    }
  };

  const totalErrors = pathSummaries?.reduce((sum, p) => sum + p.count, 0) || 0;
  const unresolvedPaths = pathSummaries?.filter(p => !p.resolved).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>404 Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Link>
          </Button>

          <h1 className="text-4xl font-bold mb-2">404 Error Analytics</h1>
          <p className="text-muted-foreground">
            Track and resolve page not found errors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="text-2xl font-bold">{totalErrors}</div>
            <div className="text-sm text-muted-foreground">Total 404 Visits</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold">{unresolvedPaths}</div>
            <div className="text-sm text-muted-foreground">Unresolved Paths</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold">{pathSummaries?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Unique Paths</div>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : pathSummaries && pathSummaries.length > 0 ? (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">404 Paths</h2>
            <div className="space-y-4">
              {pathSummaries.map((summary) => (
                <div
                  key={summary.path}
                  className="flex items-start justify-between border-b pb-4 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {summary.path}
                      </code>
                      <Badge variant={summary.resolved ? "default" : "destructive"}>
                        {summary.count} visit{summary.count !== 1 ? 's' : ''}
                      </Badge>
                      {summary.resolved && (
                        <Badge variant="outline">Resolved</Badge>
                      )}
                      {summary.redirect_created && (
                        <Badge variant="secondary">Redirect Created</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Last seen: {new Date(summary.last_seen).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!summary.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsResolved(summary.path)}
                        disabled={resolvingPath === summary.path}
                      >
                        {resolvingPath === summary.path ? "Resolving..." : "Mark Resolved"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link to={`/redirects?path=${encodeURIComponent(summary.path)}`}>
                        Create Redirect
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No 404 Errors Found</h3>
            <p className="text-muted-foreground">
              No page not found errors have been logged yet.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NotFoundAnalytics;
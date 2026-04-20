import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, CheckCircle2, ArrowRight, ExternalLink, ChevronDown, ChevronUp, Flag, Download } from "lucide-react";
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

// Bot patterns to filter from the display
const BOT_PATTERNS = [
  '/wp-json', '/wp-admin', '/wp-login', '/.env', '/phpMyAdmin',
  '/xmlrpc.php', '/wp-content', '/wp-includes', '/.git',
  '/admin.php', '/config.php', '/setup.php', '/install.php',
];

const isBotPath = (path: string) =>
  BOT_PATTERNS.some(p => path.toLowerCase().includes(p.toLowerCase()));

interface PathSummary {
  path: string;
  count: number;
  last_seen: string;
  resolved: boolean;
  redirect_created: boolean;
  user_reported: boolean;
  referrers: string[];
}

const slugToTitle = (path: string) => {
  return path
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    || "";
};

const exportToCSV = (paths: PathSummary[]) => {
  const header = ["URL", "Slug", "Title", "Hits", "Last Seen", "Status"];
  const rows = paths.map(p => {
    const slug = p.path.split("/").filter(Boolean).pop() || "";
    const title = slugToTitle(p.path);
    const status = p.redirect_created ? "Redirected" : p.resolved ? "Resolved" : "Unresolved";
    return [
      `https://aiinasia.com${p.path}`,
      slug,
      title,
      p.count,
      new Date(p.last_seen).toLocaleDateString("en-GB"),
      status,
    ];
  });

  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `404-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const NotFoundAnalytics = () => {
  const queryClient = useQueryClient();
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [redirectInputs, setRedirectInputs] = useState<Record<string, string>>({});
  const [showBots, setShowBots] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const { data: allPaths, isLoading } = useQuery({
    queryKey: ["404-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_not_found_log")
        .select("path, referrer, created_at, resolved, redirect_created, user_reported")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;

      const summaryMap = new Map<string, PathSummary>();

      data?.forEach((log: any) => {
        const existing = summaryMap.get(log.path);
        if (existing) {
          existing.count++;
          if (new Date(log.created_at) > new Date(existing.last_seen)) {
            existing.last_seen = log.created_at;
          }
          if (log.referrer && !existing.referrers.includes(log.referrer)) {
            existing.referrers.push(log.referrer);
          }
          if (log.user_reported) existing.user_reported = true;
        } else {
          summaryMap.set(log.path, {
            path: log.path,
            count: 1,
            last_seen: log.created_at,
            resolved: log.resolved || false,
            redirect_created: log.redirect_created || false,
            user_reported: log.user_reported || false,
            referrers: log.referrer ? [log.referrer] : [],
          });
        }
      });

      return Array.from(summaryMap.values()).sort((a, b) => b.count - a.count);
    },
  });

  const createRedirectMutation = useMutation({
    mutationFn: async ({ fromPath, toPath }: { fromPath: string; toPath: string }) => {
      // Insert redirect rule
      const { error: redirectError } = await supabase
        .from("redirects")
        .insert({ from_path: fromPath, to_path: toPath, status_code: 301 });
      if (redirectError) throw redirectError;

      // Mark 404 logs as redirect_created
      await supabase
        .from("page_not_found_log")
        .update({ redirect_created: true, resolved: true })
        .eq("path", fromPath);
    },
    onSuccess: (_, { fromPath }) => {
      toast.success("Redirect created");
      setRedirectInputs(prev => ({ ...prev, [fromPath]: "" }));
      setExpandedPath(null);
      queryClient.invalidateQueries({ queryKey: ["404-analytics"] });
    },
    onError: () => toast.error("Failed to create redirect"),
  });

  const markResolvedMutation = useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase
        .from("page_not_found_log")
        .update({ resolved: true })
        .eq("path", path);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as resolved");
      queryClient.invalidateQueries({ queryKey: ["404-analytics"] });
    },
  });

  const botPaths = allPaths?.filter(p => isBotPath(p.path)) || [];
  const realPaths = allPaths?.filter(p => !isBotPath(p.path)) || [];
  const unresolvedReal = realPaths.filter(p => !p.resolved);
  const resolvedReal = realPaths.filter(p => p.resolved);
  const reportedByVisitors = realPaths.filter(p => p.user_reported && !p.resolved);
  const displayPaths = showResolved ? realPaths : unresolvedReal;

  const totalRealHits = unresolvedReal.reduce((s, p) => s + p.count, 0);
  const totalBotHits = botPaths.reduce((s, p) => s + p.count, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>404 Audit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button asChild variant="ghost" className="mb-4">
          <Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back to Admin</Link>
        </Button>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">404 Audit</h1>
            <p className="text-muted-foreground">Broken URLs hitting your site - fix them with one-click redirects.</p>
          </div>
          {allPaths && allPaths.length > 0 && (
            <Button
              variant="outline"
              onClick={() => exportToCSV(realPaths)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="text-2xl font-bold text-destructive">{unresolvedReal.length}</div>
            <div className="text-sm text-muted-foreground">Broken URLs</div>
          </Card>
          <Card className="p-5">
            <div className="text-2xl font-bold">{totalRealHits}</div>
            <div className="text-sm text-muted-foreground">Total Hits</div>
          </Card>
          <Card className="p-5 border-orange-500/30">
            <div className="text-2xl font-bold text-orange-500">{reportedByVisitors.length}</div>
            <div className="text-sm text-muted-foreground">Reported by visitors</div>
          </Card>
          <Card className="p-5">
            <div className="text-2xl font-bold text-muted-foreground">{totalBotHits}</div>
            <div className="text-sm text-muted-foreground">Bot Probes</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <Button
            variant={showResolved ? "default" : "outline"}
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? "Hide resolved" : `Show resolved (${resolvedReal.length})`}
          </Button>
          <Button
            variant={showBots ? "default" : "outline"}
            size="sm"
            onClick={() => setShowBots(!showBots)}
          >
            {showBots ? "Hide bot probes" : `Show bot probes (${botPaths.length})`}
          </Button>
        </div>

        {/* Reported by visitors section */}
        {reportedByVisitors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Flag className="h-4 w-4 text-orange-500" />
              Reported by visitors
              <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-xs">
                Priority
              </Badge>
            </h2>
            <div className="space-y-2">
              {reportedByVisitors.map((summary) => {
                const isExpanded = expandedPath === summary.path;
                const redirectTo = redirectInputs[summary.path] || "";
                return (
                  <Card key={summary.path} className="overflow-hidden border-orange-500/20 bg-orange-500/5">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[400px]">
                              {summary.path}
                            </code>
                            <Badge variant="destructive" className="text-xs shrink-0">
                              {summary.count} {summary.count === 1 ? "hit" : "hits"}
                            </Badge>
                            <Badge className="text-xs bg-orange-500/20 text-orange-600 border-orange-500/30">
                              Visitor reported
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Last hit: {new Date(summary.last_seen).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {summary.referrers.length > 0 && (
                              <span className="ml-3">
                                From: {summary.referrers.slice(0, 2).map(r => {
                                  try { return new URL(r).hostname; } catch { return r; }
                                }).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedPath(isExpanded ? null : summary.path)}
                          >
                            Fix it
                            {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markResolvedMutation.mutate(summary.path)}
                            disabled={markResolvedMutation.isPending}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-sm text-muted-foreground mb-3">Redirect this broken URL to:</p>
                          <div className="flex gap-2 items-center">
                            <code className="text-sm bg-muted px-2 py-1.5 rounded shrink-0 text-muted-foreground">
                              {summary.path}
                            </code>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input
                              placeholder="/the-correct-url"
                              value={redirectTo}
                              onChange={(e) => setRedirectInputs(prev => ({ ...prev, [summary.path]: e.target.value }))}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && redirectTo.trim()) {
                                  createRedirectMutation.mutate({ fromPath: summary.path, toPath: redirectTo.trim() });
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              disabled={!redirectTo.trim() || createRedirectMutation.isPending}
                              onClick={() => createRedirectMutation.mutate({ fromPath: summary.path, toPath: redirectTo.trim() })}
                            >
                              Create redirect
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : displayPaths.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All clear</h3>
            <p className="text-muted-foreground">No unresolved 404 errors.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {displayPaths.map((summary) => {
              const isExpanded = expandedPath === summary.path;
              const redirectTo = redirectInputs[summary.path] || "";

              return (
                <Card key={summary.path} className={`overflow-hidden ${summary.resolved ? "opacity-50" : ""}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[400px]">
                            {summary.path}
                          </code>
                          <Badge variant="destructive" className="text-xs shrink-0">
                            {summary.count} {summary.count === 1 ? "hit" : "hits"}
                          </Badge>
                          {summary.redirect_created && <Badge variant="secondary" className="text-xs">Redirected</Badge>}
                          {summary.resolved && !summary.redirect_created && <Badge variant="outline" className="text-xs">Resolved</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last hit: {new Date(summary.last_seen).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {summary.referrers.length > 0 && (
                            <span className="ml-3">
                              From: {summary.referrers.slice(0, 2).map(r => {
                                try { return new URL(r).hostname; } catch { return r; }
                              }).join(", ")}
                              {summary.referrers.length > 2 && ` +${summary.referrers.length - 2} more`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!summary.resolved && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedPath(isExpanded ? null : summary.path)}
                            >
                              Fix it
                              {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markResolvedMutation.mutate(summary.path)}
                              disabled={markResolvedMutation.isPending}
                            >
                              Dismiss
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <a href={summary.path} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    {/* Inline redirect form */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-3">Create a 301 redirect from this broken URL to:</p>
                        <div className="flex gap-2 items-center">
                          <code className="text-sm bg-muted px-2 py-1.5 rounded shrink-0 text-muted-foreground">
                            {summary.path}
                          </code>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Input
                            placeholder="/the-correct-url"
                            value={redirectTo}
                            onChange={(e) => setRedirectInputs(prev => ({ ...prev, [summary.path]: e.target.value }))}
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && redirectTo.trim()) {
                                createRedirectMutation.mutate({ fromPath: summary.path, toPath: redirectTo.trim() });
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            disabled={!redirectTo.trim() || createRedirectMutation.isPending}
                            onClick={() => createRedirectMutation.mutate({ fromPath: summary.path, toPath: redirectTo.trim() })}
                          >
                            Create redirect
                          </Button>
                        </div>
                        {summary.referrers.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground font-medium mb-1">Incoming from:</p>
                            <div className="space-y-1">
                              {summary.referrers.slice(0, 5).map(r => (
                                <a
                                  key={r}
                                  href={r}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline block truncate"
                                >
                                  {r}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bot probes section */}
        {showBots && botPaths.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Bot Probes (ignore these)</h2>
            <div className="space-y-1">
              {botPaths.map(p => (
                <div key={p.path} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded text-sm">
                  <code className="text-muted-foreground">{p.path}</code>
                  <span className="text-xs text-muted-foreground">{p.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFoundAnalytics;

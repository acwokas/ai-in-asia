import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  AlertTriangle, Target, Zap, Clock, CheckCircle2, 
  XCircle, Search, Copy, ExternalLink, RefreshCw,
  Bug, Eye, EyeOff, Trash2, FileCode, ArrowRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart
} from "recharts";

import { Json } from "@/integrations/supabase/types";

interface ErrorEvent {
  id: string;
  event_name: string;
  event_category: string | null;
  event_data: Json | null;
  page_path: string | null;
  created_at: string;
  session_id: string;
}

interface TrackedError {
  id: string;
  error_signature: string;
  error_message: string;
  error_source: string | null;
  first_seen_at: string;
  last_seen_at: string;
  occurrence_count: number;
  status: 'open' | 'investigating' | 'fixed' | 'ignored';
  resolved_at: string | null;
  notes: string | null;
  affected_pages: string[] | null;
  sample_stack: string | null;
}

interface ErrorTrackingProps {
  eventsData: ErrorEvent[];
  isLoading: boolean;
  dateRange: string;
}

const statusColors: Record<string, string> = {
  open: 'destructive',
  investigating: 'default',
  fixed: 'secondary',
  ignored: 'outline',
};

const statusIcons: Record<string, React.ReactNode> = {
  open: <AlertTriangle className="h-3 w-3" />,
  investigating: <Search className="h-3 w-3" />,
  fixed: <CheckCircle2 className="h-3 w-3" />,
  ignored: <EyeOff className="h-3 w-3" />,
};

export const ErrorTracking = ({ eventsData, isLoading, dateRange }: ErrorTrackingProps) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedError, setSelectedError] = useState<TrackedError | null>(null);
  const [notes, setNotes] = useState("");
  
  // Fetch tracked errors from database
  const { data: trackedErrors, isLoading: trackingLoading } = useQuery({
    queryKey: ["error-tracking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_tracking")
        .select("*")
        .order("last_seen_at", { ascending: false });
      
      if (error) throw error;
      return data as TrackedError[];
    },
  });

  // Process error events
  const errorEvents = useMemo(() => 
    eventsData?.filter(e => e.event_category === 'error') || [], 
    [eventsData]
  );

  // Group errors by signature (message + source combination)
  const groupedErrors = useMemo(() => {
    const groups: Record<string, {
      signature: string;
      message: string;
      source: string;
      count: number;
      pages: Set<string>;
      firstSeen: Date;
      lastSeen: Date;
      sampleStack: string | null;
      events: ErrorEvent[];
    }> = {};

    errorEvents.forEach(event => {
      const data = event.event_data as Record<string, unknown> | null;
      const message = (data?.message as string) || 'Unknown error';
      const source = (data?.source as string) || 'unknown';
      const signature = `${source}::${message.slice(0, 100)}`;
      const eventDate = new Date(event.created_at);

      if (!groups[signature]) {
        groups[signature] = {
          signature,
          message,
          source,
          count: 0,
          pages: new Set(),
          firstSeen: eventDate,
          lastSeen: eventDate,
          sampleStack: (data?.stack as string) || null,
          events: [],
        };
      }

      groups[signature].count++;
      groups[signature].events.push(event);
      if (event.page_path) groups[signature].pages.add(event.page_path);
      if (eventDate < groups[signature].firstSeen) groups[signature].firstSeen = eventDate;
      if (eventDate > groups[signature].lastSeen) groups[signature].lastSeen = eventDate;
    });

    return Object.values(groups).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }, [errorEvents]);

  // Sync errors to tracking table
  const syncMutation = useMutation({
    mutationFn: async () => {
      const upserts = groupedErrors.map(group => ({
        error_signature: group.signature,
        error_message: group.message,
        error_source: group.source,
        first_seen_at: group.firstSeen.toISOString(),
        last_seen_at: group.lastSeen.toISOString(),
        occurrence_count: group.count,
        affected_pages: Array.from(group.pages),
        sample_stack: group.sampleStack?.slice(0, 2000),
      }));

      for (const upsert of upserts) {
        const { data: existing } = await supabase
          .from("error_tracking")
          .select("id, status, occurrence_count")
          .eq("error_signature", upsert.error_signature)
          .single();

        if (existing) {
          // Update if not fixed/ignored
          if (existing.status !== 'fixed' && existing.status !== 'ignored') {
            await supabase
              .from("error_tracking")
              .update({
                last_seen_at: upsert.last_seen_at,
                occurrence_count: upsert.occurrence_count,
                affected_pages: upsert.affected_pages,
              })
              .eq("id", existing.id);
          }
        } else {
          await supabase.from("error_tracking").insert(upsert);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-tracking"] });
      toast({ title: "Errors synced", description: "Error tracking data has been updated." });
    },
  });

  // Update error status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'fixed' || status === 'ignored') {
        updates.resolved_at = new Date().toISOString();
      } else {
        updates.resolved_at = null;
      }
      if (notes !== undefined) updates.notes = notes;

      const { error } = await supabase
        .from("error_tracking")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-tracking"] });
      toast({ title: "Status updated", description: "Error status has been updated." });
    },
  });

  // Delete error from tracking
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("error_tracking")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-tracking"] });
      toast({ title: "Error removed", description: "Error has been removed from tracking." });
    },
  });

  // Filter tracked errors
  const filteredErrors = useMemo(() => {
    return (trackedErrors || []).filter(error => {
      const matchesSearch = searchQuery === "" || 
        error.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.error_source?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || error.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [trackedErrors, searchQuery, statusFilter]);

  // Error stats by source
  const errorsBySource = useMemo(() => {
    const sources: Record<string, number> = {};
    errorEvents.forEach(event => {
      const data = event.event_data as Record<string, unknown> | null;
      const source = (data?.source as string) || 'unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
    return Object.entries(sources)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [errorEvents]);

  // Errors over time
  const errorsOverTime = useMemo(() => {
    const days: Record<string, number> = {};
    errorEvents.forEach(event => {
      const day = format(new Date(event.created_at), 'MMM dd');
      days[day] = (days[day] || 0) + 1;
    });
    return Object.entries(days)
      .map(([date, count]) => ({ date, count }))
      .slice(-14);
  }, [errorEvents]);

  // Copy error details
  const copyErrorDetails = (error: TrackedError) => {
    const details = `Error: ${error.error_message}
Source: ${error.error_source}
First Seen: ${format(new Date(error.first_seen_at), 'PPpp')}
Last Seen: ${format(new Date(error.last_seen_at), 'PPpp')}
Occurrences: ${error.occurrence_count}
Affected Pages: ${error.affected_pages?.join(', ') || 'N/A'}
Stack Trace:
${error.sample_stack || 'No stack trace available'}`;
    
    navigator.clipboard.writeText(details);
    toast({ title: "Copied", description: "Error details copied to clipboard." });
  };

  const openErrors = filteredErrors.filter(e => e.status === 'open').length;
  const investigatingErrors = filteredErrors.filter(e => e.status === 'investigating').length;
  const fixedErrors = filteredErrors.filter(e => e.status === 'fixed').length;

  if (isLoading || trackingLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={errorEvents.length > 0 ? 'border-destructive/50' : 'border-green-500/50'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Bug className={`h-4 w-4 ${errorEvents.length > 0 ? 'text-destructive' : 'text-green-500'}`} />
              <span className="text-sm">Total Errors</span>
            </div>
            <p className={`text-2xl font-bold ${errorEvents.length > 0 ? 'text-destructive' : 'text-green-500'}`}>
              {errorEvents.length}
            </p>
          </CardContent>
        </Card>
        <Card className={openErrors > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm">Open</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{openErrors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Search className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Investigating</span>
            </div>
            <p className="text-2xl font-bold text-yellow-500">{investigatingErrors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Fixed</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{fixedErrors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Error Rate</span>
            </div>
            <p className="text-2xl font-bold">
              {((trackedErrors?.length || 0) > 0 
                ? (openErrors / (trackedErrors?.length || 1) * 100).toFixed(1) 
                : 0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend & Sources Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              Errors Over Time
            </CardTitle>
            <CardDescription>Error frequency trend</CardDescription>
          </CardHeader>
          <CardContent>
            {errorsOverTime.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                <p className="font-medium text-green-500">No errors in this period!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={errorsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Errors by Source
            </CardTitle>
            <CardDescription>Where errors originate</CardDescription>
          </CardHeader>
          <CardContent>
            {errorsBySource.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No error sources.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={errorsBySource}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Error Management
              </CardTitle>
              <CardDescription>Track, investigate, and resolve errors</CardDescription>
            </div>
            <Button 
              onClick={() => syncMutation.mutate()} 
              disabled={syncMutation.isPending}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Errors
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error List */}
          {filteredErrors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold text-lg text-green-600 dark:text-green-400">
                {statusFilter === 'all' ? 'No errors tracked!' : `No ${statusFilter} errors`}
              </p>
              <p className="text-muted-foreground mt-1">
                {statusFilter === 'all' 
                  ? 'Click "Sync Errors" to import errors from analytics.' 
                  : 'Try changing the filter to see other errors.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredErrors.map((error) => (
                <div
                  key={error.id}
                  className={`p-4 rounded-lg border ${
                    error.status === 'open' ? 'border-destructive/30 bg-destructive/5' :
                    error.status === 'investigating' ? 'border-yellow-500/30 bg-yellow-500/5' :
                    error.status === 'fixed' ? 'border-green-500/30 bg-green-500/5' :
                    'border-muted bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={statusColors[error.status] as any} className="gap-1">
                          {statusIcons[error.status]}
                          {error.status}
                        </Badge>
                        <Badge variant="outline">{error.error_source}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {error.occurrence_count} occurrence{error.occurrence_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate">{error.error_message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last seen: {formatDistanceToNow(new Date(error.last_seen_at), { addSuffix: true })}
                        </span>
                        {error.affected_pages && error.affected_pages.length > 0 && (
                          <span className="truncate">
                            Pages: {error.affected_pages.slice(0, 2).join(', ')}
                            {error.affected_pages.length > 2 && ` +${error.affected_pages.length - 2} more`}
                          </span>
                        )}
                      </div>
                      {error.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">Note: {error.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Actions */}
                      <Select
                        value={error.status}
                        onValueChange={(value) => updateStatusMutation.mutate({ id: error.id, status: value })}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="ignored">Ignored</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* View Details Dialog */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedError(error);
                            setNotes(error.notes || "");
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Bug className="h-5 w-5 text-destructive" />
                              Error Details
                            </DialogTitle>
                            <DialogDescription>
                              Full error information and stack trace
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-1">Error Message</h4>
                              <p className="text-sm bg-muted p-3 rounded">{error.error_message}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium mb-1">Source</h4>
                                <Badge variant="outline">{error.error_source}</Badge>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-1">Occurrences</h4>
                                <span className="text-2xl font-bold">{error.occurrence_count}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium mb-1">First Seen</h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(error.first_seen_at), 'PPpp')}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-1">Last Seen</h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(error.last_seen_at), 'PPpp')}
                                </p>
                              </div>
                            </div>
                            {error.affected_pages && error.affected_pages.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Affected Pages</h4>
                                <div className="flex flex-wrap gap-2">
                                  {error.affected_pages.map((page, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {page}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {error.sample_stack && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Stack Trace</h4>
                                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-40">
                                  {error.sample_stack}
                                </pre>
                              </div>
                            )}
                            <div>
                              <h4 className="text-sm font-medium mb-1">Notes</h4>
                              <Textarea
                                placeholder="Add notes about this error..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => copyErrorDetails(error)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Details
                            </Button>
                            <Button
                              onClick={() => {
                                updateStatusMutation.mutate({ id: error.id, status: error.status, notes });
                              }}
                              disabled={updateStatusMutation.isPending}
                            >
                              Save Notes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => copyErrorDetails(error)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Remove this error from tracking?')) {
                            deleteMutation.mutate(error.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Raw Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Error Events</CardTitle>
          <CardDescription>Latest raw error events from analytics</CardDescription>
        </CardHeader>
        <CardContent>
          {errorEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <p className="font-medium text-green-500">No errors recorded!</p>
              <p className="text-muted-foreground text-sm mt-1">Your site is running smoothly.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {errorEvents.slice(0, 20).map((event) => {
                const data = event.event_data as Record<string, unknown> | null;
                return (
                  <div key={event.id} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-destructive truncate">
                          {(data?.message as string) || 'Unknown error'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(data?.source as string) || 'unknown'} • {event.page_path}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(event.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorTracking;

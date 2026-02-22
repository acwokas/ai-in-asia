import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Mail, Calendar, Search, Download, UserMinus, Loader2 } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { toast } from "sonner";

const REASON_LABELS: Record<string, string> = {
  too_frequent: "Too many emails",
  not_relevant: "Content not relevant",
  never_signed_up: "Never signed up",
  switched_job: "Changed jobs/industries",
  other: "Other",
};

export default function SubscribersTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subTab, setSubTab] = useState("overview");

  // Fetch signup stats by source
  const { data: sourceStats, isLoading: loadingStats } = useQuery({
    queryKey: ["newsletter-source-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("signup_source, subscribed_at")
        .is("unsubscribed_at", null);
      if (error) throw error;
      const stats: Record<string, { total: number; last7Days: number; last30Days: number }> = {};
      const now = new Date();
      const sevenDaysAgo = startOfDay(subDays(now, 7));
      const thirtyDaysAgo = startOfDay(subDays(now, 30));
      data?.forEach((sub) => {
        const source = sub.signup_source || "unknown";
        if (!stats[source]) stats[source] = { total: 0, last7Days: 0, last30Days: 0 };
        stats[source].total++;
        const subDate = new Date(sub.subscribed_at);
        if (subDate >= sevenDaysAgo) stats[source].last7Days++;
        if (subDate >= thirtyDaysAgo) stats[source].last30Days++;
      });
      return stats;
    },
  });

  // Fetch recent signups
  const { data: recentSignups, isLoading: loadingRecent } = useQuery({
    queryKey: ["newsletter-recent-signups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("id, email, signup_source, subscribed_at")
        .is("unsubscribed_at", null)
        .order("subscribed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch totals
  const { data: totals } = useQuery({
    queryKey: ["newsletter-totals"],
    queryFn: async () => {
      const { count: activeCount } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true })
        .is("unsubscribed_at", null);
      const { count: unsubCount } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true })
        .not("unsubscribed_at", "is", null);
      return { active: activeCount || 0, unsubscribed: unsubCount || 0 };
    },
  });

  // Fetch unsubscribes
  const { data: unsubscribes, isLoading: loadingUnsubs } = useQuery({
    queryKey: ["admin-unsubscribes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_unsubscribes")
        .select("*")
        .order("unsubscribed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredSignups = recentSignups?.filter(s =>
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUnsubs = unsubscribes?.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.feedback?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const reasonStats = unsubscribes?.reduce((acc, u) => {
    const reason = u.reason || "no_reason";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const sourceLabels: Record<string, string> = {
    inline_article: "Inline Article CTA",
    end_of_content: "End of Content",
    floating_popup: "Floating Popup",
    welcome_popup: "Welcome Popup",
    welcome_popup_account: "Welcome (+ Account)",
    sticky_bar: "Sticky Bar",
    footer: "Footer",
    unknown: "Unknown / Legacy",
  };

  const handleExportCSV = () => {
    const data = subTab === "unsubscribes" ? unsubscribes : recentSignups;
    if (!data || data.length === 0) { toast.error("No data to export"); return; }

    let csvContent: string;
    if (subTab === "unsubscribes") {
      const headers = ["Email", "Reason", "Feedback", "Source", "Date"];
      const rows = (unsubscribes || []).map((u) => [
        u.email, REASON_LABELS[u.reason || ""] || u.reason || "", u.feedback || "", u.source || "",
        format(new Date(u.unsubscribed_at), "yyyy-MM-dd HH:mm"),
      ]);
      csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    } else {
      const headers = ["Email", "Source", "Subscribed At"];
      const rows = (recentSignups || []).map((s) => [
        s.email, s.signup_source || "unknown", format(new Date(s.subscribed_at), "yyyy-MM-dd HH:mm"),
      ]);
      csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${subTab}-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals?.active || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unsubscribed</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-muted-foreground">{totals?.unsubscribed || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{sourceStats ? Object.values(sourceStats).reduce((a, s) => a + s.last7Days, 0) : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              +{sourceStats ? Object.values(sourceStats).reduce((a, s) => a + s.last30Days, 0) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="overview">By Source</TabsTrigger>
          <TabsTrigger value="recent">Recent Signups</TabsTrigger>
          <TabsTrigger value="unsubscribes">Unsubscribes ({unsubscribes?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle className="text-base">Signups by Source</CardTitle></CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">7 Days</TableHead>
                      <TableHead className="text-right">30 Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceStats && Object.entries(sourceStats).sort((a,b) => b[1].total - a[1].total).map(([source, stats]) => (
                      <TableRow key={source}>
                        <TableCell><Badge variant="secondary">{sourceLabels[source] || source}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{stats.total}</TableCell>
                        <TableCell className="text-right text-green-600">+{stats.last7Days}</TableCell>
                        <TableCell className="text-right text-blue-600">+{stats.last30Days}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Signups</CardTitle></CardHeader>
            <CardContent>
              {loadingRecent ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(filteredSignups || []).map(sub => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.email}</TableCell>
                        <TableCell><Badge variant="secondary">{sourceLabels[sub.signup_source || "unknown"] || sub.signup_source || "Unknown"}</Badge></TableCell>
                        <TableCell className="text-right text-muted-foreground">{format(new Date(sub.subscribed_at), "d MMM yyyy, HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unsubscribes">
          {/* Unsubscribe reason stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{unsubscribes?.length || 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Too Frequent</p>
              <p className="text-2xl font-bold">{reasonStats["too_frequent"] || 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Not Relevant</p>
              <p className="text-2xl font-bold">{reasonStats["not_relevant"] || 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Other/No Reason</p>
              <p className="text-2xl font-bold">{(reasonStats["other"] || 0) + (reasonStats["no_reason"] || 0)}</p>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingUnsubs ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filteredUnsubs && filteredUnsubs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="hidden md:table-cell">Feedback</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnsubs.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          {u.reason ? <Badge variant="secondary">{REASON_LABELS[u.reason] || u.reason}</Badge> : <span className="text-muted-foreground text-sm">-</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs truncate">{u.feedback || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell><Badge variant="outline">{u.source || "unknown"}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{format(new Date(u.unsubscribed_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <UserMinus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">{searchTerm ? "No results." : "No unsubscribes yet."}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

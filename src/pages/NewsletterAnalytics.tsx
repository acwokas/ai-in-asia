import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Mail, Calendar } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

const NewsletterAnalytics = () => {
  // Fetch signup stats by source
  const { data: sourceStats, isLoading: loadingStats } = useQuery({
    queryKey: ["newsletter-source-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("signup_source, subscribed_at")
        .is("unsubscribed_at", null);
      
      if (error) throw error;
      
      // Group by source
      const stats: Record<string, { total: number; last7Days: number; last30Days: number }> = {};
      const now = new Date();
      const sevenDaysAgo = startOfDay(subDays(now, 7));
      const thirtyDaysAgo = startOfDay(subDays(now, 30));
      
      data?.forEach((sub) => {
        const source = sub.signup_source || "unknown";
        if (!stats[source]) {
          stats[source] = { total: 0, last7Days: 0, last30Days: 0 };
        }
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
      
      return {
        active: activeCount || 0,
        unsubscribed: unsubCount || 0,
      };
    },
  });

  const sourceLabels: Record<string, string> = {
    inline_article: "Inline Article CTA",
    end_of_content: "End of Content",
    floating_popup: "Floating Popup",
    welcome_popup: "Welcome Popup",
    welcome_popup_account: "Welcome Popup (+ Account)",
    sticky_bar: "Sticky Bar",
    footer: "Footer",
    unknown: "Unknown / Legacy",
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      inline_article: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
      end_of_content: "bg-green-500/20 text-green-700 dark:text-green-300",
      floating_popup: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
      welcome_popup: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
      welcome_popup_account: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
      sticky_bar: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
      footer: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
      unknown: "bg-muted text-muted-foreground",
    };
    return colors[source] || colors.unknown;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Newsletter Analytics</h1>
          <p className="text-muted-foreground">Track where your newsletter signups are coming from</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals?.active || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unsubscribed</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{totals?.unsubscribed || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{sourceStats ? Object.values(sourceStats).reduce((acc, s) => acc + s.last7Days, 0) : 0}
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
                +{sourceStats ? Object.values(sourceStats).reduce((acc, s) => acc + s.last30Days, 0) : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Signups by Source */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Signups by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Last 7 Days</TableHead>
                    <TableHead className="text-right">Last 30 Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceStats && Object.entries(sourceStats)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([source, stats]) => (
                      <TableRow key={source}>
                        <TableCell>
                          <Badge className={getSourceColor(source)}>
                            {sourceLabels[source] || source}
                          </Badge>
                        </TableCell>
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

        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Signed Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSignups?.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.email}</TableCell>
                      <TableCell>
                        <Badge className={getSourceColor(sub.signup_source || "unknown")}>
                          {sourceLabels[sub.signup_source || "unknown"] || sub.signup_source || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {format(new Date(sub.subscribed_at), "d MMM yyyy, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default NewsletterAnalytics;

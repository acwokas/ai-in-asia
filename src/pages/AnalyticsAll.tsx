import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Activity, Users, Zap, BookCheck, Mail, Newspaper,
  UserPlus, UserCheck, Trophy, Route, Globe,
  ChevronDown, BarChart3, Share2, DollarSign, Search,
} from "lucide-react";
import { subDays, startOfDay } from "date-fns";
import {
  CompletionsSection,
  NewUsersSection,
  ReturningUsersSection,
  ContentRankingsSection,
  NavigationSection,
  CTANewsletterSection,
  BriefingSection,
  AudienceSection,
  SocialMediaSection,
  MonetizationSection,
  SEOPerformanceSection,
} from "@/components/analytics-hub";

type DateRange = "7d" | "30d" | "90d";

const AnalyticsAll = () => {
  const [range, setRange] = useState<DateRange>("30d");

  const startDate = useMemo(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    return startOfDay(subDays(new Date(), days)).toISOString();
  }, [range]);

  // Quick Stats
  const { data: quickStats, isLoading: statsLoading } = useQuery({
    queryKey: ["analytics-hub-stats", range],
    queryFn: async () => {
      const now = new Date();
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

      // Use individual try/catch per query so one failure doesn't zero everything
      let totalSessions = 0;
      let uniqueVisitors = 0;
      let completions = 0;
      let subscribers = 0;
      let avgEngagement = 0;
      let activeNow = 0;

      // Total Sessions — paginated count to avoid RLS/count issues
      try {
        let sessionCount = 0;
        let from = 0;
        while (true) {
          const { data: batch } = await supabase
            .from("analytics_sessions")
            .select("id")
            .gte("started_at", startDate)
            .range(from, from + 999);
          const safe = batch ?? [];
          sessionCount += safe.length;
          if (safe.length < 1000) break;
          from += 1000;
        }
        totalSessions = sessionCount;
      } catch (_e) { /* keep 0 */ }

      // Unique Visitors via RPC
      try {
        const { data } = await supabase.rpc("get_unique_visitors", {
          p_start: startDate,
          p_end: now.toISOString(),
        });
        uniqueVisitors = data ?? 0;
      } catch (_e) { /* keep 0 */ }

      // Completions
      try {
        const { count } = await supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("event_name", "article_complete")
          .gte("created_at", startDate);
        completions = count ?? 0;
      } catch (_e) { /* keep 0 */ }

      // Subscribers
      try {
        const { count } = await supabase
          .from("newsletter_subscribers")
          .select("*", { count: "exact", head: true })
          .eq("confirmed", true)
          .is("unsubscribed_at", null);
        subscribers = count ?? 0;
      } catch (_e) { /* keep 0 */ }

      // Avg engagement (paginated)
      try {
        const rows: any[] = [];
        let from = 0;
        while (true) {
          const { data: batch } = await supabase
            .from("analytics_sessions")
            .select("duration_seconds")
            .gte("started_at", startDate)
            .eq("is_bounce", false)
            .gt("duration_seconds", 0)
            .range(from, from + 999);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < 1000) break;
          from += 1000;
        }
        const MAX_ENGAGEMENT_CAP = 1800;
        avgEngagement = rows.length > 0
          ? Math.round(rows.reduce((sum: number, s: any) => sum + Math.min(s.duration_seconds ?? 0, MAX_ENGAGEMENT_CAP), 0) / rows.length)
          : 0;
      } catch (_e) { /* keep 0 */ }

      // Active now
      try {
        const { count } = await supabase
          .from("analytics_sessions")
          .select("*", { count: "exact", head: true })
          .gte("started_at", fifteenMinAgo);
        activeNow = count ?? 0;
      } catch (_e) { /* keep 0 */ }

      return { totalSessions, uniqueVisitors, avgEngagement, completions, subscribers, activeNow };
    },
  });

  const statCards = [
    { label: "Total Sessions", value: quickStats?.totalSessions ?? 0, icon: Activity, color: "text-blue-500" },
    { label: "Unique Visitors", value: quickStats?.uniqueVisitors ?? 0, icon: Users, color: "text-green-500" },
    { label: "Avg Engagement (s)", value: quickStats?.avgEngagement ?? 0, icon: Zap, color: "text-yellow-500" },
    { label: "Article Completions", value: quickStats?.completions ?? 0, icon: BookCheck, color: "text-purple-500" },
    { label: "Newsletter Subscribers", value: quickStats?.subscribers ?? 0, icon: Mail, color: "text-pink-500" },
    { label: "Active Now", value: quickStats?.activeNow ?? 0, icon: BarChart3, color: "text-cyan-500" },
  ];

  const sections: { id: string; title: string; icon: React.ElementType; color: string; component: React.ReactNode }[] = [
    { id: "completions", title: "Article & Guide Completions", icon: BookCheck, color: "text-purple-500", component: <CompletionsSection startDate={startDate} range={range} /> },
    { id: "new-users", title: "New Users & Real-time", icon: UserPlus, color: "text-green-500", component: <NewUsersSection startDate={startDate} range={range} /> },
    { id: "returning", title: "Returning Users & Stickiness", icon: UserCheck, color: "text-blue-500", component: <ReturningUsersSection startDate={startDate} range={range} /> },
    { id: "audience", title: "Audience & Acquisition", icon: Globe, color: "text-teal-500", component: <AudienceSection startDate={startDate} range={range} /> },
    { id: "social", title: "Social Media Performance", icon: Share2, color: "text-sky-500", component: <SocialMediaSection startDate={startDate} range={range} /> },
    { id: "monetization", title: "Monetization / AdSense", icon: DollarSign, color: "text-emerald-500", component: <MonetizationSection startDate={startDate} range={range} /> },
    { id: "seo", title: "SEO / Search Performance", icon: Search, color: "text-indigo-500", component: <SEOPerformanceSection startDate={startDate} range={range} /> },
    { id: "rankings", title: "Content Rankings", icon: Trophy, color: "text-yellow-500", component: <ContentRankingsSection startDate={startDate} range={range} /> },
    { id: "navigation", title: "Navigation & User Flows", icon: Route, color: "text-orange-500", component: <NavigationSection startDate={startDate} range={range} /> },
    { id: "cta", title: "CTA & Newsletter", icon: Mail, color: "text-pink-500", component: <CTANewsletterSection startDate={startDate} range={range} /> },
    { id: "briefing", title: "3 Before 9 Performance", icon: Newspaper, color: "text-cyan-500", component: <BriefingSection startDate={startDate} range={range} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Hub</h1>
          <p className="text-muted-foreground mt-1">Unified view of all site analytics</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(["7d", "30d", "90d"] as DateRange[]).map((r) => (
            <Button key={r} variant={range === r ? "default" : "ghost"} size="sm" onClick={() => setRange(r)} className="text-xs px-3">
              {r}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              {statsLoading ? (
                <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-16" /></div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground truncate">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{typeof stat.value === "number" ? (stat.value ?? 0).toLocaleString() : stat.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <CollapsibleSection key={section.id} title={section.title} icon={section.icon} iconColor={section.color}>
            {section.component}
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
};

const CollapsibleSection = ({ title, icon: Icon, iconColor, children }: { title: string; icon: React.ElementType; iconColor: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${iconColor}`} />
                {title}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default AnalyticsAll;

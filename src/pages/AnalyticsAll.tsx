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
  ChevronDown, Share2, DollarSign, Search,
} from "lucide-react";
import { subDays, startOfDay } from "date-fns";
import { useAnalyticsSessionStats } from "@/hooks/useAnalyticsSessionStats";
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

  // Shared session stats — single source of truth
  const { data: sessionStats, isLoading: sessionStatsLoading } = useAnalyticsSessionStats(startDate, range);

  // Additional quick stats
  const { data: quickStats, isLoading: extraStatsLoading } = useQuery({
    queryKey: ["analytics-hub-extra-stats", range],
    queryFn: async () => {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const [completionsRes, subscribersRes, activeNowRes] = await Promise.all([
        supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "article_complete").gte("created_at", startDate),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("confirmed", true).is("unsubscribed_at", null),
        supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).gte("started_at", fifteenMinAgo),
      ]);
      return {
        completions: completionsRes.count ?? 0,
        subscribers: subscribersRes.count ?? 0,
        activeNow: activeNowRes.count ?? 0,
      };
    },
  });

  const statsLoading = sessionStatsLoading || extraStatsLoading;
  const totalSessions = sessionStats?.totalSessions ?? 0;
  const uniqueVisitors = sessionStats?.uniqueVisitors ?? 0;

  const statCards = [
    { label: "Total Sessions", value: totalSessions, icon: Activity, color: "text-blue-500" },
    { label: "Unique Visitors", value: uniqueVisitors, icon: Users, color: "text-green-500" },
    { label: "Article Completions", value: quickStats?.completions ?? 0, icon: BookCheck, color: "text-purple-500" },
    { label: "Newsletter Subscribers", value: quickStats?.subscribers ?? 0, icon: Mail, color: "text-pink-500" },
    { label: "Active Now", value: quickStats?.activeNow ?? 0, icon: Zap, color: "text-cyan-500" },
  ];

  const sections: { id: string; title: string; icon: React.ElementType; color: string; component: React.ReactNode }[] = [
    { id: "completions", title: "Article & Guide Completions", icon: BookCheck, color: "text-purple-500", component: <CompletionsSection startDate={startDate} range={range} /> },
    { id: "new-users", title: "New Users & Real-time", icon: UserPlus, color: "text-green-500", component: <NewUsersSection startDate={startDate} range={range} totalSessions={totalSessions} /> },
    { id: "returning", title: "Returning Users & Stickiness", icon: UserCheck, color: "text-blue-500", component: <ReturningUsersSection startDate={startDate} range={range} totalSessions={totalSessions} uniqueVisitors={uniqueVisitors} /> },
    { id: "audience", title: "Audience & Acquisition", icon: Globe, color: "text-teal-500", component: <AudienceSection startDate={startDate} range={range} totalSessions={totalSessions} /> },
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Activity, Users, Zap, BookCheck, Mail, Newspaper,
  UserPlus, UserCheck, Trophy, Route,
  ChevronDown, BarChart3,
} from "lucide-react";
import { subDays, startOfDay } from "date-fns";

type DateRange = "7d" | "30d" | "90d";

const dateRangeLabel: Record<DateRange, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

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
      const [sessionsRes, eventsRes, subscribersRes] = await Promise.all([
        supabase
          .from("analytics_sessions")
          .select("session_id, user_id, duration_seconds, is_bounce")
          .gte("started_at", startDate),
        supabase
          .from("analytics_events")
          .select("event_name")
          .gte("created_at", startDate),
        supabase
          .from("newsletter_subscribers")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      const sessions = sessionsRes.data || [];
      const events = eventsRes.data || [];
      const uniqueVisitors = new Set(sessions.map(s => s.user_id || s.session_id)).size;
      const completions = events.filter(e => e.event_name === "article_read_complete").length;

      // Avg engagement: approximate from non-bounce sessions with duration
      const engagedSessions = sessions.filter(s => !s.is_bounce && s.duration_seconds && s.duration_seconds > 0);
      const avgEngagement = engagedSessions.length > 0
        ? Math.round(engagedSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / engagedSessions.length)
        : 0;

      return {
        totalSessions: sessions.length,
        uniqueVisitors,
        avgEngagement,
        completions,
        subscribers: subscribersRes.count || 0,
        activeNow: sessions.filter(s => {
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          return s.duration_seconds === null && (sessionsRes.data || []).length > 0;
        }).length,
      };
    },
  });

  const statCards = [
    { label: "Total Sessions", value: quickStats?.totalSessions ?? 0, icon: Activity, color: "text-blue-500" },
    { label: "Unique Visitors", value: quickStats?.uniqueVisitors ?? 0, icon: Users, color: "text-green-500" },
    { label: "Avg Engagement (s)", value: quickStats?.avgEngagement ?? 0, icon: Zap, color: "text-yellow-500" },
    { label: "Article Completions", value: quickStats?.completions ?? 0, icon: BookCheck, color: "text-purple-500" },
    { label: "Newsletter Subscribers", value: quickStats?.subscribers ?? 0, icon: Mail, color: "text-pink-500" },
    { label: "Active Now", value: "—", icon: BarChart3, color: "text-cyan-500" },
  ];

  const sections = [
    { id: "completions", title: "Article & Guide Completions", icon: BookCheck, color: "text-purple-500" },
    { id: "new-users", title: "New Users & Real-time", icon: UserPlus, color: "text-green-500" },
    { id: "returning", title: "Returning Users & Stickiness", icon: UserCheck, color: "text-blue-500" },
    { id: "rankings", title: "Content Rankings", icon: Trophy, color: "text-yellow-500" },
    { id: "navigation", title: "Navigation & User Flows", icon: Route, color: "text-orange-500" },
    { id: "cta", title: "CTA & Newsletter", icon: Mail, color: "text-pink-500" },
    { id: "briefing", title: "3 Before 9 Performance", icon: Newspaper, color: "text-cyan-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Hub</h1>
          <p className="text-muted-foreground mt-1">Unified view of all site analytics</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(["7d", "30d", "90d"] as DateRange[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "ghost"}
              size="sm"
              onClick={() => setRange(r)}
              className="text-xs px-3"
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground truncate">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.id}
            title={section.title}
            icon={section.icon}
            iconColor={section.color}
            range={range}
            startDate={startDate}
            sectionId={section.id}
          />
        ))}
      </div>
    </div>
  );
};

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  range: DateRange;
  startDate: string;
  sectionId: string;
}

const CollapsibleSection = ({ title, icon: Icon, iconColor, range, startDate, sectionId }: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(true);

  // Each section has its own independent query — placeholder for now
  const { isLoading } = useQuery({
    queryKey: ["analytics-hub-section", sectionId, range],
    queryFn: async () => {
      // Placeholder: return empty data — will be filled in follow-up prompts
      return { ready: false };
    },
    staleTime: 5 * 60 * 1000,
  });

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
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border border-dashed rounded-lg">
                Content for "{title}" will be added in follow-up prompts
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default AnalyticsAll;

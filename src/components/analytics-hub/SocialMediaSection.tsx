import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { InsightCard } from "./InsightCard";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { Progress } from "@/components/ui/progress";
import { Info } from "lucide-react";

interface Props {
  startDate: string;
  range: string;
}

const PLATFORM_MAP: Record<string, string> = {
  twitter: "Twitter/X",
  x: "Twitter/X",
  "t.co": "Twitter/X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  fb: "Facebook",
  instagram: "Instagram",
  ig: "Instagram",
  reddit: "Reddit",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const SOCIAL_REFERRERS: Record<string, string> = {
  "t.co": "Twitter/X",
  "twitter.com": "Twitter/X",
  "x.com": "Twitter/X",
  "linkedin.com": "LinkedIn",
  "facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "reddit.com": "Reddit",
  "youtube.com": "YouTube",
  "tiktok.com": "TikTok",
};

const PLATFORM_COLORS: Record<string, string> = {
  "Twitter/X": "hsl(200 90% 50%)",
  LinkedIn: "hsl(210 80% 45%)",
  Facebook: "hsl(220 70% 50%)",
  Instagram: "hsl(330 70% 55%)",
  Reddit: "hsl(16 100% 50%)",
  YouTube: "hsl(0 80% 50%)",
  TikTok: "hsl(170 70% 45%)",
  Other: "hsl(var(--muted-foreground))",
};

async function fetchAllSessions(startDate: string) {
  const rows: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("analytics_sessions")
      .select("utm_source,utm_medium,utm_campaign,referrer_domain,duration_seconds,is_bounce,page_count")
      .gte("started_at", startDate)
      .range(from, from + 999);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return rows;
}

export const SocialMediaSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-social-media", range],
    queryFn: async () => {
      const sessions = await fetchAllSessions(startDate);

      // Identify social sessions: either utm_source matches OR referrer_domain matches
      const socialSessions: { platform: string; campaign: string | null; duration: number; isBounce: boolean; pageCount: number }[] = [];
      let directSessions = 0;

      for (const s of sessions) {
        const src = (s.utm_source || "").toLowerCase();
        const ref = (s.referrer_domain || "").toLowerCase();

        // Check UTM source first
        let platform: string | null = null;
        for (const [key, name] of Object.entries(PLATFORM_MAP)) {
          if (src.includes(key)) { platform = name; break; }
        }
        // Fallback to referrer domain
        if (!platform) {
          for (const [domain, name] of Object.entries(SOCIAL_REFERRERS)) {
            if (ref.includes(domain)) { platform = name; break; }
          }
        }

        if (platform) {
          socialSessions.push({
            platform,
            campaign: s.utm_campaign || null,
            duration: s.duration_seconds ?? 0,
            isBounce: s.is_bounce ?? true,
            pageCount: s.page_count ?? 1,
          });
        } else if (!ref || ref === "direct") {
          directSessions++;
        }
      }

      // Platform breakdown
      const platformCounts: Record<string, { sessions: number; totalDuration: number; bounces: number; totalPages: number }> = {};
      for (const s of socialSessions) {
        if (!platformCounts[s.platform]) platformCounts[s.platform] = { sessions: 0, totalDuration: 0, bounces: 0, totalPages: 0 };
        platformCounts[s.platform].sessions++;
        platformCounts[s.platform].totalDuration += s.duration;
        platformCounts[s.platform].bounces += s.isBounce ? 1 : 0;
        platformCounts[s.platform].totalPages += s.pageCount;
      }

      const totalSocial = socialSessions.length;
      const platforms = Object.entries(platformCounts)
        .map(([name, d]) => ({
          name,
          sessions: d.sessions,
          pct: totalSocial > 0 ? Math.round((d.sessions / totalSocial) * 100) : 0,
          avgDuration: d.sessions > 0 ? Math.round(d.totalDuration / d.sessions) : 0,
          bounceRate: d.sessions > 0 ? Math.round((d.bounces / d.sessions) * 100) : 0,
          pagesPerSession: d.sessions > 0 ? (d.totalPages / d.sessions).toFixed(1) : "0",
        }))
        .sort((a, b) => b.sessions - a.sessions);

      // Campaign breakdown
      const campaignCounts: Record<string, number> = {};
      for (const s of socialSessions) {
        if (s.campaign) campaignCounts[s.campaign] = (campaignCounts[s.campaign] || 0) + 1;
      }
      const topCampaigns = Object.entries(campaignCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Social vs direct engagement
      const socialAvgDuration = totalSocial > 0
        ? Math.round(socialSessions.reduce((s, x) => s + x.duration, 0) / totalSocial)
        : 0;
      const socialBounceRate = totalSocial > 0
        ? Math.round((socialSessions.filter(x => x.isBounce).length / totalSocial) * 100)
        : 0;

      return {
        totalSessions: sessions.length,
        totalSocial,
        directSessions,
        platforms,
        topCampaigns,
        socialAvgDuration,
        socialBounceRate,
      };
    },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;
  if (!data) return <EmptyDataNotice message="Unable to load social media data." />;

  const d = data;
  const socialPct = d.totalSessions > 0 ? ((d.totalSocial / d.totalSessions) * 100).toFixed(1) : "0";

  const chartConfig: Record<string, { label: string; color: string }> = {};
  d.platforms.forEach((p) => {
    chartConfig[p.name] = { label: p.name, color: PLATFORM_COLORS[p.name] || PLATFORM_COLORS.Other };
  });

  const chartData = d.platforms.map((p) => ({
    name: p.name,
    sessions: p.sessions,
    fill: PLATFORM_COLORS[p.name] || PLATFORM_COLORS.Other,
  }));

  // Build insights
  const tips: string[] = [];
  if (d.totalSocial === 0) {
    tips.push("1. No social media traffic detected yet. Ensure UTM parameters are added to all social posts (e.g., ?utm_source=linkedin&utm_medium=social&utm_campaign=guide-launch).");
    tips.push("2. If you're posting via Publer, configure default UTM templates per platform to automate tracking.");
  } else {
    const topPlatform = d.platforms[0];
    if (topPlatform) {
      tips.push(`1. ${topPlatform.name} drives ${topPlatform.pct}% of social traffic (${topPlatform.sessions} sessions). ${topPlatform.bounceRate > 60 ? `Bounce rate is ${topPlatform.bounceRate}% — consider creating platform-specific landing pages with clearer CTAs.` : `Engagement is solid (${topPlatform.avgDuration}s avg duration). Double down on this channel.`}`);
    }
    const weakPlatforms = d.platforms.filter(p => p.sessions < 5);
    if (weakPlatforms.length > 0) {
      tips.push(`2. ${weakPlatforms.map(p => p.name).join(", ")} ${weakPlatforms.length === 1 ? "has" : "have"} fewer than 5 sessions each. Either invest in these channels with tailored content or reallocate effort to top performers.`);
    }
    if (parseFloat(socialPct) < 10) {
      tips.push(`3. Social traffic is only ${socialPct}% of total sessions. Industry benchmark for content sites is 15-25%. Increase posting frequency and experiment with different content formats per platform.`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Social Sessions</p>
          <p className="text-2xl font-bold">{d.totalSocial.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{socialPct}% of total</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Platforms Active</p>
          <p className="text-2xl font-bold">{d.platforms.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Social Avg Duration</p>
          <p className="text-2xl font-bold">{d.socialAvgDuration}s</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Social Bounce Rate</p>
          <p className="text-2xl font-bold">{d.socialBounceRate}%</p>
        </div>
      </div>

      {d.totalSocial === 0 ? (
        <EmptyDataNotice message="No social media sessions tracked yet. Add UTM parameters to social posts to see data here." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Platform breakdown chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Sessions by Platform</h4>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sessions" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Platform table */}
          <div>
            <h4 className="text-sm font-medium mb-3">Platform Breakdown</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                  <TableHead className="text-right">Bounce %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.platforms.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.sessions}</TableCell>
                    <TableCell className="text-right">{p.avgDuration}s</TableCell>
                    <TableCell className="text-right">{p.bounceRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Top campaigns */}
      {d.topCampaigns.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Top UTM Campaigns</h4>
          <div className="space-y-2">
            {d.topCampaigns.slice(0, 5).map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-sm truncate flex-1 min-w-0">{c.name}</span>
                <Progress value={(c.count / d.topCampaigns[0].count) * 100} className="w-32 h-2" />
                <Badge variant="secondary" className="text-xs">{c.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Future enhancement note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>Connect Publer API for scheduled post analytics and automated UTM tracking.</span>
      </div>

      <InsightCard insights={tips} variant="action" />
    </div>
  );
};

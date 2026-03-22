import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { InsightCard } from "./InsightCard";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Info, RefreshCw, Heart, MessageCircle, Share2,
  Eye, MousePointer, AlertCircle,
} from "lucide-react";
import { subDays } from "date-fns";
import { useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */

interface Props {
  startDate: string;
  range: string;
}

const PLATFORM_MAP: Record<string, string> = {
  twitter: "Twitter/X", x: "Twitter/X", "t.co": "Twitter/X",
  linkedin: "LinkedIn", facebook: "Facebook", fb: "Facebook",
  instagram: "Instagram", ig: "Instagram", reddit: "Reddit",
  youtube: "YouTube", tiktok: "TikTok",
};

const SOCIAL_REFERRERS: Record<string, string> = {
  "t.co": "Twitter/X", "twitter.com": "Twitter/X", "x.com": "Twitter/X",
  "linkedin.com": "LinkedIn", "facebook.com": "Facebook",
  "instagram.com": "Instagram", "reddit.com": "Reddit",
  "youtube.com": "YouTube", "tiktok.com": "TikTok",
};

const PLATFORM_COLORS: Record<string, string> = {
  "Twitter/X": "hsl(200 90% 50%)", LinkedIn: "hsl(210 80% 45%)",
  Facebook: "hsl(220 70% 50%)", Instagram: "hsl(330 70% 55%)",
  Reddit: "hsl(16 100% 50%)", YouTube: "hsl(0 80% 50%)",
  TikTok: "hsl(170 70% 45%)", Other: "hsl(var(--muted-foreground))",
};

const PUBLER_LABEL: Record<string, string> = {
  facebook: "Facebook", twitter: "Twitter/X", linkedin: "LinkedIn",
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
};

/* ------------------------------------------------------------------ */
/*  Publer types                                                        */
/* ------------------------------------------------------------------ */

interface PublerPost {
  id?: string;
  text?: string;
  title?: string;
  state?: string;
  status?: string;
  platform?: string;
  account_id?: string;
  scheduled_at?: string;
  published_at?: string;
  likes?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  reposts?: number;
  retweets?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  link_clicks?: number;
  engagement?: number;
  total_engagement?: number;
}

interface PublerAccount {
  id: string;
  name?: string;
  username?: string;
  platform?: string;
  type?: string;
  avatar?: string;
  picture?: string;
}

interface PublerSummary {
  accounts: PublerAccount[];
  posts: PublerPost[];
  platformBreakdown: {
    platform: string;
    label: string;
    scheduled: number;
    published: number;
    total: number;
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    clicks: number;
  }[];
  totals: {
    scheduled: number;
    published: number;
    total: number;
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    clicks: number;
  };
  topPosts: {
    text: string;
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    engagement: number;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Data helpers                                                        */
/* ------------------------------------------------------------------ */

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

/** Call the publer-proxy edge function (falls back to direct VITE_ key for testing). */
async function callPublerProxy(endpoint: string, params?: Record<string, string>): Promise<any> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (token) {
    // Preferred: go through edge function (API key stays server-side)
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const qs = new URLSearchParams({ endpoint, ...(params || {}) }).toString();
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/publer-proxy?${qs}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`publer-proxy ${res.status}: ${body}`);
    }
    return res.json();
  }

  // Fallback: direct call with VITE_ key (dev/testing only)
  const directKey = import.meta.env.VITE_PUBLER_API_KEY;
  if (!directKey) throw new Error("Not signed in and no VITE_PUBLER_API_KEY configured");

  const qs = new URLSearchParams(params || {}).toString();
  const res = await fetch(
    `https://app.publer.io/api/v1/${endpoint}${qs ? "?" + qs : ""}`,
    {
      headers: {
        "Authorization": `Bearer-API ${directKey}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) throw new Error(`Publer direct ${res.status}`);
  return res.json();
}

function normalisePlatform(acct: PublerAccount): string {
  return (acct.platform || acct.type || "unknown").toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export const SocialMediaSection = ({ startDate, range }: Props) => {
  /* ── Referral analytics (existing) ── */
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-social-media", range],
    queryFn: async () => {
      const sessions = await fetchAllSessions(startDate);
      const socialSessions: { platform: string; campaign: string | null; duration: number; isBounce: boolean; pageCount: number }[] = [];
      let directSessions = 0;

      for (const s of sessions) {
        const src = (s.utm_source || "").toLowerCase();
        const ref = (s.referrer_domain || "").toLowerCase();
        let platform: string | null = null;
        for (const [key, name] of Object.entries(PLATFORM_MAP)) {
          if (src.includes(key)) { platform = name; break; }
        }
        if (!platform) {
          for (const [domain, name] of Object.entries(SOCIAL_REFERRERS)) {
            if (ref.includes(domain)) { platform = name; break; }
          }
        }
        if (platform) {
          socialSessions.push({ platform, campaign: s.utm_campaign || null, duration: s.duration_seconds ?? 0, isBounce: s.is_bounce ?? true, pageCount: s.page_count ?? 1 });
        } else if (!ref || ref === "direct") {
          directSessions++;
        }
      }

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
          name, sessions: d.sessions,
          pct: totalSocial > 0 ? Math.round((d.sessions / totalSocial) * 100) : 0,
          avgDuration: d.sessions > 0 ? Math.round(d.totalDuration / d.sessions) : 0,
          bounceRate: d.sessions > 0 ? Math.round((d.bounces / d.sessions) * 100) : 0,
          pagesPerSession: d.sessions > 0 ? (d.totalPages / d.sessions).toFixed(1) : "0",
        }))
        .sort((a, b) => b.sessions - a.sessions);

      const campaignCounts: Record<string, number> = {};
      for (const s of socialSessions) {
        if (s.campaign) campaignCounts[s.campaign] = (campaignCounts[s.campaign] || 0) + 1;
      }
      const topCampaigns = Object.entries(campaignCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const socialAvgDuration = totalSocial > 0 ? Math.round(socialSessions.reduce((s, x) => s + x.duration, 0) / totalSocial) : 0;
      const socialBounceRate = totalSocial > 0 ? Math.round((socialSessions.filter(x => x.isBounce).length / totalSocial) * 100) : 0;

      return { totalSessions: sessions.length, totalSocial, directSessions, platforms, topCampaigns, socialAvgDuration, socialBounceRate };
    },
  });

  /* ── Publer API data ── */
  const {
    data: publer,
    isLoading: publerLoading,
    error: publerError,
    refetch: refetchPubler,
  } = useQuery<PublerSummary | null>({
    queryKey: ["publer-posts", range],
    queryFn: async () => {
      // 1) Fetch accounts
      const accountsRaw = await callPublerProxy("accounts");
      const accounts: PublerAccount[] = Array.isArray(accountsRaw) ? accountsRaw : accountsRaw?.accounts || [];

      // 2) Fetch posts (published + scheduled)
      const [publishedRaw, scheduledRaw] = await Promise.all([
        callPublerProxy("posts", { state: "published", per_page: "100" }),
        callPublerProxy("posts", { state: "scheduled", per_page: "100" }),
      ]);
      const published: PublerPost[] = Array.isArray(publishedRaw) ? publishedRaw : publishedRaw?.posts || [];
      const scheduled: PublerPost[] = Array.isArray(scheduledRaw) ? scheduledRaw : scheduledRaw?.posts || [];
      const allPosts = [...published.map(p => ({ ...p, _state: "published" as const })), ...scheduled.map(p => ({ ...p, _state: "scheduled" as const }))];

      // Build account→platform map
      const acctPlatform: Record<string, string> = {};
      for (const a of accounts) acctPlatform[a.id] = normalisePlatform(a);

      // 3) Per-platform aggregation
      const byPlatform: Record<string, {
        scheduled: number; published: number; likes: number; comments: number;
        shares: number; impressions: number; clicks: number;
      }> = {};

      for (const p of allPosts) {
        const plat = p.platform || acctPlatform[p.account_id || ""] || "unknown";
        if (!byPlatform[plat]) byPlatform[plat] = { scheduled: 0, published: 0, likes: 0, comments: 0, shares: 0, impressions: 0, clicks: 0 };
        const b = byPlatform[plat];
        if ((p as any)._state === "scheduled") b.scheduled++;
        else b.published++;
        b.likes += Number(p.likes || p.reactions) || 0;
        // Publer returns comments as an array of objects, not a number
        b.comments += (typeof p.comments === "number" ? p.comments : Array.isArray(p.comments) ? (p.comments as any[]).length : 0);
        b.shares += Number(p.shares || p.reposts || p.retweets) || 0;
        b.impressions += Number(p.impressions) || 0;
        b.clicks += Number(p.clicks || p.link_clicks) || 0;
      }

      const platformBreakdown = Object.entries(byPlatform)
        .map(([platform, v]) => ({
          platform,
          label: PUBLER_LABEL[platform] || platform,
          scheduled: v.scheduled,
          published: v.published,
          total: v.scheduled + v.published,
          ...v,
        }))
        .sort((a, b) => b.total - a.total);

      const totals = platformBreakdown.reduce(
        (acc, p) => ({
          scheduled: acc.scheduled + p.scheduled,
          published: acc.published + p.published,
          total: acc.total + p.total,
          likes: acc.likes + p.likes,
          comments: acc.comments + p.comments,
          shares: acc.shares + p.shares,
          impressions: acc.impressions + p.impressions,
          clicks: acc.clicks + p.clicks,
        }),
        { scheduled: 0, published: 0, total: 0, likes: 0, comments: 0, shares: 0, impressions: 0, clicks: 0 },
      );

      // 4) Top posts by engagement
      const topPosts = [...published]
        .sort((a, b) => ((b.engagement || b.total_engagement || (b.likes || 0) + (b.comments || 0) + (b.shares || 0)) -
                         (a.engagement || a.total_engagement || (a.likes || 0) + (a.comments || 0) + (a.shares || 0))))
        .slice(0, 5)
        .map(p => ({
          text: (p.text || p.title || "").substring(0, 120),
          platform: p.platform || acctPlatform[p.account_id || ""] || "unknown",
          likes: p.likes || p.reactions || 0,
          comments: p.comments || 0,
          shares: p.shares || p.reposts || p.retweets || 0,
          impressions: p.impressions || 0,
          engagement: p.engagement || p.total_engagement || ((p.likes || 0) + (p.comments || 0) + (p.shares || 0)),
        }));

      return { accounts, posts: allPosts as PublerPost[], platformBreakdown, totals, topPosts };
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  /* ── Loading state ── */
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;
  if (!data) return <EmptyDataNotice message="Unable to load social media data." />;

  const d = data;
  const socialPct = d.totalSessions > 0 ? ((d.totalSocial / d.totalSessions) * 100).toFixed(1) : "0";

  const chartConfig: Record<string, { label: string; color: string }> = {};
  d.platforms.forEach(p => { chartConfig[p.name] = { label: p.name, color: PLATFORM_COLORS[p.name] || PLATFORM_COLORS.Other }; });
  const chartData = d.platforms.map(p => ({ name: p.name, sessions: p.sessions, fill: PLATFORM_COLORS[p.name] || PLATFORM_COLORS.Other }));
  const topCampaignMax = d?.topCampaigns?.[0]?.count ?? 0;

  // Insights
  const tips: string[] = [];
  if (d.totalSocial === 0) {
    tips.push("1. No social media traffic detected yet. Ensure UTM parameters are added to all social posts.");
    tips.push("2. Configure default UTM templates in Publer per platform to automate tracking.");
  } else {
    const top = d.platforms[0];
    if (top) {
      tips.push(`1. ${top.name} drives ${top.pct}% of social traffic (${(top.sessions ?? 0).toLocaleString()} sessions). ${top.bounceRate > 60 ? `Bounce rate is ${top.bounceRate}% — try platform-specific landing pages.` : `Engagement is solid (${top.avgDuration}s avg). Double down.`}`);
    }
    const weak = d.platforms.filter(p => p.sessions < 5);
    if (weak.length > 0) tips.push(`2. ${weak.map(p => p.name).join(", ")} ${weak.length === 1 ? "has" : "have"} <5 sessions. Invest or reallocate.`);
    if (parseFloat(socialPct) < 10) tips.push(`3. Social traffic is only ${socialPct}% — benchmark is 15-25% for content sites.`);
  }

  return (
    <div className="space-y-6">
      {/* ── Referral summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Social Sessions" value={(d.totalSocial ?? 0).toLocaleString()} sub={`${socialPct}% of total`} />
        <StatCard label="Platforms Active" value={String(d.platforms.length)} />
        <StatCard label="Social Avg Duration" value={`${d.socialAvgDuration}s`} />
        <StatCard label="Social Bounce Rate" value={`${d.socialBounceRate}%`} />
      </div>

      {/* ── Publer Post Performance ── */}
      {publerLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      ) : publerError ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Failed to load Publer data</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {publerError instanceof Error ? publerError.message : "Unknown error"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchPubler()} className="shrink-0 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : publer ? (
        <PublerSection data={publer} onRefresh={() => refetchPubler()} />
      ) : null}

      {/* ── Referral charts ── */}
      {d.totalSocial === 0 ? (
        <EmptyDataNotice message="No social media sessions tracked yet. Add UTM parameters to social posts to see data here." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Referral Sessions by Platform</h4>
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
          <div>
            <h4 className="text-sm font-medium mb-3">Referral Breakdown</h4>
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
                {d.platforms.map(p => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{(p?.sessions ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{p.avgDuration}s</TableCell>
                    <TableCell className="text-right">{p.bounceRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── UTM campaigns ── */}
      {d.topCampaigns.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Top UTM Campaigns</h4>
          <div className="space-y-2">
            {d.topCampaigns.slice(0, 5).map(c => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-sm truncate flex-1 min-w-0">{c.name}</span>
                <Progress value={topCampaignMax > 0 ? ((c?.count ?? 0) / topCampaignMax) * 100 : 0} className="w-32 h-2" />
                <Badge variant="secondary" className="text-xs">{(c?.count ?? 0).toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <InsightCard insights={tips} variant="action" />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PublerSection({ data: p, onRefresh }: { data: PublerSummary; onRefresh: () => void }) {
  const t = p.totals;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Publer Post Performance</h4>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        <MiniStat label="Published" value={t.published} />
        <MiniStat label="Scheduled" value={t.scheduled} />
        <MiniStat label="Likes" value={t.likes} icon={<Heart className="h-3 w-3 text-pink-500" />} />
        <MiniStat label="Comments" value={t.comments} icon={<MessageCircle className="h-3 w-3 text-blue-500" />} />
        <MiniStat label="Shares" value={t.shares} icon={<Share2 className="h-3 w-3 text-green-500" />} />
        <MiniStat label="Impressions" value={t.impressions} icon={<Eye className="h-3 w-3 text-purple-500" />} />
        <MiniStat label="Clicks" value={t.clicks} icon={<MousePointer className="h-3 w-3 text-orange-500" />} />
        <MiniStat label="Accounts" value={p.accounts.length} />
      </div>

      {/* Per-platform table */}
      {p.platformBreakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Posts by Platform</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Published</TableHead>
                <TableHead className="text-right">Scheduled</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.platformBreakdown.map(row => (
                <TableRow key={row.platform}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right">{row.published.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.scheduled.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.likes.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.comments.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.shares.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.clicks.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Top posts */}
      {p.topPosts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Top Performing Posts</h4>
          <div className="space-y-2">
            {p.topPosts.map((post, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {PUBLER_LABEL[post.platform] || post.platform}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{post.text || "Untitled post"}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>❤️ {post.likes.toLocaleString()}</span>
                    <span>💬 {post.comments.toLocaleString()}</span>
                    <span>🔗 {post.shares.toLocaleString()}</span>
                    {post.impressions > 0 && <span>👁 {post.impressions.toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          {icon}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className="text-lg font-bold">{(value ?? 0).toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

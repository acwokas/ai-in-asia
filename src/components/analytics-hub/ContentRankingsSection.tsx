import { useState } from "react";
import { InsightCard } from "./InsightCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, Eye, MessageSquare, Heart } from "lucide-react";

interface Props {
  startDate: string;
  range: string;
}

export const ContentRankingsSection = ({ startDate, range }: Props) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-rankings", range],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const MAX_ROWS = 10000;
      const allArticles: any[] = [];
      let from = 0;
      while (allArticles.length < MAX_ROWS) {
        const { data: batch } = await supabase
          .from("articles")
          .select("id, title, slug, view_count, like_count, comment_count, trending_score, article_type, primary_category_id, published_at")
          .eq("status", "published")
          .range(from, from + PAGE_SIZE - 1);
        const safe = batch ?? [];
        allArticles.push(...safe);
        if (safe.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const [categoriesRes] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, slug")
          .limit(50),
      ]);

      const articles = (allArticles).map((a) => ({
        ...a,
        view_count: a?.view_count ?? 0,
        like_count: a?.like_count ?? 0,
        comment_count: a?.comment_count ?? 0,
        engagement: (a?.view_count ?? 0) + (a?.like_count ?? 0) * 3 + (a?.comment_count ?? 0) * 5,
      }));
      const categories = categoriesRes.data ?? [];

      return { articles, categories };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  const filtered = categoryFilter === "all"
    ? (data?.articles ?? [])
    : (data?.articles ?? []).filter(a => a.primary_category_id === categoryFilter);

  const sorted = [...filtered].sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0));
  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.length > 10 ? sorted.slice(-10).reverse() : [];

  const chartData = top10.map(a => ({
    name: (a?.title ?? "Untitled").length > 30 ? (a?.title ?? "Untitled").slice(0, 27) + "…" : (a?.title ?? "Untitled"),
    engagement: a?.engagement ?? 0,
  }));

  const getCategoryName = (id: string | null) => {
    if (!id) return "—";
    return data?.categories?.find(c => c.id === id)?.name || "—";
  };

  // Compute avg engagement
  const totalArticles = filtered.length;
  const avgEngagement = totalArticles > 0
    ? Math.round(filtered.reduce((s, a) => s + (a.engagement ?? 0), 0) / totalArticles)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Category:</span>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(data?.categories ?? []).map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{(filtered.length ?? 0).toLocaleString()} articles · avg score {avgEngagement.toLocaleString()}</span>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Top 10 by Engagement Score
        </h4>
        <ChartContainer config={{ engagement: { label: "Score", color: "hsl(var(--primary))" } }} className="h-[280px]">
          <BarChart data={chartData} layout="vertical" margin={{ left: 140 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis type="number" className="text-xs" />
            <YAxis dataKey="name" type="category" className="text-xs" width={135} tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <RankingTable title="Top 10" articles={top10} getCategoryName={getCategoryName} />

      {bottom10.length > 0 && (
        <RankingTable title="Bottom 10" articles={bottom10} getCategoryName={getCategoryName} />
      )}

      <InsightCard insights={(() => {
        const tips: string[] = [];

        if (totalArticles === 0) {
          tips.push("No published articles yet — content rankings will appear once articles are live.");
          return tips;
        }

        // Top category by avg engagement
        const catCounts: Record<string, { count: number; totalEng: number }> = {};
        (data?.articles ?? []).forEach(a => {
          const cat = getCategoryName(a.primary_category_id);
          if (cat === "—") return;
          if (!catCounts[cat]) catCounts[cat] = { count: 0, totalEng: 0 };
          catCounts[cat].count++;
          catCounts[cat].totalEng += a.engagement ?? 0;
        });
        const topCat = Object.entries(catCounts).sort((a, b) => (b[1].totalEng / b[1].count) - (a[1].totalEng / a[1].count))[0];
        if (topCat) {
          const avgEng = Math.round(topCat[1].totalEng / topCat[1].count);
          tips.push(`"${topCat[0]}" is your highest-performing category with ${avgEng.toLocaleString()} avg engagement across ${topCat[1].count} article${topCat[1].count === 1 ? '' : 's'}. Publishing more in this category could boost overall site engagement.`);
        }

        // Top article — analyse headline style, topic, publish time and replicate
        const topArticle = top10[0];
        if (topArticle) {
          const title = (topArticle.title ?? "Untitled").length > 45 ? (topArticle.title ?? "Untitled").slice(0, 42) + "…" : (topArticle.title ?? "Untitled");
          const pubDate = topArticle.published_at ? new Date(topArticle.published_at) : null;
          const dayOfWeek = pubDate ? pubDate.toLocaleDateString("en-US", { weekday: "long" }) : null;
          const catName = getCategoryName(topArticle.primary_category_id);
          tips.push(
            `#1 article "${title}" scores ${(topArticle.engagement ?? 0).toLocaleString()} (${(topArticle.view_count ?? 0).toLocaleString()} views, ${(topArticle.like_count ?? 0).toLocaleString()} likes, ${(topArticle.comment_count ?? 0).toLocaleString()} comments)` +
            (catName !== "—" ? ` in ${catName}` : "") +
            (dayOfWeek ? `, published on a ${dayOfWeek}` : "") +
            `. Study the headline style, topic, and publish timing — then replicate what works. Diversify acquisition channels to amplify similar content.`
          );
        }

        // Bottom 10 — actionable consolidation advice
        if (bottom10.length > 0) {
          const avgBottomViews = Math.round(bottom10.reduce((s, a) => s + (a.view_count ?? 0), 0) / bottom10.length);
          if (avgBottomViews < 50) {
            tips.push(`Bottom 10 articles average only ${avgBottomViews.toLocaleString()} views. Consider consolidating thin content or adding internal links from popular pages to drive traffic to these underperformers.`);
          } else {
            const avgBottom = Math.round(bottom10.reduce((s, a) => s + (a.engagement ?? 0), 0) / bottom10.length);
            tips.push(`Bottom 10 articles average ${avgBottom.toLocaleString()} engagement (${avgBottomViews.toLocaleString()} views). Review for content refresh, headline rewrites, or redirect opportunities.`);
          }
        }

        // Guide completions check
        tips.push("No guide completions tracked yet — verify the useGA4ContentTracking hook is active on guide pages to capture guide_complete events.");

        return tips;
      })()} />
    </div>
  );
};

const RankingTable = ({ title, articles, getCategoryName }: { title: string; articles: any[]; getCategoryName: (id: string | null) => string }) => (
  <div>
    <h4 className="text-sm font-medium mb-3">{title}</h4>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right"><Eye className="h-3 w-3 inline" /></TableHead>
          <TableHead className="text-right"><Heart className="h-3 w-3 inline" /></TableHead>
          <TableHead className="text-right"><MessageSquare className="h-3 w-3 inline" /></TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(articles ?? []).map((a, i) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
            <TableCell className="max-w-[220px] truncate text-xs">{a?.title ?? "Untitled"}</TableCell>
            <TableCell><Badge variant="outline" className="text-[10px]">{getCategoryName(a.primary_category_id)}</Badge></TableCell>
            <TableCell className="text-right font-mono text-xs">{(a?.view_count ?? 0).toLocaleString()}</TableCell>
            <TableCell className="text-right font-mono text-xs">{(a?.like_count ?? 0).toLocaleString()}</TableCell>
            <TableCell className="text-right font-mono text-xs">{(a?.comment_count ?? 0).toLocaleString()}</TableCell>
            <TableCell className="text-right font-mono text-xs font-bold">{(a?.engagement ?? 0).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

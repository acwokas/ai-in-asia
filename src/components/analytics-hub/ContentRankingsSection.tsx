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
      // Paginated fetch for all published articles
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

  return (
    <div className="space-y-6">
      {/* Filter */}
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
        <span className="text-xs text-muted-foreground">{(filtered.length ?? 0).toLocaleString()} articles</span>
      </div>

      {/* Top 10 bar chart */}
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

      {/* Top 10 table */}
      <RankingTable title="Top 10" articles={top10} getCategoryName={getCategoryName} />

      {/* Bottom 10 */}
      {bottom10.length > 0 && (
        <RankingTable title="Bottom 10" articles={bottom10} getCategoryName={getCategoryName} />
      )}

      <InsightCard insights={(() => {
        const tips: string[] = [];
        if (top10.length > 0) {
          // Find top category
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
            tips.push(`Your top-performing category is "${topCat[0]}" with ${avgEng.toLocaleString()} avg engagement score. Consider publishing more in this category.`);
          }
        }
        if (bottom10.length > 0) {
          const avgBottom = Math.round(bottom10.reduce((s, a) => s + (a.engagement ?? 0), 0) / bottom10.length);
          tips.push(`Bottom 10 articles average ${avgBottom.toLocaleString()} engagement. Review these for refresh opportunities or consider redirecting to stronger content.`);
        }
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

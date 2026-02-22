import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  AlertCircle,
  CheckCircle,
  FileText,
  Sparkles,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminSidebar from "@/components/admin/AdminSidebar";

type SortField = "title" | "score" | "date";
type SortDir = "asc" | "desc";
type HealthFilter = "all" | "needs-attention" | "complete";

interface ArticleSEO {
  id: string;
  title: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  seo_title: string | null;
  focus_keyphrase: string | null;
  keyphrase_synonyms: string | null;
  featured_image_alt: string | null;
  published_at: string | null;
}

function analyzeSEO(a: ArticleSEO) {
  let score = 0;
  let total = 5;
  const details = {
    metaTitle: !!a.meta_title,
    metaDesc: !!a.meta_description,
    seoTitle: !!a.seo_title,
    keyphrase: !!a.focus_keyphrase,
    imageAlt: !!a.featured_image_alt,
  };
  if (details.metaTitle) score++;
  if (details.metaDesc) score++;
  if (details.seoTitle) score++;
  if (details.keyphrase) score++;
  if (details.imageAlt) score++;
  return { score, total, pct: Math.round((score / total) * 100), details };
}

function ScoreBadge({ pct }: { pct: number }) {
  if (pct >= 80) return <Badge className="bg-green-600 hover:bg-green-700">{pct}%</Badge>;
  if (pct >= 40) return <Badge className="bg-yellow-600 hover:bg-yellow-700">{pct}%</Badge>;
  return <Badge variant="destructive">{pct}%</Badge>;
}

function FieldBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs text-green-700">
      <CheckCircle className="h-3 w-3" /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3 w-3" /> {label}
    </span>
  );
}

// ─── Tab 1: Article SEO Health ───────────────────────────────────────────────
function ArticleSEOHealthTab({ articles, isLoading }: { articles: ArticleSEO[] | undefined; isLoading: boolean }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<HealthFilter>("all");
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    if (!articles) return [];
    let list = articles.map(a => ({ ...a, seo: analyzeSEO(a) }));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q));
    }
    if (filter === "needs-attention") list = list.filter(a => a.seo.pct < 80);
    if (filter === "complete") list = list.filter(a => a.seo.pct >= 80);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "score") cmp = a.seo.pct - b.seo.pct;
      else if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else cmp = (a.published_at || "").localeCompare(b.published_at || "");
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [articles, search, filter, sortField, sortDir]);

  const counts = useMemo(() => {
    if (!articles) return { all: 0, needs: 0, complete: 0 };
    const scored = articles.map(a => analyzeSEO(a).pct);
    return {
      all: scored.length,
      needs: scored.filter(p => p < 80).length,
      complete: scored.filter(p => p >= 80).length,
    };
  }, [articles]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer" onClick={() => setFilter("all")}>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{counts.all}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter("needs-attention")}>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{counts.needs}</p>
            <p className="text-xs text-muted-foreground">Needs Attention</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter("complete")}>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{counts.complete}</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search articles…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "needs-attention", "complete"] as HealthFilter[]).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "needs-attention" ? "Needs Attention" : "Complete"}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("title")}>
                <span className="flex items-center gap-1">Title <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead>SEO Title</TableHead>
              <TableHead>Meta Desc</TableHead>
              <TableHead>Keyphrase</TableHead>
              <TableHead>Image Alt</TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("score")}>
                <span className="flex items-center gap-1 justify-end">Score <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("date")}>
                <span className="flex items-center gap-1 justify-end">Date <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 100).map(a => (
              <>
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                  <TableCell className="font-medium max-w-[300px] truncate">{a.title}</TableCell>
                  <TableCell><FieldBadge ok={a.seo.details.seoTitle} label={a.seo.details.seoTitle ? "Set" : "Missing"} /></TableCell>
                  <TableCell><FieldBadge ok={a.seo.details.metaDesc} label={a.seo.details.metaDesc ? "Set" : "Missing"} /></TableCell>
                  <TableCell><FieldBadge ok={a.seo.details.keyphrase} label={a.seo.details.keyphrase ? "Set" : "Missing"} /></TableCell>
                  <TableCell><FieldBadge ok={a.seo.details.imageAlt} label={a.seo.details.imageAlt ? "Set" : "Missing"} /></TableCell>
                  <TableCell className="text-right"><ScoreBadge pct={a.seo.pct} /></TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {a.published_at ? new Date(a.published_at).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
                {expandedId === a.id && (
                  <TableRow key={`${a.id}-detail`}>
                    <TableCell colSpan={7}>
                      <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                        <p><strong>Slug:</strong> /{a.slug}</p>
                        <p><strong>Meta Title:</strong> {a.meta_title || <span className="text-red-600">Not set</span>}</p>
                        <p><strong>SEO Title:</strong> {a.seo_title || <span className="text-red-600">Not set</span>}</p>
                        <p><strong>Meta Description:</strong> {a.meta_description || <span className="text-red-600">Not set</span>}</p>
                        <p><strong>Focus Keyphrase:</strong> {a.focus_keyphrase || <span className="text-red-600">Not set</span>}</p>
                        <p><strong>Keyphrase Synonyms:</strong> {a.keyphrase_synonyms || <span className="text-muted-foreground">None</span>}</p>
                        <Button size="sm" onClick={() => navigate(`/editor/${a.id}`)}>Edit in Article Editor</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
      {filtered.length > 100 && (
        <p className="text-xs text-muted-foreground text-center">Showing first 100 of {filtered.length} articles</p>
      )}
    </div>
  );
}

// ─── Tab 2: Bulk Generation ──────────────────────────────────────────────────
function BulkGenerationTab({ articles }: { articles: ArticleSEO[] | undefined }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isFixingBulk, setIsFixingBulk] = useState(false);
  const [queueJobId, setQueueJobId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);

  // Check for running jobs on mount
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("bulk_operation_queue")
        .select("id, status")
        .eq("operation_type", "generate_seo")
        .in("status", ["queued", "processing"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setQueueJobId(data[0].id);
        setIsFixingBulk(true);
      }
    };
    check();
  }, []);

  // Realtime updates
  useEffect(() => {
    if (!queueJobId) return;
    const channel = supabase
      .channel("seo-queue-progress")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bulk_operation_queue", filter: `id=eq.${queueJobId}` }, (payload) => {
        setQueueStatus(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queueJobId]);

  useEffect(() => {
    if (queueStatus && (queueStatus.status === "completed" || queueStatus.status === "failed")) {
      setIsFixingBulk(false);
      if (queueStatus.status === "completed") {
        toast("SEO Generation Complete!", { description: `${queueStatus.successful_items} articles processed, ${queueStatus.failed_items} failed.` });
      } else {
        toast.error("SEO Generation Failed", { description: queueStatus.error_message || "An error occurred" });
      }
      setQueueJobId(null);
    }
  }, [queueStatus]);

  const needsFixCount = articles?.filter(a => analyzeSEO(a).pct < 80).length || 0;

  const handleQueueBulkFix = async () => {
    setIsFixingBulk(true);
    try {
      const articleIds = articles?.filter(a => analyzeSEO(a).pct < 80).map(a => a.id) || [];
      if (articleIds.length === 0) {
        toast("All articles have good SEO!");
        setIsFixingBulk(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const { data: queueEntry, error } = await supabase
        .from("bulk_operation_queue")
        .insert({ operation_type: "generate_seo", article_ids: articleIds, total_items: articleIds.length, status: "queued", created_by: session?.user.id })
        .select()
        .single();
      if (error) throw error;
      setQueueJobId(queueEntry.id);
      toast("SEO generation queued", { description: `Processing ${articleIds.length} articles in background.` });
    } catch (error: any) {
      toast.error("Error", { description: error.message });
      setIsFixingBulk(false);
    }
  };

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-generate-seo");
      if (error) throw error;
      setResults(data);
      toast("Bulk SEO Generation Complete!", { description: `Processed ${data.processed} articles. ${data.failed} failed.` });
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to generate SEO metadata" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Queue-based bulk fix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Fix Articles with Low SEO</CardTitle>
          <CardDescription>{needsFixCount} articles have SEO score below 80%</CardDescription>
        </CardHeader>
        <CardContent>
          {queueStatus && queueStatus.status === "processing" && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Processing…</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {queueStatus.processed_items || 0} / {queueStatus.total_items || 0} articles
              </p>
              <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${((queueStatus.processed_items || 0) / (queueStatus.total_items || 1)) * 100}%` }} />
              </div>
            </div>
          )}
          <Button onClick={handleQueueBulkFix} disabled={isFixingBulk || needsFixCount === 0}>
            {isFixingBulk ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing…</> : `Fix ${needsFixCount} Articles`}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Generates missing meta titles, descriptions, and keyphrases using AI. Runs in background batches.</p>
        </CardContent>
      </Card>

      {/* Direct edge function bulk generate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Generate All Missing SEO Data</CardTitle>
          <CardDescription>Scans all published articles and generates SEO metadata for any with missing fields</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What this does:</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
              <li>Generates Meta Title &amp; SEO Title</li>
              <li>Creates Focus Keyphrase &amp; Synonyms</li>
              <li>Optimizes Meta Description</li>
            </ul>
          </div>
          <Button onClick={handleBulkGenerate} disabled={isGenerating} className="w-full">
            {isGenerating ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating…</> : <><Sparkles className="h-5 w-5 mr-2" /> Generate SEO for All Articles</>}
          </Button>
          {results && (
            <div className="p-4 bg-primary/10 rounded-lg grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold">{results.total}</div><div className="text-xs text-muted-foreground">Found</div></div>
              <div><div className="text-2xl font-bold text-green-600">{results.processed}</div><div className="text-xs text-muted-foreground">Processed</div></div>
              <div><div className="text-2xl font-bold text-red-600">{results.failed}</div><div className="text-xs text-muted-foreground">Failed</div></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 3: Sitemap & Indexing ───────────────────────────────────────────────
function SitemapIndexingTab() {
  const [robotsTxt, setRobotsTxt] = useState<string | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);

  useEffect(() => {
    fetch("/robots.txt").then(r => r.text()).then(setRobotsTxt).catch(() => setRobotsTxt("Could not load robots.txt"));
  }, []);

  const handleIndexNow = async () => {
    setIsNotifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-search-engines");
      if (error) throw error;
      toast("IndexNow triggered!", { description: "Search engines have been notified." });
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Sitemap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">sitemap.xml</p>
              <p className="text-sm text-muted-foreground">Automatically generated and updated</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open("/sitemap.xml", "_blank")}>
              <ExternalLink className="h-4 w-4 mr-1" /> View
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">RSS Feed</p>
              <p className="text-sm text-muted-foreground">Available for subscribers and crawlers</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-rss`, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-1" /> View
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IndexNow</CardTitle>
          <CardDescription>Instantly notify search engines about new or updated content</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleIndexNow} disabled={isNotifying}>
            {isNotifying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</> : "Trigger IndexNow"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>robots.txt Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {robotsTxt ? (
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap">{robotsTxt}</pre>
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function SEODashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "health";
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin");
      if (!data || data.length === 0) { toast.error("Access Denied"); navigate("/admin"); return; }
      setIsAdmin(true);
    };
    check();
  }, [navigate]);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["seo-dashboard-articles"],
    enabled: isAdmin === true,
    queryFn: async () => {
      let all: ArticleSEO[] = [];
      let from = 0;
      const size = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, meta_title, meta_description, seo_title, focus_keyphrase, keyphrase_synonyms, featured_image_alt, published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .range(from, from + size - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = [...all, ...data];
        if (data.length < size) break;
        from += size;
      }
      return all;
    },
  });

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">SEO Dashboard</h1>
          <p className="text-muted-foreground text-sm">Optimize your content for search engines</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="health">Article SEO Health</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Generation</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap & Indexing</TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="mt-4">
            <ArticleSEOHealthTab articles={articles} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="bulk" className="mt-4">
            <BulkGenerationTab articles={articles} />
          </TabsContent>
          <TabsContent value="sitemap" className="mt-4">
            <SitemapIndexingTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

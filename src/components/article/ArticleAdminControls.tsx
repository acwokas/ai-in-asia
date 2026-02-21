import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Edit, Eye, EyeOff, Copy, Trash2, ExternalLink, Loader2, ChevronDown, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────
interface Article {
  id: string;
  status: string;
  slug: string;
  title: string;
  view_count?: number | null;
  published_at?: string | null;
  featured_on_homepage?: boolean | null;
  meta_title?: string | null;
  meta_description?: string | null;
  categories?: { name: string; slug: string; id: string } | null;
  authors?: { name: string; slug: string } | null;
}

interface ArticleAdminControlsProps {
  article: Article;
  showAdminView: boolean;
  onToggleAdminView: () => void;
  queryKey: any[];
}

// ─── Helpers ────────────────────────────────────────────────────────
const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "…" : s);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return format(d, "dd MMM yyyy");
};

const relativeDate = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

const viewsPerDay = (views: number, publishedAt: string | null | undefined) => {
  if (!publishedAt) return null;
  const days = differenceInDays(new Date(), new Date(publishedAt)) || 1;
  return (views / days).toFixed(1);
};

// ─── Component ──────────────────────────────────────────────────────
export const ArticleAdminControls = ({
  article,
  showAdminView,
  onToggleAdminView,
  queryKey,
}: ArticleAdminControlsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [featured, setFeatured] = useState(!!article.featured_on_homepage);
  const [seoOpen, setSeoOpen] = useState(false);

  const categorySlug = article.categories?.slug || "news";

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  // ── Actions ─────────────────────────────────────────────
  const setStatus = async (status: "published" | "draft") => {
    setBusy(status);
    try {
      const updates: any = { status };
      if (status === "published" && !article.published_at) {
        updates.published_at = new Date().toISOString();
      }
      const { error } = await supabase.from("articles").update(updates).eq("id", article.id);
      if (error) throw error;
      toast({ title: status === "published" ? "Article published" : "Article unpublished" });
      refresh();
    } catch {
      toast({ title: "Error", description: `Failed to ${status === "published" ? "publish" : "unpublish"}`, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async () => {
    setBusy("duplicate");
    try {
      const { data: src, error: fetchErr } = await supabase
        .from("articles")
        .select("*")
        .eq("id", article.id)
        .single();
      if (fetchErr || !src) throw fetchErr;

      const { id, created_at, updated_at, published_at, view_count, like_count, comment_count, preview_code, ...rest } = src as any;
      const newSlug = `${article.slug}-copy-${Date.now().toString(36)}`;
      const { data: newArt, error: insErr } = await supabase
        .from("articles")
        .insert({ ...rest, slug: newSlug, title: `${article.title} (Copy)`, status: "draft" as any, view_count: 0, like_count: 0, comment_count: 0 })
        .select("id, slug")
        .single();
      if (insErr) throw insErr;
      toast({ title: "Article duplicated", description: "Opening the copy in the editor…" });
      navigate(`/editor?id=${newArt.id}`);
    } catch {
      toast({ title: "Error", description: "Failed to duplicate article", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const deleteArticle = async () => {
    setBusy("delete");
    try {
      const { error } = await supabase.from("articles").delete().eq("id", article.id);
      if (error) throw error;
      toast({ title: "Article deleted" });
      navigate("/");
    } catch {
      toast({ title: "Error", description: "Failed to delete article", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const toggleFeatured = async (val: boolean) => {
    setFeatured(val);
    const { error } = await supabase.from("articles").update({ featured_on_homepage: val }).eq("id", article.id);
    if (error) {
      setFeatured(!val);
      toast({ title: "Error", description: "Failed to update featured status", variant: "destructive" });
    } else {
      toast({ title: val ? "Marked as featured" : "Removed from featured" });
      refresh();
    }
  };

  // ── SEO data ────────────────────────────────────────────
  const seoTitle = article.meta_title || article.title || "";
  const seoDesc = article.meta_description || "";
  const seoUrl = `aiinasia.com/${categorySlug}/${article.slug}`;

  // ── Quick action button ─────────────────────────────────
  const IconBtn = ({ icon: Icon, label, onClick, disabled, variant }: { icon: any; label: string; onClick: () => void; disabled?: boolean; variant?: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${variant === "destructive" ? "text-destructive hover:text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:text-foreground"}`}
          onClick={onClick}
          disabled={!!busy || disabled}
        >
          {busy === label ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom"><p className="text-xs">{label}</p></TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mb-4 rounded-lg border border-border bg-card/95 backdrop-blur-sm overflow-hidden relative z-10">
        {/* ── Row 0: Controls bar ─────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onToggleAdminView} className="h-8 text-xs">
              {showAdminView ? <><Eye className="h-3.5 w-3.5 mr-1.5" />Normal View</> : <><EyeOff className="h-3.5 w-3.5 mr-1.5" />Admin View</>}
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link to={`/editor?id=${article.id}`}><Edit className="h-3.5 w-3.5 mr-1.5" />Edit Article</Link>
            </Button>
          </div>

          <div className="flex items-center gap-0.5">
            <IconBtn icon={Copy} label="duplicate" onClick={duplicate} />
            {article.status === "published" && (
              <IconBtn icon={EyeOff} label="draft" onClick={() => setStatus("draft")} />
            )}
            {article.status === "draft" && (
              <IconBtn icon={Eye} label="published" onClick={() => setStatus("published")} />
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <span><IconBtn icon={Trash2} label="delete" onClick={() => {}} variant="destructive" /></span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this article?</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteArticle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <IconBtn
              icon={ExternalLink}
              label="View as reader"
              onClick={() => window.open(`/${categorySlug}/${article.slug}`, "_blank")}
            />
          </div>
        </div>

        {showAdminView && (
          <>
            <Separator />

            {/* ── Row 1: Key info ──────────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 text-sm">
              {/* Status pill */}
              <Badge className={`text-xs font-medium border-0 ${
                article.status === "published"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              }`}>
                {article.status === "published" ? "Published" : "Draft"}
              </Badge>

              {/* Featured toggle */}
              <div className="flex items-center gap-2">
                <Switch checked={featured} onCheckedChange={toggleFeatured} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3" />
                <span className="text-muted-foreground text-xs">Featured</span>
              </div>

              {/* Views */}
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{(article.view_count ?? 0).toLocaleString()}</span>
                <span className="text-muted-foreground text-xs">views</span>
                {article.published_at && (
                  <span className="text-muted-foreground text-xs">
                    ({viewsPerDay(article.view_count ?? 0, article.published_at)}/day)
                  </span>
                )}
              </div>

              {/* Published date */}
              {article.published_at && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-xs">{formatDate(article.published_at)}</span>
                  <span className="text-muted-foreground text-xs">({relativeDate(article.published_at)})</span>
                </div>
              )}
            </div>

            <Separator />

            {/* ── Row 2: Reference info ────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-xs text-muted-foreground">
              <span><span className="opacity-60">ID:</span> <span className="font-mono">{article.id.slice(0, 8)}…</span></span>
              <span><span className="opacity-60">Slug:</span> {article.slug}</span>
              {article.categories?.name && (
                <span><span className="opacity-60">Category:</span> {article.categories.name}</span>
              )}
              {article.authors?.name && (
                <span><span className="opacity-60">Author:</span> {article.authors.name}</span>
              )}
            </div>

            {/* ── Row 3: SEO Preview (collapsible) ─────────── */}
            <Separator />
            <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <div className="flex items-center gap-1.5">
                  <Search className="h-3 w-3" />
                  <span className="font-medium">SEO Preview</span>
                </div>
                <ChevronDown className={`h-3 w-3 transition-transform ${seoOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-3 space-y-3">
                  {/* Google SERP mock */}
                  <div className="rounded-md border border-border bg-background p-3 space-y-1 max-w-xl">
                    <p className="text-sm text-primary leading-tight font-medium truncate">{truncate(seoTitle, 60)}</p>
                    <p className="text-xs text-emerald-500">{seoUrl}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{truncate(seoDesc, 155) || "No meta description set."}</p>
                  </div>

                  {/* Char counts */}
                  <div className="flex gap-4 text-xs">
                    <span className={seoTitle.length <= 60 ? "text-emerald-400" : "text-destructive"}>
                      Title: {seoTitle.length}/60 chars
                    </span>
                    <span className={seoDesc.length <= 155 ? "text-emerald-400" : "text-destructive"}>
                      Description: {seoDesc.length}/155 chars
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

// Keep the legacy debug export for backwards compat but it's now unused
export const ArticleAdminDebug = ({ article }: { article: any }) => null;

export default ArticleAdminControls;

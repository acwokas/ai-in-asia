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
interface ContentItem {
  id: string;
  status: string;
  slug: string;
  title: string;
  view_count?: number | null;
  published_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  // Article-specific
  featured_on_homepage?: boolean | null;
  categories?: { name: string; slug: string; id: string } | null;
  authors?: { name: string; slug: string } | null;
  // Guide-specific
  is_editors_pick?: boolean | null;
  difficulty?: string | null;
  platform_tags?: string[] | null;
  read_time_minutes?: number | null;
  topic_category?: string | null;
  author_id?: string | null;
  pillar?: string | null;
}

interface ContentAdminControlsProps {
  item: ContentItem;
  type: "article" | "guide";
  showAdminView: boolean;
  onToggleAdminView: () => void;
  queryKey: any[];
  /** For articles: category slug used in URL */
  categorySlug?: string;
  /** For guides: optional author name for row 2 */
  authorName?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
const truncate = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "…" : s);

const formatDate = (iso: string) => format(new Date(iso), "dd MMM yyyy");

const relativeDate = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

const viewsPerDay = (views: number, publishedAt: string | null | undefined) => {
  if (!publishedAt) return null;
  const days = differenceInDays(new Date(), new Date(publishedAt)) || 1;
  return (views / days).toFixed(1);
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-500/20 text-emerald-400",
  intermediate: "bg-amber-500/20 text-amber-400",
  advanced: "bg-red-500/20 text-red-400",
};

// ─── Component ──────────────────────────────────────────────────────
export const ContentAdminControls = ({
  item,
  type,
  showAdminView,
  onToggleAdminView,
  queryKey,
  categorySlug,
  authorName,
}: ContentAdminControlsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [featured, setFeatured] = useState(
    type === "article" ? !!item.featured_on_homepage : !!item.is_editors_pick
  );
  const [seoOpen, setSeoOpen] = useState(false);

  const table = type === "article" ? "articles" : "ai_guides";
  const label = type === "article" ? "Article" : "Guide";
  const catSlug = categorySlug || item.categories?.slug || "news";

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  // ── Actions ─────────────────────────────────────────────
  const setStatus = async (status: "published" | "draft") => {
    setBusy(status);
    try {
      const updates: any = { status };
      if (status === "published" && !item.published_at) {
        updates.published_at = new Date().toISOString();
      }
      const { error } = await supabase.from(table).update(updates).eq("id", item.id);
      if (error) throw error;
      toast({ title: status === "published" ? `${label} published` : `${label} unpublished` });
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
        .from(table)
        .select("*")
        .eq("id", item.id)
        .single();
      if (fetchErr || !src) throw fetchErr;

      const { id, created_at, updated_at, published_at, view_count, ...rest } = src as any;

      if (type === "article") {
        const { like_count, comment_count, preview_code, ...articleRest } = rest;
        const newSlug = `${item.slug}-copy-${Date.now().toString(36)}`;
        const { data: newItem, error: insErr } = await supabase
          .from("articles")
          .insert({ ...articleRest, slug: newSlug, title: `${item.title} (Copy)`, status: "draft" as any, view_count: 0, like_count: 0, comment_count: 0 })
          .select("id")
          .single();
        if (insErr) throw insErr;
        toast({ title: `${label} duplicated`, description: "Opening the copy in the editor…" });
        navigate(`/editor?id=${newItem.id}`);
      } else {
        const { preview_code, ...guideRest } = rest;
        const newSlug = `${item.slug}-copy-${Date.now().toString(36)}`;
        const { data: newItem, error: insErr } = await supabase
          .from("ai_guides")
          .insert({ ...guideRest, slug: newSlug, title: `${item.title} (Copy)`, status: "draft" as any, view_count: 0 })
          .select("id")
          .single();
        if (insErr) throw insErr;
        toast({ title: `${label} duplicated`, description: "Opening the copy in the editor…" });
        navigate(`/admin/guide-editor?id=${newItem.id}`);
      }
    } catch {
      toast({ title: "Error", description: `Failed to duplicate ${label.toLowerCase()}`, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const deleteItem = async () => {
    setBusy("delete");
    try {
      const { error } = await supabase.from(table).delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: `${label} deleted` });
      navigate(type === "article" ? "/" : "/guides");
    } catch {
      toast({ title: "Error", description: `Failed to delete ${label.toLowerCase()}`, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const toggleFeatured = async (val: boolean) => {
    setFeatured(val);
    const field = type === "article" ? "featured_on_homepage" : "is_editors_pick";
    const { error } = await supabase.from(table).update({ [field]: val }).eq("id", item.id);
    if (error) {
      setFeatured(!val);
      toast({ title: "Error", description: "Failed to update featured status", variant: "destructive" });
    } else {
      toast({ title: val ? "Marked as featured" : "Removed from featured" });
      refresh();
    }
  };

  // ── SEO data ────────────────────────────────────────────
  const seoTitle = item.meta_title || item.title || "";
  const seoDesc = item.meta_description || "";
  const seoUrl = type === "article"
    ? `aiinasia.com/${catSlug}/${item.slug}`
    : `aiinasia.com/guides/${item.slug}`;

  // ── Edit link ───────────────────────────────────────────
  const editLink = type === "article"
    ? `/editor?id=${item.id}`
    : `/admin/guide-editor?id=${item.id}`;

  const readerLink = type === "article"
    ? `/${catSlug}/${item.slug}`
    : `/guides/${item.slug}`;

  // ── Quick action button ─────────────────────────────────
  const IconBtn = ({ icon: Icon, label: lbl, onClick, disabled, variant }: { icon: any; label: string; onClick: () => void; disabled?: boolean; variant?: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${variant === "destructive" ? "text-destructive hover:text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:text-foreground"}`}
          onClick={onClick}
          disabled={!!busy || disabled}
        >
          {busy === lbl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom"><p className="text-xs">{lbl}</p></TooltipContent>
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
              <Link to={editLink}><Edit className="h-3.5 w-3.5 mr-1.5" />Edit {label}</Link>
            </Button>
          </div>

          <div className="flex items-center gap-0.5">
            <IconBtn icon={Copy} label="duplicate" onClick={duplicate} />
            {item.status === "published" && (
              <IconBtn icon={EyeOff} label="draft" onClick={() => setStatus("draft")} />
            )}
            {item.status === "draft" && (
              <IconBtn icon={Eye} label="published" onClick={() => setStatus("published")} />
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <span><IconBtn icon={Trash2} label="delete" onClick={() => {}} variant="destructive" /></span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this {label.toLowerCase()}?</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <IconBtn
              icon={ExternalLink}
              label="View as reader"
              onClick={() => window.open(readerLink, "_blank")}
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
                item.status === "published"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              }`}>
                {item.status === "published" ? "Published" : "Draft"}
              </Badge>

              {/* Difficulty pill (guide only) */}
              {type === "guide" && item.difficulty && (
                <Badge className={`text-xs font-medium border-0 ${difficultyColors[item.difficulty] || "bg-muted text-muted-foreground"}`}>
                  {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                </Badge>
              )}

              {/* Featured toggle */}
              <div className="flex items-center gap-2">
                <Switch checked={featured} onCheckedChange={toggleFeatured} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3" />
                <span className="text-muted-foreground text-xs">Featured</span>
              </div>

              {/* Views */}
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{(item.view_count ?? 0).toLocaleString()}</span>
                <span className="text-muted-foreground text-xs">views</span>
                {item.published_at && (
                  <span className="text-muted-foreground text-xs">
                    ({viewsPerDay(item.view_count ?? 0, item.published_at)}/day)
                  </span>
                )}
              </div>

              {/* Platform tags (guide only) */}
              {type === "guide" && item.platform_tags && item.platform_tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {item.platform_tags.map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-muted/50 text-muted-foreground">
                      {p}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Published date */}
              {item.published_at && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-xs">{formatDate(item.published_at)}</span>
                  <span className="text-muted-foreground text-xs">({relativeDate(item.published_at)})</span>
                </div>
              )}
            </div>

            <Separator />

            {/* ── Row 2: Reference info ────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-xs text-muted-foreground">
              <span><span className="opacity-60">ID:</span> <span className="font-mono">{item.id.slice(0, 8)}…</span></span>
              <span><span className="opacity-60">Slug:</span> {item.slug}</span>

              {type === "article" && item.categories?.name && (
                <span><span className="opacity-60">Category:</span> {item.categories.name}</span>
              )}
              {type === "article" && item.authors?.name && (
                <span><span className="opacity-60">Author:</span> {item.authors.name}</span>
              )}

              {type === "guide" && item.read_time_minutes != null && item.read_time_minutes > 0 && (
                <span><span className="opacity-60">Read time:</span> {item.read_time_minutes} min</span>
              )}
              {type === "guide" && item.topic_category && (
                <span><span className="opacity-60">Topic:</span> {item.topic_category}</span>
              )}
              {type === "guide" && item.pillar && (
                <span><span className="opacity-60">Pillar:</span> {item.pillar}</span>
              )}
              {type === "guide" && authorName && (
                <span><span className="opacity-60">Author:</span> {authorName}</span>
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
                  <div className="rounded-md border border-border bg-background p-3 space-y-1 max-w-xl">
                    <p className="text-sm text-primary leading-tight font-medium truncate">{truncate(seoTitle, 60)}</p>
                    <p className="text-xs text-emerald-500">{seoUrl}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{truncate(seoDesc, 155) || "No meta description set."}</p>
                  </div>
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

export default ContentAdminControls;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Calendar, Loader2, Wrench, Link2, Activity, Clock, MessageSquare, Mail, TrendingUp, RefreshCw, AlertTriangle, ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface AdminQuickActionsProps {
  scrapingEvents: boolean;
  refreshingContent: boolean;
  refreshingTrending: boolean;
  onScrapeEvents: () => void;
  onRefreshContent: () => void;
  onRefreshTrending: () => void;
}

export const AdminQuickActions = ({
  scrapingEvents,
  refreshingContent,
  refreshingTrending,
  onScrapeEvents,
  onRefreshContent,
  onRefreshTrending,
}: AdminQuickActionsProps) => {
  const navigate = useNavigate();
  const [ogMigrating, setOgMigrating] = useState(false);
  const [ogProgress, setOgProgress] = useState("");

  /**
   * Batch-generate OG-optimised JPEGs for all existing articles.
   * Processes in batches of BATCH_SIZE with a short pause between batches
   * to avoid browser memory pressure and Supabase rate limits.
   * Safe to re-run — skips articles that already have an OG image.
   */
  const handleGenerateOgImages = async () => {
    setOgMigrating(true);
    setOgProgress("Fetching articles…");

    const BATCH_SIZE = 5;            // images per batch
    const PAUSE_MS = 1_500;          // breathing room between batches
    const OG_W = 1200, OG_H = 630, MAX_BYTES = 250 * 1024;

    try {
      const { data: articles, error } = await supabase
        .from("articles")
        .select("id, slug, featured_image_url")
        .not("featured_image_url", "is", null)
        .neq("featured_image_url", "");

      if (error) throw error;
      if (!articles?.length) {
        toast.info("No articles with hero images found");
        return;
      }

      let processed = 0, skipped = 0, failed = 0;
      const total = articles.length;

      for (let i = 0; i < total; i++) {
        const art = articles[i];
        setOgProgress(`${i + 1}/${total}  ✓${processed} ✗${failed} ⏭${skipped} — ${art.slug?.slice(0, 30)}`);

        // Derive OG path
        const marker = "/article-images/";
        const mIdx = art.featured_image_url.indexOf(marker);
        if (mIdx === -1) { skipped++; continue; }

        const storagePath = art.featured_image_url.substring(mIdx + marker.length);
        const filename = storagePath.split("/").pop()!;
        const baseName = filename.replace(/\.[^/.]+$/, "");
        const ogPath = `og/${baseName}-og.jpg`;

        // Check if OG version already exists
        const { data: existing } = await supabase.storage
          .from("article-images")
          .list("og", { search: `${baseName}-og.jpg` });
        if (existing && existing.some(f => f.name === `${baseName}-og.jpg`)) { skipped++; continue; }

        try {
          // Download original image
          const res = await fetch(art.featured_image_url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();

          // Resize to 1200×630 JPEG via canvas
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = OG_W;
          canvas.height = OG_H;
          const ctx = canvas.getContext("2d")!;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, OG_W, OG_H);

          // Cover-fit crop
          const srcR = bitmap.width / bitmap.height;
          const dstR = OG_W / OG_H;
          let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
          if (srcR > dstR) { sw = bitmap.height * dstR; sx = (bitmap.width - sw) / 2; }
          else { sh = bitmap.width / dstR; sy = (bitmap.height - sh) / 2; }
          ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, OG_W, OG_H);

          // Encode JPEG, reduce quality until ≤250 KB
          let quality = 0.82;
          let jpegBlob: Blob | null = null;
          while (quality >= 0.3) {
            jpegBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", quality));
            if (jpegBlob && jpegBlob.size <= MAX_BYTES) break;
            quality -= 0.08;
          }
          if (!jpegBlob) throw new Error("Compression failed");

          // Upload
          const { error: upErr } = await supabase.storage
            .from("article-images")
            .upload(ogPath, jpegBlob, { contentType: "image/jpeg", upsert: true });
          if (upErr) throw upErr;

          processed++;
        } catch (err: any) {
          console.warn(`OG fail: ${art.slug}`, err);
          failed++;
        }

        // Pause between batches to let the browser breathe and avoid rate limits
        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < total) {
          setOgProgress(`Pausing after batch ${Math.ceil((i + 1) / BATCH_SIZE)}…`);
          await new Promise(r => setTimeout(r, PAUSE_MS));
        }
      }

      toast.success(`OG images done: ${processed} created, ${skipped} already existed, ${failed} failed`);
      setOgProgress("");
    } catch (err: any) {
      toast.error("Migration failed", { description: err.message });
    } finally {
      setOgMigrating(false);
    }
  };

  const [compressMigrating, setCompressMigrating] = useState(false);
  const [compressProgress, setCompressProgress] = useState("");

  /**
   * Batch-compress oversized hero images for site performance.
   * - Downloads each hero image
   * - Skips images already ≤ 300 KB (they're fine)
   * - Re-encodes as JPEG (1920×1080 max, quality 85, ≤500 KB target)
   * - Replaces original in storage and updates DB URL if format changed
   * - Batched with pauses to avoid browser/Supabase pressure
   */
  const handleCompressHeroImages = async () => {
    setCompressMigrating(true);
    setCompressProgress("Fetching articles…");

    const BATCH_SIZE = 5;
    const PAUSE_MS = 1_500;
    const SKIP_THRESHOLD = 300 * 1024;   // don't touch images already under 300 KB
    const MAX_W = 1920, MAX_H = 1080;
    const TARGET_BYTES = 500 * 1024;     // aim for ≤500 KB

    try {
      const { data: articles, error } = await supabase
        .from("articles")
        .select("id, slug, featured_image_url")
        .not("featured_image_url", "is", null)
        .neq("featured_image_url", "");

      if (error) throw error;
      if (!articles?.length) { toast.info("No articles found"); return; }

      let compressed = 0, skipped = 0, failed = 0;
      let savedKB = 0;
      const total = articles.length;

      for (let i = 0; i < total; i++) {
        const art = articles[i];
        setCompressProgress(`${i + 1}/${total}  ✓${compressed} ⏭${skipped} ✗${failed} — ${art.slug?.slice(0, 30)}`);

        const marker = "/article-images/";
        const mIdx = art.featured_image_url.indexOf(marker);
        if (mIdx === -1) { skipped++; continue; }

        try {
          // HEAD request to check size without downloading
          const headRes = await fetch(art.featured_image_url, { method: "HEAD" });
          const contentLength = Number(headRes.headers.get("content-length") || 0);
          if (contentLength > 0 && contentLength <= SKIP_THRESHOLD) { skipped++; continue; }

          // Download full image
          const res = await fetch(art.featured_image_url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          if (blob.size <= SKIP_THRESHOLD) { skipped++; continue; }

          const originalSize = blob.size;

          // Decode and resize via canvas
          const bitmap = await createImageBitmap(blob);
          let w = bitmap.width, h = bitmap.height;
          if (w > MAX_W || h > MAX_H) {
            const ratio = Math.min(MAX_W / w, MAX_H / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Check actual transparency (same logic as compressImage fix)
          let hasTransparency = false;
          if (blob.type === "image/png" || blob.type === "image/webp" || blob.type === "image/gif") {
            const checkW = Math.min(w, 512), checkH = Math.min(h, 512);
            const tmp = document.createElement("canvas");
            tmp.width = checkW; tmp.height = checkH;
            const tmpCtx = tmp.getContext("2d", { alpha: true })!;
            tmpCtx.drawImage(bitmap, 0, 0, checkW, checkH);
            const px = tmpCtx.getImageData(0, 0, checkW, checkH).data;
            for (let p = 3; p < px.length; p += 16) {
              if (px[p] < 250) { hasTransparency = true; break; }
            }
          }

          if (!hasTransparency) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, w, h);
          }
          ctx.drawImage(bitmap, 0, 0, w, h);

          // Always output JPEG unless truly transparent
          if (hasTransparency) { skipped++; continue; } // keep transparent PNGs as-is

          // Encode JPEG, step down quality until ≤ target
          let quality = 0.85;
          let jpegBlob: Blob | null = null;
          while (quality >= 0.4) {
            jpegBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", quality));
            if (jpegBlob && jpegBlob.size <= TARGET_BYTES) break;
            quality -= 0.07;
          }
          if (!jpegBlob || jpegBlob.size >= originalSize) { skipped++; continue; } // no gain

          // Upload compressed version (replace original path)
          const storagePath = art.featured_image_url.substring(mIdx + marker.length);
          const jpegPath = storagePath.replace(/\.[^/.]+$/, ".jpg");

          const { error: upErr } = await supabase.storage
            .from("article-images")
            .upload(jpegPath, jpegBlob, { contentType: "image/jpeg", upsert: true });
          if (upErr) throw upErr;

          // If extension changed (e.g. .png → .jpg), update the article's URL
          if (jpegPath !== storagePath) {
            const base = art.featured_image_url.substring(0, mIdx + marker.length);
            const newUrl = `${base}${jpegPath}`;
            await supabase.from("articles").update({ featured_image_url: newUrl }).eq("id", art.id);

            // Also remove the old file to save storage
            await supabase.storage.from("article-images").remove([storagePath]);
          }

          savedKB += Math.round((originalSize - jpegBlob.size) / 1024);
          compressed++;
        } catch (err: any) {
          console.warn(`Compress fail: ${art.slug}`, err);
          failed++;
        }

        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < total) {
          setCompressProgress(`Pausing after batch ${Math.ceil((i + 1) / BATCH_SIZE)}…`);
          await new Promise(r => setTimeout(r, PAUSE_MS));
        }
      }

      toast.success(`Compression done: ${compressed} optimised (${savedKB} KB saved), ${skipped} already fine, ${failed} failed`);
      setCompressProgress("");
    } catch (err: any) {
      toast.error("Compression failed", { description: err.message });
    } finally {
      setCompressMigrating(false);
    }
  };

  const { data: lastRefreshed } = useQuery({
    queryKey: ["trending-refresh-timestamp"],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_trending_refresh_timestamp');
      return data;
    },
  });

  const { data: reported404Count } = useQuery({
    queryKey: ["reported-404-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("page_not_found_log")
        .select("*", { count: "exact", head: true })
        .eq("user_reported", true)
        .eq("resolved", false);
      return count || 0;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <Card className="mb-8 border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Content Tools & Utilities
        </CardTitle>
        <CardDescription>
          Publishing operations, analytics, and content management tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trending Refresh */}
        <div className="mb-6 p-4 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={onRefreshTrending}
              variant="default"
              disabled={refreshingTrending}
              className="gap-2"
            >
              {refreshingTrending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Trending Now
            </Button>
            {lastRefreshed && (
              <span className="text-xs text-muted-foreground">
                Last refreshed: {format(new Date(lastRefreshed), "MMM d, yyyy 'at' h:mm a")}
              </span>
            )}
          </div>
        </div>

        {/* Publishing Tools */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Publishing & Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/publish-all")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Publish All Articles
            </Button>
            <Button onClick={() => navigate("/admin/bulk-seo")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Bulk SEO Generation
            </Button>
            <Button onClick={() => navigate("/admin/calendar")} variant="outline" className="justify-start border-muted-foreground/20 text-foreground hover:bg-muted">
              <Calendar className="h-4 w-4 mr-2" />
              Content Calendar
            </Button>
            <Button onClick={() => navigate("/admin/newsletter-performance")} variant="outline" className="justify-start border-muted-foreground/20 text-foreground hover:bg-muted">
              <TrendingUp className="h-4 w-4 mr-2" />
              Newsletter Analytics
            </Button>
            <Button 
              onClick={onRefreshContent} 
              variant="outline" 
              className="justify-start text-muted-foreground hover:text-foreground"
              disabled={refreshingContent}
            >
              {refreshingContent ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh Featured Content"
              )}
            </Button>
            <Button
              onClick={onScrapeEvents}
              variant="outline"
              className="justify-start text-muted-foreground hover:text-foreground"
              disabled={scrapingEvents}
            >
              {scrapingEvents ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scraping Events...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Scrape AI Events
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateOgImages}
              variant="outline"
              className="justify-start text-muted-foreground hover:text-foreground"
              disabled={ogMigrating}
            >
              {ogMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {ogProgress || "Generating…"}
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Generate OG Images
                </>
              )}
            </Button>
            <Button
              onClick={handleCompressHeroImages}
              variant="outline"
              className="justify-start text-muted-foreground hover:text-foreground"
              disabled={compressMigrating}
            >
              {compressMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {compressProgress || "Compressing…"}
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Compress Hero Images
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Analytics & Insights */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Analytics & Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/site-analytics")} variant="outline" className="justify-start border-primary/30 text-primary hover:bg-primary/10">
              <BarChart className="h-4 w-4 mr-2" />
              Site Analytics
            </Button>
            <Button onClick={() => navigate("/admin/analytics")} variant="outline" className="justify-start border-primary/30 text-primary hover:bg-primary/10">
              Content Analytics
            </Button>
            <Button onClick={() => navigate("/admin/seo-tools")} variant="outline" className="justify-start border-primary/30 text-primary hover:bg-primary/10">
              SEO Tools
            </Button>
            <Button
              onClick={() => navigate("/admin/404-analytics")}
              variant="outline"
              className={`justify-start relative ${reported404Count ? "border-orange-500/50 text-orange-500 hover:bg-orange-500/10" : "border-primary/30 text-primary hover:bg-primary/10"}`}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              404 Audit
              {reported404Count ? (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                  {reported404Count > 9 ? "9+" : reported404Count}
                </span>
              ) : null}
            </Button>
          </div>
        </div>

        {/* Management */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Content Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/newsletter-manager")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Mail className="h-4 w-4 mr-2" />
              Newsletter Manager
            </Button>
            <Button onClick={() => navigate("/admin/author-management")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Author Management
            </Button>
            <Button onClick={() => navigate("/admin/editors-picks")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Editor's Picks
            </Button>
            <Button onClick={() => navigate("/admin/category-sponsors")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Category Sponsors
            </Button>
            <Button onClick={() => navigate("/admin/ai-comments")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <MessageSquare className="h-4 w-4 mr-2" />
              AI Comments
            </Button>
            <Button onClick={() => navigate("/admin/knowledge-engine")} variant="outline" className="justify-start border-muted-foreground/20 text-foreground hover:bg-muted">
              <Wrench className="h-4 w-4 mr-2" />
              Knowledge Engine
            </Button>
            <Button onClick={() => navigate("/admin/guide-editor")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Create New Guide
            </Button>
            <Button onClick={() => navigate("/admin/guides")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              Manage Guides
            </Button>
            <Button onClick={() => navigate("/admin/internal-links")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Link2 className="h-4 w-4 mr-2" />
              Internal Links Manager
            </Button>
            <Button onClick={() => navigate("/admin/fix-broken-links")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Link2 className="h-4 w-4 mr-2" />
              Fix Broken Links
            </Button>
            <Button onClick={() => navigate("/admin/link-health")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Activity className="h-4 w-4 mr-2" />
              Link Health Monitor
            </Button>
            <Button onClick={() => navigate("/admin/content-freshness")} variant="outline" className="justify-start text-muted-foreground hover:text-foreground">
              <Clock className="h-4 w-4 mr-2" />
              Content Freshness Tracker
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

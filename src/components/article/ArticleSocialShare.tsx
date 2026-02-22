import { useState, useEffect, useCallback, memo } from "react";
import { Linkedin, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareHandlers, getShareUrl, getArticleUrl } from "@/lib/socialShare";


// X (Twitter) icon – simple SVG since lucide doesn't have the X logo
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// WhatsApp icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface ArticleSocialShareProps {
  categorySlug: string;
  articleSlug: string;
  articleTitle: string;
}

/* ── Inline share row (used in article header area) ── */
export const ArticleShareInline = memo(({ categorySlug, articleSlug, articleTitle }: ArticleSocialShareProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = getShareUrl(`/${categorySlug}/${articleSlug}`);
  const directUrl = getArticleUrl(categorySlug, articleSlug);

  const handleCopy = useCallback(async () => {
    const ok = await shareHandlers.copyToClipboard(directUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [directUrl]);

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#0A66C2] cursor-pointer" onClick={() => shareHandlers.linkedin(shareUrl)} title="Share on LinkedIn">
        <Linkedin className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => shareHandlers.twitter(shareUrl, articleTitle)} title="Share on X">
        <XIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#25D366] cursor-pointer" onClick={() => shareHandlers.whatsapp(directUrl, articleTitle)} title="Share on WhatsApp">
        <WhatsAppIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-teal-500 cursor-pointer relative" onClick={handleCopy} title="Copy link">
        {copied ? <Check className="h-4 w-4 text-teal-500" /> : <Link2 className="h-4 w-4" />}
        {copied && (
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-foreground text-background px-2 py-0.5 rounded whitespace-nowrap">
            Copied!
          </span>
        )}
      </Button>
    </div>
  );
});
ArticleShareInline.displayName = "ArticleShareInline";

/* ── Floating sidebar (desktop only) ── */
export const ArticleShareFloating = memo(({ categorySlug, articleSlug, articleTitle }: ArticleSocialShareProps) => {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = getShareUrl(`/${categorySlug}/${articleSlug}`);
  const directUrl = getArticleUrl(categorySlug, articleSlug);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const footer = document.querySelector("footer");
      const youMightAlsoLike = document.querySelector("[data-section='you-might-also-like']");
      const cutoff = youMightAlsoLike?.getBoundingClientRect().top ?? footer?.getBoundingClientRect().top ?? Infinity;
      setVisible(scrollY > 400 && cutoff > 200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopy = useCallback(async () => {
    const ok = await shareHandlers.copyToClipboard(directUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [directUrl]);

  if (!visible) return null;

  return (
    <div className="hidden xl:flex fixed left-[max(1rem,calc(50%-600px))] top-1/3 z-30 flex-col gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 cursor-pointer" onClick={() => shareHandlers.linkedin(shareUrl)} title="Share on LinkedIn">
        <Linkedin className="h-[18px] w-[18px]" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" onClick={() => shareHandlers.twitter(shareUrl, articleTitle)} title="Share on X">
        <XIcon className="h-[18px] w-[18px]" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 cursor-pointer" onClick={() => shareHandlers.whatsapp(directUrl, articleTitle)} title="Share on WhatsApp">
        <WhatsAppIcon className="h-[18px] w-[18px]" />
      </Button>
      <div className="relative">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-teal-500 hover:bg-teal-500/10 cursor-pointer" onClick={handleCopy} title="Copy link">
          {copied ? <Check className="h-[18px] w-[18px] text-teal-500" /> : <Link2 className="h-[18px] w-[18px]" />}
        </Button>
        {copied && (
          <span className="absolute left-11 top-1/2 -translate-y-1/2 text-[10px] bg-foreground text-background px-2 py-0.5 rounded whitespace-nowrap">
            Copied!
          </span>
        )}
      </div>
    </div>
  );
});
ArticleShareFloating.displayName = "ArticleShareFloating";

/* ── Mobile bottom share bar ── */
export const ArticleShareMobileBar = memo(({ categorySlug, articleSlug, articleTitle }: ArticleSocialShareProps) => {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = getShareUrl(`/${categorySlug}/${articleSlug}`);
  const directUrl = getArticleUrl(categorySlug, articleSlug);

  useEffect(() => {
    let lastScrollY = 0;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nearEnd = scrollY > docHeight - 200;
      const pastHero = scrollY > 300;
      setVisible(pastHero && !nearEnd);
      lastScrollY = scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopy = useCallback(async () => {
    const ok = await shareHandlers.copyToClipboard(directUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [directUrl]);

  if (!visible) return null;

  // This renders below the existing MobileActionBar (which is at bottom-0)
  // We place this just above it
  return (
    <div className="fixed bottom-12 inset-x-0 z-30 md:hidden animate-in slide-in-from-bottom duration-200">
      <div className="h-10 bg-background/80 backdrop-blur-sm border-t border-border/50 flex items-center justify-center gap-6 px-4">
        <button className="text-muted-foreground hover:text-[#0A66C2] transition-colors cursor-pointer" onClick={() => shareHandlers.linkedin(shareUrl)} title="LinkedIn">
          <Linkedin className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => shareHandlers.twitter(shareUrl, articleTitle)} title="X">
          <XIcon className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:text-[#25D366] transition-colors cursor-pointer" onClick={() => shareHandlers.whatsapp(directUrl, articleTitle)} title="WhatsApp">
          <WhatsAppIcon className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:text-teal-500 transition-colors relative cursor-pointer" onClick={handleCopy} title="Copy link">
          {copied ? <Check className="h-4 w-4 text-teal-500" /> : <Link2 className="h-4 w-4" />}
          {copied && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-foreground text-background px-2 py-0.5 rounded whitespace-nowrap">
              Copied!
            </span>
          )}
        </button>
      </div>
    </div>
  );
});
ArticleShareMobileBar.displayName = "ArticleShareMobileBar";

import { useState, useEffect, useCallback, memo } from "react";
import { Linkedin, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareHandlers, getShareUrl, getArticleUrl } from "@/lib/socialShare";


// X (Twitter) icon
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// LINE icon
const LineIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
  </svg>
);

// TikTok icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.82a8.17 8.17 0 0 0 4.77 1.53V6.9a4.84 4.84 0 0 1-1.01-.21z" />
  </svg>
);

// WeChat icon
const WeChatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.42 6.42 0 0 1-.246-1.753c0-3.74 3.46-6.775 7.725-6.775.267 0 .526.015.783.04C16.792 4.31 13.154 2.187 8.691 2.187zm-2.6 5.307a1.09 1.09 0 1 1 0-2.182 1.09 1.09 0 0 1 0 2.182zm5.394 0a1.09 1.09 0 1 1 0-2.182 1.09 1.09 0 0 1 0 2.182zm4.523 10.317c-3.685 0-6.673-2.613-6.673-5.833 0-3.22 2.988-5.834 6.673-5.834S22.68 8.76 22.68 11.98c0 1.732-.929 3.345-2.473 4.47a.482.482 0 0 0-.173.54l.266 1.027c.013.049.033.096.033.148 0 .133-.107.24-.24.24a.27.27 0 0 1-.136-.044l-1.316-.77a.704.704 0 0 0-.585-.08 8.506 8.506 0 0 1-2.048.25zm-2.27-4.07a.884.884 0 1 1 0-1.77.884.884 0 0 1 0 1.77zm4.38 0a.884.884 0 1 1 0-1.77.884.884 0 0 1 0 1.77z" />
  </svg>
);

// WhatsApp icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

/** Try native share (mobile) → fallback to copy */
const nativeShareOrCopy = async (url: string, title: string): Promise<boolean> => {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return true;
    } catch { /* user cancelled */ }
  }
  return shareHandlers.copyToClipboard(url);
};

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
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#25D366] cursor-pointer" onClick={() => shareHandlers.whatsapp(directUrl, articleTitle)} title="Share on WhatsApp">
        <WhatsAppIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#0A66C2] cursor-pointer" onClick={() => shareHandlers.linkedin(shareUrl)} title="Share on LinkedIn">
        <Linkedin className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#229ED9] cursor-pointer" onClick={() => shareHandlers.telegram(directUrl, articleTitle)} title="Share on Telegram">
        <TelegramIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#00B900] cursor-pointer" onClick={() => shareHandlers.line(directUrl)} title="Share on LINE">
        <LineIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => shareHandlers.twitter(shareUrl, articleTitle)} title="Share on X">
        <XIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" onClick={handleCopy} title="Share on TikTok (copy link)">
        <TikTokIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#07C160] cursor-pointer" onClick={handleCopy} title="Share on WeChat (copy link)">
        <WeChatIcon className="h-4 w-4" />
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
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 cursor-pointer" onClick={() => shareHandlers.whatsapp(directUrl, articleTitle)} title="Share on WhatsApp">
        <WhatsAppIcon className="h-[18px] w-[18px]" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 cursor-pointer" onClick={() => shareHandlers.linkedin(shareUrl)} title="Share on LinkedIn">
        <Linkedin className="h-[18px] w-[18px]" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-[#229ED9] hover:bg-[#229ED9]/10 cursor-pointer" onClick={() => shareHandlers.telegram(directUrl, articleTitle)} title="Share on Telegram">
        <TelegramIcon className="h-[18px] w-[18px]" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-[#00B900] hover:bg-[#00B900]/10 cursor-pointer" onClick={() => shareHandlers.line(directUrl)} title="Share on LINE">
        <LineIcon className="h-[18px] w-[18px]" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" onClick={() => shareHandlers.twitter(shareUrl, articleTitle)} title="Share on X">
        <XIcon className="h-[18px] w-[18px]" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" onClick={handleCopy} title="Share on TikTok (copy link)">
        <TikTokIcon className="h-[18px] w-[18px]" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-[#07C160] hover:bg-[#07C160]/10 cursor-pointer" onClick={handleCopy} title="Share on WeChat (copy link)">
        <WeChatIcon className="h-[18px] w-[18px]" />
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
      <div className="h-10 bg-background/80 backdrop-blur-sm border-t border-border/50 flex items-center justify-center gap-4 px-4">
        <button className="text-muted-foreground hover:text-[#25D366] transition-colors cursor-pointer" onClick={() => shareHandlers.whatsapp(directUrl, articleTitle)} title="WhatsApp">
          <WhatsAppIcon className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:text-[#0A66C2] transition-colors cursor-pointer" onClick={() => shareHandlers.linkedin(shareUrl)} title="LinkedIn">
          <Linkedin className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:text-[#229ED9] transition-colors cursor-pointer" onClick={() => shareHandlers.telegram(directUrl, articleTitle)} title="Telegram">
          <TelegramIcon className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:text-[#00B900] transition-colors cursor-pointer" onClick={() => shareHandlers.line(directUrl)} title="LINE">
          <LineIcon className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => shareHandlers.twitter(shareUrl, articleTitle)} title="X">
          <XIcon className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={handleCopy} title="TikTok (copy link)">
          <TikTokIcon className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:text-[#07C160] transition-colors cursor-pointer" onClick={handleCopy} title="WeChat (copy link)">
          <WeChatIcon className="h-4 w-4" />
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

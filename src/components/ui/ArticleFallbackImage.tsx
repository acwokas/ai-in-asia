import { useState, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { getCategoryGradient } from "@/lib/categoryColors";

const FALLBACK_IMAGE_URL =
  "https://pbmtnvxywplgpldmlygv.supabase.co/storage/v1/object/public/article-images/defaults/aiinasia-favicon.png";

const BANNED_FALLBACK_URLS = [
  "aiinasia-logo",
  "aiinasia-default",
  "aiinasia-512",
  "aiinasia-og-default",
  "/placeholder.svg",
];

function isBannedOrEmpty(src?: string | null): boolean {
  if (!src || src.trim() === "") return true;
  const lower = src.toLowerCase();
  return BANNED_FALLBACK_URLS.some((b) => lower.includes(b));
}

interface ArticleFallbackImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  src?: string | null;
  /** Pass category slug to show a colour-coded gradient instead of the generic favicon fallback */
  categorySlug?: string | null;
}

export function ArticleFallbackImage({
  src,
  alt,
  className,
  style,
  categorySlug,
  ...rest
}: ArticleFallbackImageProps) {
  const [useFallback, setUseFallback] = useState(() => isBannedOrEmpty(src));

  // Re-evaluate when src changes
  useEffect(() => {
    setUseFallback(isBannedOrEmpty(src));
  }, [src]);

  const handleError = () => {
    setUseFallback(true);
  };

  // When falling back AND a category slug is provided, render a gradient div
  if (useFallback && categorySlug) {
    const gradient = getCategoryGradient(categorySlug);
    return (
      <div
        role="img"
        aria-label={alt || ""}
        className={cn("flex items-center justify-center", className)}
        style={{
          background: gradient,
          width: rest.width ? `${rest.width}px` : undefined,
          height: rest.height ? `${rest.height}px` : undefined,
          ...style,
        }}
      >
        <span
          className="text-white/70 font-semibold uppercase tracking-wider select-none"
          style={{ fontSize: "clamp(0.55rem, 1.2vw, 0.85rem)" }}
        >
          {categorySlug}
        </span>
      </div>
    );
  }

  const imgSrc = useFallback ? FALLBACK_IMAGE_URL : (src as string);

  const fallbackStyle: React.CSSProperties = useFallback
    ? { objectFit: "contain", background: "#1a1a2e", padding: "1rem" }
    : { objectFit: "cover" };

  return (
    <img
      {...rest}
      src={imgSrc}
      alt={alt}
      className={className}
      style={{ ...fallbackStyle, ...style }}
      onError={useFallback ? undefined : handleError}
    />
  );
}

export { FALLBACK_IMAGE_URL };

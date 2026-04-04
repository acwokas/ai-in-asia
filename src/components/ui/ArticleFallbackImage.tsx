import { useState, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { getCategoryFallbackImage } from "@/lib/categoryColors";

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
  /** Pass category slug to show a category-specific gradient image from Storage */
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

  // Pick fallback: category gradient image from Storage if slug provided, else generic favicon
  const imgSrc = useFallback
    ? (categorySlug ? getCategoryFallbackImage(categorySlug) : FALLBACK_IMAGE_URL)
    : (src as string);

  // Only apply special contain styling for the generic favicon fallback (no categorySlug)
  const fallbackStyle: React.CSSProperties = useFallback && !categorySlug
    ? { objectFit: "contain", background: "#1a1a2e", padding: "1rem" }
    : { objectFit: "cover" };

  return (
    <img
      loading="lazy"
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

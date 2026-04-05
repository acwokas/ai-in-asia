import { useState, useEffect, useRef, memo, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";
import { getCategoryFallbackImage } from "@/lib/categoryColors";

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

function buildSrcSet(src: string, widths: number[] = [400, 800, 1200]): string | undefined {
  if (!src.includes("supabase.co/storage")) return undefined;

  try {
    const baseUrl = new URL(src);

    return widths
      .map((width) => {
        const candidateUrl = new URL(baseUrl.toString());
        candidateUrl.searchParams.set("width", width.toString());
        return `${candidateUrl.toString()} ${width}w`;
      })
      .join(", ");
  } catch {
    return undefined;
  }
}

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError" | "onLoad"> {
  src?: string | null;
  alt: string;
  categorySlug?: string | null;
  /** Responsive widths for srcset generation */
  responsiveWidths?: number[];
  /** Aspect ratio CSS value e.g. "16/9" */
  aspectRatio?: string;
  /** eager for hero images */
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}

export const OptimizedImage = memo(({
  src,
  alt,
  className,
  style,
  categorySlug,
  responsiveWidths,
  aspectRatio,
  loading = "lazy",
  fetchPriority = "auto",
  sizes,
  ...rest
}: OptimizedImageProps) => {
  const isBanned = isBannedOrEmpty(src);
  const resolvedSrc = isBanned
    ? (categorySlug ? getCategoryFallbackImage(categorySlug) : getCategoryFallbackImage(null))
    : (src as string);

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === "eager");
  const [showSkeleton, setShowSkeleton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading === "eager" || !containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px", threshold: 0.01 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading]);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setShowSkeleton(false);
    // Only show skeleton if image hasn't loaded within 100ms (avoids flash for cached images)
    const timer = setTimeout(() => setShowSkeleton(true), 100);
    return () => clearTimeout(timer);
  }, [src]);

  const srcSet = buildSrcSet(resolvedSrc, responsiveWidths);

  const containerStyle: React.CSSProperties = {
    ...(aspectRatio ? { aspectRatio } : {}),
    ...style,
  };

  if (hasError) {
    return (
      <div
        ref={containerRef}
        className={cn("relative overflow-hidden flex items-center justify-center bg-muted", className)}
        style={containerStyle}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="h-6 w-6 text-muted-foreground/40" />
      </div>
    );
  }

  // For generic favicon fallback (no category), use contain
  const objectStyle: React.CSSProperties =
    isBanned && !categorySlug
      ? { objectFit: "contain", background: "hsl(var(--muted))", padding: "1rem" }
      : { objectFit: "cover" };

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)} style={containerStyle}>
      {/* Skeleton placeholder – only shown if image takes >100ms to load */}
      {showSkeleton && !isLoaded && (
        <div
          className="absolute inset-0 bg-muted animate-pulse rounded-lg"
        />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={resolvedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={loading}
          decoding={loading === "eager" ? "auto" : "async"}
          fetchPriority={fetchPriority}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "w-full h-full transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={objectStyle}
          {...rest}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

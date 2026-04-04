import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface ProgressiveImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  onLoad?: () => void;
}

/**
 * Progressive image component with blur-up effect and intersection observer
 * Loads a tiny placeholder, then swaps to full image with smooth transition
 */
export const ProgressiveImage = memo(({
  src,
  srcSet,
  sizes,
  alt,
  className,
  width,
  height,
  loading = "lazy",
  fetchPriority = "auto",
  onLoad,
}: ProgressiveImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === "eager");
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === "eager" || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px", // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [loading]);

  // Delay placeholder to avoid flash on cached images
  useEffect(() => {
    setIsLoaded(false);
    setShowPlaceholder(false);
    const timer = setTimeout(() => setShowPlaceholder(true), 100);
    return () => clearTimeout(timer);
  }, [src]);

  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  // Generate tiny placeholder (10px width) for blur-up effect
  const placeholderSrc = src.includes('supabase.co/storage')
    ? `${src}?width=10&quality=50`
    : src;

  if (hasError) {
    return (
      <div
        ref={imgRef}
        className={cn(
          "relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-muted to-muted/60",
          className
        )}
        style={{ width: width || "100%", height: height || "100%" }}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Blurred placeholder – only if image takes >100ms */}
      {showPlaceholder && !isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Full resolution image */}
      {isInView && (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          fetchPriority={fetchPriority}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      
      {/* Loading spinner for eager loading */}
      {loading === "eager" && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});

ProgressiveImage.displayName = "ProgressiveImage";

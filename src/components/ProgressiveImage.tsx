import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";

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

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Generate tiny placeholder (10px width) for blur-up effect
  const placeholderSrc = src.includes('supabase.co/storage')
    ? `${src}?width=10&quality=50`
    : src;

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Tiny blurred placeholder */}
      <img
        src={placeholderSrc}
        alt=""
        aria-hidden="true"
        className={cn(
          "absolute inset-0 w-full h-full object-cover blur-xl scale-110 transition-opacity duration-500",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      />
      
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

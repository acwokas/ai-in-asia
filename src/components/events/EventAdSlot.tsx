import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AdSlotData {
  id: string;
  name: string;
  image_url: string | null;
  click_url: string | null;
  alt_text: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
}

interface EventAdSlotProps {
  ad: AdSlotData | null | undefined;
  variant?: "banner" | "skyscraper" | "square";
  className?: string;
  label?: string;
}

export default function EventAdSlot({ ad, variant = "banner", className, label = "Sponsored" }: EventAdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(false);

  // Track impression when ad enters viewport
  useEffect(() => {
    if (!ad || impressionTracked.current) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionTracked.current) {
          impressionTracked.current = true;
          // Fire-and-forget impression increment
          supabase
            .from("event_ad_slots")
            .update({ impression_count: (ad as any).impression_count + 1 })
            .eq("id", ad.id)
            .then(() => {});
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ad]);

  const handleClick = useCallback(() => {
    if (!ad) return;
    supabase
      .from("event_ad_slots")
      .update({ click_count: ((ad as any).click_count || 0) + 1 })
      .eq("id", ad.id)
      .then(() => {});
  }, [ad]);

  if (!ad || !ad.image_url) return null;

  const heightClasses = {
    banner: "min-h-[90px] max-h-[250px]",
    skyscraper: "min-h-[400px] max-h-[600px]",
    square: "min-h-[200px] max-h-[300px]",
  };

  return (
    <div ref={containerRef} className={cn("rounded-lg border border-border/50 bg-card/50 overflow-hidden", className)}>
      <span className="block px-3 pt-2 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
        {label}
      </span>
      <div className={cn("flex items-center justify-center p-3", heightClasses[variant])}>
        {ad.click_url ? (
          <a
            href={ad.click_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleClick}
            className="block w-full h-full"
          >
            <img
              src={ad.image_url}
              alt={ad.alt_text || "Advertisement"}
              loading="lazy"
              className="w-full h-full object-contain rounded"
            />
          </a>
        ) : (
          <img
            src={ad.image_url}
            alt={ad.alt_text || "Advertisement"}
            loading="lazy"
            className="w-full h-full object-contain rounded"
          />
        )}
      </div>
      {ad.sponsor_name && (
        <div className="px-3 pb-2 flex items-center gap-2">
          {ad.sponsor_logo_url && (
            <img src={ad.sponsor_logo_url} alt={ad.sponsor_name} className="h-4 w-auto" loading="lazy" />
          )}
          <span className="text-[10px] text-muted-foreground/50">{ad.sponsor_name}</span>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const GOOGLE_ADS_CLIENT = "ca-pub-4181437297386228";

interface AdUnitProps {
  slot: string;
  format?: string;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  layout?: string;
  label?: string;
}

const AdUnit = ({
  slot,
  format = "auto",
  responsive = true,
  className,
  style,
  layout,
  label = "Advertisement",
}: AdUnitProps) => {
  const pushed = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD || pushed.current) return;
    pushed.current = true;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense push error:", err);
    }
  }, []);

  if (!import.meta.env.PROD) {
    return (
      <div className={cn("overflow-hidden", className)} style={style}>
        <p className="text-[10px] text-muted-foreground/50 text-center mb-1 uppercase tracking-wider">
          {label}
        </p>
        <div
          className="bg-muted/50 border border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-xs"
          style={{ minHeight: format === "vertical" || format === "rectangle" ? "250px" : "100px" }}
        >
          Ad: {slot} ({format})
        </div>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden", className)} style={style}>
      <p className="text-[10px] text-muted-foreground/50 text-center mb-1 uppercase tracking-wider">
        {label}
      </p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={GOOGLE_ADS_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layout ? { "data-ad-layout": layout } : {})}
        data-full-width-responsive={responsive.toString()}
      />
    </div>
  );
};

export default AdUnit;

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Globe, Wrench, Building2, BookOpen } from "lucide-react";

const useCountUp = (target: number, duration = 1800) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!target || started.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
};

const HomepageStatsBar = () => {
  const { data: stats } = useQuery({
    queryKey: ["homepage-stats-bar"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [articlesRes, companiesRes, guidesRes] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("ai_companies").select("id", { count: "exact", head: true }),
        supabase.from("ai_guides").select("id", { count: "exact", head: true }).eq("status", "published"),
      ]);
      return {
        articles: articlesRes.count || 0,
        companies: companiesRes.count || 0,
        guides: guidesRes.count || 0,
      };
    },
  });

  const articleCount = useCountUp(stats?.articles || 0);
  const guidesCount = useCountUp(stats?.guides || 0);
  const countriesCount = useCountUp(12);
  const toolsCount = useCountUp(15);
  const companiesCount = useCountUp(stats?.companies || 0);

  const items = [
    { icon: FileText, label: "Articles Published", value: articleCount.count, ref: articleCount.ref, suffix: "+" },
    { icon: BookOpen, label: "AI Guides", value: guidesCount.count, ref: guidesCount.ref, suffix: "+" },
    { icon: Globe, label: "Countries Covered", value: countriesCount.count, ref: countriesCount.ref, suffix: "+" },
    { icon: Wrench, label: "Interactive Tools", value: toolsCount.count, ref: toolsCount.ref, suffix: "" },
    { icon: Building2, label: "AI Companies Tracked", value: companiesCount.count, ref: companiesCount.ref, suffix: "+" },
  ];

  return (
    <section className="border-y border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {items.map((item) => (
            <div key={item.label} ref={item.ref} className="text-center">
              <div className="flex items-center justify-center mb-2">
                <item.icon className="w-5 h-5 text-[hsl(var(--primary))] mr-2" />
                <span className="text-2xl md:text-3xl font-bold text-[#F28C0F]">
                  {item.value.toLocaleString()}{item.suffix}
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomepageStatsBar;

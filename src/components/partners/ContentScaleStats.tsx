import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, BookOpen, MessageSquareText, Wrench, Globe } from "lucide-react";
import { useCountUp } from "./useCountUp";
import { useFadeInOnScroll } from "./useFadeInOnScroll";

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
}

function StatItem({ icon, value, suffix = "+", label }: StatItemProps) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center space-y-2">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mx-auto">
        {icon}
      </div>
      <div className="text-3xl md:text-4xl font-bold text-foreground tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default function ContentScaleStats() {
  const { ref, isVisible } = useFadeInOnScroll();

  const { data: articleCount } = useQuery({
    queryKey: ["partner-stats-articles"],
    queryFn: async () => {
      const { count } = await supabase
        .from("articles")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");
      return count ?? 1400;
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: guideCount } = useQuery({
    queryKey: ["partner-stats-guides"],
    queryFn: async () => {
      const { count } = await supabase
        .from("ai_guides")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");
      return count ?? 730;
    },
    staleTime: 1000 * 60 * 60,
  });

  const stats = [
    { icon: <FileText className="h-5 w-5" />, value: articleCount ?? 1400, label: "Articles Published" },
    { icon: <BookOpen className="h-5 w-5" />, value: guideCount ?? 730, label: "Guides and Tutorials" },
    { icon: <MessageSquareText className="h-5 w-5" />, value: 461, label: "AI Prompts" },
    { icon: <Wrench className="h-5 w-5" />, value: 12, label: "Interactive Tools" },
    { icon: <Globe className="h-5 w-5" />, value: 11, suffix: "", label: "Asia-Pacific Regions" },
  ];

  return (
    <section
      ref={ref}
      className={`py-16 md:py-20 border-y border-border/50 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="headline text-2xl md:text-3xl font-bold text-center mb-12">
          Why Partner With Us
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-4">
          {stats.map((s) => (
            <StatItem key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

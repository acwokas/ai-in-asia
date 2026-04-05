import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, ChevronDown, ChevronUp, ArrowRight, CheckCircle2 } from "lucide-react";

const guideHref = (slug: string, topicCategory?: string | null) => {
  const cat = (topicCategory || "general").toLowerCase().replace(/\s+/g, "-");
  return `/guides/${cat}/${slug}`;
};

const PATH_DEFS = [
  { key: "business-leaders", title: "AI for Business Leaders", description: "Strategic frameworks for integrating AI into your organization.", filter: (g: any) => g.topic_category?.toLowerCase() === "business", gradient: "from-blue-600 to-blue-800" },
  { key: "prompt-engineering", title: "Master Prompt Engineering", description: "Level up your prompting skills from basics to advanced techniques.", filter: (g: any) => g.topic_category?.toLowerCase() === "productivity" || g.topic_category?.toLowerCase() === "work", gradient: "from-purple-600 to-violet-800" },
  { key: "getting-started", title: "Getting Started with AI", description: "New to AI? Start here with beginner-friendly guides.", filter: (g: any) => g.difficulty?.toLowerCase() === "beginner", gradient: "from-amber-500 to-orange-700" },
  { key: "creative-toolkit", title: "Creative AI Toolkit", description: "Unlock creative potential with AI for art, writing, and media.", filter: (g: any) => g.topic_category?.toLowerCase() === "creators" || g.topic_category?.toLowerCase() === "content", gradient: "from-pink-500 to-rose-700" },
] as const;

const LS_KEY = "guide-learning-path-progress";

function getProgress(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}

function markRead(pathKey: string, guideId: string) {
  const prog = getProgress();
  const arr = prog[pathKey] || [];
  if (!arr.includes(guideId)) arr.push(guideId);
  prog[pathKey] = arr;
  localStorage.setItem(LS_KEY, JSON.stringify(prog));
}

const GuideLearningPaths = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: pathGuides } = useQuery({
    queryKey: ["learning-path-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, topic_category, difficulty, read_time_minutes, featured_image_url")
        .eq("status", "published")
        .eq("show_in_learning_paths", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const paths = useMemo(() => {
    if (!pathGuides) return [];
    return PATH_DEFS.map((def) => {
      const guides = pathGuides.filter(def.filter);
      const totalMinutes = guides.reduce((s, g) => s + (g.read_time_minutes || 5), 0);
      return { ...def, guides, totalMinutes };
    }).filter((p) => p.guides.length > 0);
  }, [pathGuides]);

  const progress = useMemo(() => getProgress(), [expanded]);

  if (paths.length === 0) return null;

  return (
    <section className="border-b border-border py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Learning Paths</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {paths.map((path) => {
            const read = (progress[path.key] || []).length;
            const total = path.guides.length;
            const pct = total > 0 ? Math.round((read / total) * 100) : 0;
            const isOpen = expanded === path.key;

            return (
              <div key={path.key} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : path.key)}
                  className={`w-full text-left p-5 bg-gradient-to-br ${path.gradient} transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-white">{path.title}</h3>
                      <p className="text-xs text-white/70">{path.description}</p>
                      <div className="flex items-center gap-3 text-xs text-white/60 pt-1">
                        <span>{total} guides</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{path.totalMinutes} min total</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-white/60 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-white/60 shrink-0 mt-1" />}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-white/50">{read}/{total} completed</span>
                    <span className="text-xs font-semibold text-white flex items-center gap-1">
                      {read === 0 ? "Start Path" : read >= total ? "Completed!" : "Continue"} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </button>

                {/* Expanded guide list */}
                {isOpen && (
                  <div className="divide-y divide-border">
                    {path.guides.map((g, i) => {
                      const isRead = (progress[path.key] || []).includes(g.id);
                      return (
                        <Link
                          key={g.id}
                          to={guideHref(g.slug, g.topic_category)}
                          onClick={() => markRead(path.key, g.id)}
                          className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors group"
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isRead ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                            {isRead ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                          </span>
                          {g.featured_image_url ? (
                            <img src={g.featured_image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" loading="lazy" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{g.title}</p>
                            <span className="text-[10px] text-muted-foreground">{g.read_time_minutes || 5} min</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GuideLearningPaths;

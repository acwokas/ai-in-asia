import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "@/components/category/SectionHeader";
import { iconMap } from "@/lib/iconMap";
import type React from "react";

interface LearningPath {
  slug: string;
  emoji: string;
  title: string;
  desc: string;
  articles: number;
  time: string;
  color: string;
}

interface CategoryLearningPathsProps {
  paths: LearningPath[];
  categorySlug: string;
  revealProps: {
    ref: React.Ref<HTMLDivElement>;
    visible: boolean;
    style: React.CSSProperties;
  };
  accent: string;
}

export function CategoryLearningPaths({ paths, categorySlug, revealProps, accent }: CategoryLearningPathsProps) {
  if (paths.length === 0) return null;

  return (
    <section ref={revealProps.ref} style={{ marginBottom: 40, ...revealProps.style }}>
      <SectionHeader title="Learning Paths" emoji="map" color={accent} subtitle="Curated sequences to guide your reading" />
      <div className="flex flex-wrap gap-2">
        {paths.map((p) => (
          <LearningPathTag key={p.slug} path={p} categorySlug={categorySlug} />
        ))}
      </div>
    </section>
  );
}

function LearningPathTag({ path, categorySlug }: { path: LearningPath; categorySlug: string }) {
  const [readCount, setReadCount] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`lp-read-${categorySlug}-${path.slug}`);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        setReadCount(ids.length);
      }
    } catch { /* ignore */ }
  }, [categorySlug, path.slug]);

  const progressPercent = path.articles > 0 ? Math.min(100, Math.round((readCount / path.articles) * 100)) : 0;
  const isComplete = progressPercent >= 100;

  const Icon = iconMap[path.emoji];

  return (
    <Link
      to={`/category/${categorySlug}/learn/${path.slug}`}
      className="group inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:border-amber-500/60 hover:bg-amber-500/10 hover:text-amber-500 hover:shadow-sm"
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 transition-colors group-hover:text-amber-500" style={{ color: path.color }} />}
      <span className="transition-colors group-hover:text-amber-500">{path.title}</span>
      <span className="text-xs opacity-60">{path.articles}</span>
      {isComplete && <span className="text-[10px]">✓</span>}
      {readCount > 0 && !isComplete && (
        <span className="text-[10px] opacity-50">{readCount}/{path.articles}</span>
      )}
    </Link>
  );
}

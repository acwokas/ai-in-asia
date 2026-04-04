import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "@/components/category/SectionHeader";
import { iconMap } from "@/lib/iconMap";
import { ArrowRight } from "lucide-react";
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paths.map((p) => (
          <LearningPathCard key={p.slug} path={p} categorySlug={categorySlug} />
        ))}
      </div>
    </section>
  );
}

function LearningPathCard({ path, categorySlug }: { path: LearningPath; categorySlug: string }) {
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
      className="group block rounded-xl border-l-4 border-amber-500 bg-gray-800/60 p-5 transition-all duration-200 hover:bg-gray-700/60 hover:shadow-lg"
      style={{ textDecoration: "none" }}
    >
      <div className="flex items-start gap-3 mb-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
            <Icon className="h-5 w-5 text-amber-500" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white leading-tight mb-1 group-hover:text-amber-400 transition-colors">
            {path.title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2">{path.desc}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{path.articles} articles</span>
          <span>·</span>
          <span>{path.time}</span>
          {readCount > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-500 font-semibold">
                {isComplete ? "✓ Complete" : `${readCount}/${path.articles} read`}
              </span>
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-500 transition-all group-hover:bg-amber-500 group-hover:text-black">
          {isComplete ? "Review" : "Start"} <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      {readCount > 0 && !isComplete && (
        <div className="mt-3 h-1 w-full rounded-full bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </Link>
  );
}

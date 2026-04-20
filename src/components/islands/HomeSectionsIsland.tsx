import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image_url?: string;
  reading_time_minutes?: number;
  published_at?: string;
  categories?: { name: string; slug: string } | null;
  authors?: { name: string } | null;
}

interface Props {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export default function HomeSectionsIsland({ supabaseUrl, supabaseAnonKey }: Props) {
  const [mostRead, setMostRead] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

  useEffect(() => {
    supabase
      .from('articles')
      .select(`
        id, title, slug, featured_image_url, reading_time_minutes, published_at,
        authors:author_id (name),
        categories:primary_category_id (name, slug)
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { setMostRead(data as Article[] || []); setLoading(false); });
  }, []);

  if (loading || mostRead.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8 border-t border-border/30">
      <h2 className="text-xs font-bold mb-4 text-muted-foreground uppercase tracking-widest">More Stories</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
        {mostRead.map((article, i) => (
          <a
            key={article.id}
            href={`/${article.categories?.slug || 'news'}/${article.slug}`}
            className="group flex gap-3 items-start py-2 border-b border-border/20"
          >
            <span className="text-4xl font-black text-muted-foreground/20 leading-none w-10 shrink-0 select-none tabular-nums">
              {i + 1}
            </span>
            <div>
              <h3 className="text-sm font-semibold leading-snug group-hover:underline line-clamp-3">{article.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {article.categories && <span>{article.categories.name}</span>}
                {article.reading_time_minutes && <span>· {article.reading_time_minutes} min</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

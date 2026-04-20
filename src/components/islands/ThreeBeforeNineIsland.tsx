import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const BRAND = '#5F72FF';

interface Signal {
  headline?: string;
  body?: string;
  source?: string;
  sourceUrl?: string;
  [key: string]: unknown;
}

interface Props {
  article: Record<string, unknown>;
  audioUrl: string | null;
  canonicalUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export default function ThreeBeforeNineIsland({ article, audioUrl, canonicalUrl, supabaseUrl, supabaseAnonKey }: Props) {
  const [recentEditions, setRecentEditions] = useState<Array<Record<string, unknown>>>([]);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

  useEffect(() => {
    supabase
      .from('articles')
      .select('id, title, slug, published_at, categories:primary_category_id(slug)')
      .eq('status', 'published')
      .eq('article_type', 'three_before_nine')
      .neq('id', article.id as string)
      .order('published_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentEditions(data || []));
  }, [article.id]);

  const snap = (article as any).tldr_snapshot;
  const snapObj = typeof snap === 'object' && snap !== null ? snap as Record<string, unknown> : null;

  const signals: Signal[] = Array.isArray(snapObj?.signals)
    ? (snapObj!.signals as Signal[])
    : [];

  const whyItMatters: string = (snapObj?.whyItMatters as string) || (snapObj?.why_it_matters as string) || '';
  const whatToWatchFor: string = (snapObj?.whatToWatchFor as string) || (snapObj?.what_to_watch_for as string) || '';

  const shareUrl = encodeURIComponent(canonicalUrl);
  const shareTitle = encodeURIComponent((article.title as string) || '');
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(((article.title as string) || '') + ' ' + canonicalUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;

  return (
    <div className="max-w-3xl mx-auto px-6 pb-16">

      {/* Signals */}
      {signals.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: BRAND }}>
            Today's 3 Signals
          </h2>
          <div className="space-y-4">
            {signals.map((signal, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-black tabular-nums select-none" style={{ color: `${BRAND}30` }}>
                    {i + 1}
                  </span>
                  <h3 className="font-bold text-base leading-snug">{signal.headline}</h3>
                </div>
                {signal.body && <p className="text-sm text-muted-foreground leading-relaxed mb-2">{signal.body}</p>}
                {signal.sourceUrl && signal.source && (
                  <a
                    href={signal.sourceUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline transition-colors"
                  >
                    Source: {signal.source}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Why it matters / What to watch */}
      {(whyItMatters || whatToWatchFor) && (
        <section className="mb-10 space-y-4">
          {whyItMatters && (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-5">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BRAND }}>
                Why it matters
              </p>
              <p className="text-sm leading-relaxed">{whyItMatters}</p>
            </div>
          )}
          {whatToWatchFor && (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-5">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BRAND }}>
                What to watch for
              </p>
              <p className="text-sm leading-relaxed">{whatToWatchFor}</p>
            </div>
          )}
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="my-10 rounded-2xl p-6 border" style={{ borderColor: `${BRAND}30`, background: `${BRAND}08` }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: BRAND }}>Free daily briefing</p>
        <h3 className="text-lg font-bold mb-3">Get 3 Before 9 every weekday morning</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
            const email = emailInput?.value?.trim();
            if (!email) return;
            await supabase.from('newsletter_subscribers').upsert({ email, status: 'subscribed' }, { onConflict: 'email' });
            form.innerHTML = '<p class="text-sm font-semibold" style="color:#5F72FF">You\'re in! Check your inbox.</p>';
          }}
          className="flex gap-2"
        >
          <input
            type="email"
            required
            placeholder="your@email.com"
            className="flex-1 px-3 py-2 rounded-lg border border-border/50 bg-card text-sm outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
            style={{ backgroundColor: BRAND }}
          >
            Subscribe
          </button>
        </form>
      </section>

      {/* Recent editions */}
      {recentEditions.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4 text-muted-foreground">
            Recent Editions
          </h2>
          <div className="space-y-2">
            {recentEditions.map((ed: any) => (
              <a
                key={ed.id}
                href={`/${ed.categories?.slug || 'news'}/${ed.slug}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/20 transition-colors group"
              >
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {ed.published_at ? new Date(ed.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                </span>
                <span className="text-sm font-medium group-hover:underline line-clamp-1">{ed.title}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Share row */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/40">
        <span className="text-xs text-muted-foreground mr-1">Share this edition:</span>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
          style={{ background: '#25D366', color: '#fff' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          WhatsApp
        </a>
        <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
          style={{ background: '#0A66C2', color: '#fff' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          LinkedIn
        </a>
      </div>
    </div>
  );
}

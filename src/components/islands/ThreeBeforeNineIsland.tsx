import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const TEAL = '#1AB8D6';
const TEAL_BG = 'rgba(26, 184, 214, 0.1)';
const TEAL_BORDER = 'rgba(26, 184, 214, 0.3)';

interface Signal {
  number: number;
  title: string;
  explainer: string;
  whyItMatters: string;
  readMoreUrl?: string;
  isBonus?: boolean;
}

interface RecentEdition {
  id: string;
  title: string;
  slug: string;
  published_at: string;
  excerpt: string | null;
  tldr_snapshot: any;
}

interface Props {
  article: any;
  enAudioUrl: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
  hideTopSection?: boolean;
  canonicalUrl?: string;
}

// ── Signal parsing ────────────────────────────────────────────────────────────

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function groupIntoParagraphs(lines: string[]): string {
  const filtered = lines.filter(l => l.trim());
  if (filtered.length <= 1) return filtered.join(' ').trim();
  return filtered.join('\n\n').trim();
}

function parseSignalSection(sectionText: string, number: number, preTitle?: string): Signal | null {
  const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length === 0 && !preTitle) return null;

  let title = preTitle || '';
  let startIdx = 0;

  if (!title && lines.length > 0) {
    title = lines[0];
    startIdx = 1;
    if (title.length > 100) {
      const titleEnd = title.match(/^[^.]+[.!?]?\s*(?=[A-Z])/);
      if (titleEnd) {
        const explainerPart = title.slice(titleEnd[0].length);
        title = titleEnd[0].trim();
        if (explainerPart) lines.splice(1, 0, explainerPart);
      }
    }
  }

  let whyMattersIdx = -1;
  for (let i = startIdx; i < lines.length; i++) {
    if (/why\s+(?:it|this)\s+matters/i.test(lines[i]) || /what\s+this\s+means/i.test(lines[i])) {
      whyMattersIdx = i;
      break;
    }
  }

  let readMoreUrl = '';
  const allText = lines.join('\n');
  const linkPatterns = [
    /Read more:\s*\[([^\]]+)\]\(([^)]+)\)/i,
    /Read more:\s*\[?(https?:\/\/[^\s\]<]+)\]?/i,
    /\[Read more\]\(([^)]+)\)/i,
    /\[(?:Read|Source|Link|Full (?:story|article))[^\]]*\]\(([^)]+)\)/i,
    /(?:^|\n)\s*(https?:\/\/[^\s]+)\s*$/m,
  ];
  for (const pattern of linkPatterns) {
    const m = allText.match(pattern);
    if (m) { readMoreUrl = m[2] || m[1]; break; }
  }

  let explainer = '';
  let whyItMatters = '';

  if (whyMattersIdx > 0) {
    explainer = groupIntoParagraphs(lines.slice(startIdx, whyMattersIdx));
    let whyLine = lines[whyMattersIdx];
    whyLine = whyLine.replace(/^\*?\*?(?:why\s+(?:it|this)\s+matters|what\s+this\s+means)[^:]*:?\s*\*?\*?\s*/i, '');
    const remainingLines = [whyLine, ...lines.slice(whyMattersIdx + 1)].filter(l => l.trim());
    whyItMatters = remainingLines.join(' ').trim();
  } else {
    explainer = groupIntoParagraphs(lines.slice(startIdx));
  }

  const urlCleanPatterns = [
    /\s*Read more:?\s*\[[^\]]*\]\([^)]*\)/gi,
    /\s*Read more:?\s*\[?https?:\/\/[^\s\]]+\]?/gi,
    /\s*\[Read more\]\([^)]*\)/gi,
    /\s*\[(?:Read|Source|Link|Full (?:story|article))[^\]]*\]\([^)]*\)/gi,
    /\s*(?:^|\s)https?:\/\/[^\s]+\s*$/gm,
  ];
  for (const p of urlCleanPatterns) {
    explainer = explainer.replace(p, '').trim();
    whyItMatters = whyItMatters.replace(p, '').trim();
  }

  if (!title && !explainer) return null;

  return {
    number,
    title: cleanHtml(title),
    explainer: cleanHtml(explainer),
    whyItMatters: cleanHtml(whyItMatters),
    readMoreUrl: readMoreUrl || undefined,
    isBonus: false,
  };
}

function extractTextFromContent(content: any): string {
  if (!content?.content) return '';
  let text = '';
  for (const node of content.content) {
    if (node.type === 'paragraph' || node.type === 'heading') {
      const prefix = node.type === 'heading' ? '#'.repeat(node.attrs?.level || 2) + ' ' : '';
      text += prefix + extractNodeText(node) + '\n\n';
    } else if (node.type === 'horizontalRule') {
      text += '\n---\n';
    }
  }
  return text;
}

function extractNodeText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractNodeText).join('');
  return '';
}

function parseSignals(content: any): Signal[] {
  let textContent = '';
  if (typeof content === 'string') {
    textContent = content;
  } else if (content?.content) {
    textContent = extractTextFromContent(content);
  }

  textContent = textContent
    .replace(/<h[1-3][^>]*>\s*/gi, '\n## ')
    .replace(/<\/h[1-3]>/gi, '\n')
    .replace(/<a\s+[^>]*?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<\/?div[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/?(?:strong|b)>/gi, '**')
    .replace(/<\/?(?:em|i)>/gi, '*')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\*\*\s*Read more\s*:\s*\*\*/gi, 'Read more:')
    .replace(/\*\*\s*Read more\s*\*\*\s*:/gi, 'Read more:');

  // Stop parsing at "Asia/Arabia View" heading so it doesn't bleed into signals
  const viewIdx = textContent.search(/(?:asia|arabia)[\s\S]{0,20}view/i);
  if (viewIdx > 0) textContent = textContent.slice(0, viewIdx);

  const numberedPattern = /(?:^|\n)\s*(?:#{1,3}\s*)?(?:\*\*\s*)?(\d+)\s*[\.\:\)\-]\s*(?:\*\*\s*)?/g;
  const numberPositions: { number: number; start: number; contentStart: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = numberedPattern.exec(textContent)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 5) {
      numberPositions.push({ number: num, start: match.index, contentStart: match.index + match[0].length });
    }
  }

  const signals: Signal[] = [];

  if (numberPositions.length >= 2) {
    for (let i = 0; i < numberPositions.length; i++) {
      const pos = numberPositions[i];
      const end = i + 1 < numberPositions.length ? numberPositions[i + 1].start : textContent.length;
      const sectionText = textContent.slice(pos.contentStart, end).trim();
      const parsed = parseSignalSection(sectionText, pos.number);
      if (parsed) signals.push(parsed);
    }
  } else {
    const headingSections = textContent.split(/(?=\n\s*##\s+[^#])/g).filter(s => s.trim());
    if (headingSections.length >= 2) {
      let signalNum = 1;
      for (const section of headingSections) {
        const headingMatch = section.match(/^\s*##\s+(.+)/m);
        if (!headingMatch) continue;
        const title = headingMatch[1].trim();
        const body = section.slice(section.indexOf(headingMatch[0]) + headingMatch[0].length).trim();
        const parsed = parseSignalSection(body, signalNum, title);
        if (parsed) { signals.push(parsed); signalNum++; }
      }
    }
  }

  const bonusMatch = textContent.match(/(?:##?\s*)?Bonus\s*(?:signal)?[:\.\s]*(.+?)(?=##|That's today|$)/is);
  if (bonusMatch) {
    signals.push({ number: signals.length + 1, title: 'Bonus Signal', explainer: cleanHtml(bonusMatch[1].trim()), whyItMatters: '', isBonus: true });
  }

  signals.sort((a, b) => a.number - b.number);
  return signals;
}

// ── Asia View extraction ──────────────────────────────────────────────────────

function extractAsiaView(html: string): string {
  const viewHeadingRegex = /<h[1-6][^>]*>[\s\S]*?(?:asia|arabia)[\s\S]*?view[\s\S]*?<\/h[1-6]>/i;
  const match = html.match(viewHeadingRegex);
  if (!match) return '';
  const afterH = html.indexOf(match[0]) + match[0].length;
  return html.slice(afterH).trim();
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ThreeBeforeNineIsland({ article, enAudioUrl, supabaseUrl, supabaseAnonKey, hideTopSection = false, canonicalUrl }: Props) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

  const signals = parseSignals(article.content);
  const publishDate = article.published_at ? new Date(article.published_at) : new Date();
  const formattedDate = format(publishDate, 'EEEE, d MMMM yyyy');

  const tldr = article.tldr_snapshot as any;

  const signalImages: string[] = (() => {
    if (tldr?.signalImages?.length) return tldr.signalImages;
    return [];
  })();

  // Asia View HTML
  const contentHtml = typeof article.content === 'string' ? article.content : '';
  const asiaViewHtml = extractAsiaView(contentHtml);

  // Newsletter signup state
  const [email, setEmail] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subDone, setSubDone] = useState(false);
  const [subError, setSubError] = useState('');

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes('@')) { setSubError('Please enter a valid email address.'); return; }
    setSubLoading(true);
    setSubError('');
    try {
      const { data: existing } = await supabase
        .from('briefing_subscriptions')
        .select('id, is_active')
        .eq('email', email.toLowerCase())
        .eq('briefing_type', 'three_before_nine')
        .maybeSingle();

      if (existing?.is_active) { setSubDone(true); return; }

      if (existing && !existing.is_active) {
        await supabase.from('briefing_subscriptions').update({ is_active: true, unsubscribed_at: null }).eq('id', existing.id);
      } else {
        const { error } = await supabase.from('briefing_subscriptions').insert({ email: email.toLowerCase(), briefing_type: 'three_before_nine', is_active: true });
        if (error) throw error;
      }
      setSubDone(true);
    } catch {
      setSubError('Something went wrong. Please try again.');
    } finally {
      setSubLoading(false);
    }
  }

  // Recent editions
  const [recentEditions, setRecentEditions] = useState<RecentEdition[]>([]);
  useEffect(() => {
    supabase
      .from('articles')
      .select('id, title, slug, published_at, excerpt, tldr_snapshot')
      .eq('article_type', 'three_before_nine')
      .eq('status', 'published')
      .neq('slug', article.slug)
      .order('published_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setRecentEditions(data); });
  }, [article.slug]);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero header */}
      {!hideTopSection && (
        <header className="relative border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
          <div className="max-w-3xl mx-auto px-6 py-[60px] text-center">
            <div className="flex items-center justify-center gap-2 text-base font-medium mb-6" style={{ color: TEAL }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>{formattedDate}</span>
            </div>

            <h1 className="mb-4 font-bold leading-none tracking-tight" style={{ color: TEAL, fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}>
              3 Before 9
            </h1>

            <p className="text-muted-foreground text-[20px] mb-2">
              3 AI signals from Asia, served fresh daily.{' '}
              {signals.filter(s => !s.isBonus).length > 0 && (
                <>
                  On today's menu:{' '}
                  {signals.filter(s => !s.isBonus).map((s, i, arr) => (
                    <span key={s.number}>
                      <a
                        href={`#signal-${s.number}`}
                        className="hover:underline transition-colors"
                        style={{ color: TEAL }}
                        onClick={(e) => { e.preventDefault(); document.getElementById(`signal-${s.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                      >
                        {s.title.split(' ').slice(0, 3).join(' ')}
                      </a>
                      {i < arr.length - 1 ? ', ' : '. '}
                    </span>
                  ))}
                </>
              )}
            </p>
          </div>
        </header>
      )}

      {/* Hero image */}
      {!hideTopSection && article.featured_image_url && (
        <div className="max-w-3xl mx-auto px-6 pt-8">
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full rounded-xl object-cover max-h-[420px]"
            loading="eager"
          />
        </div>
      )}

      {/* Spotify player — always shown for 3B9 */}
      {!hideTopSection && (
        <div id="audio-player" className="max-w-3xl mx-auto px-6 pt-6">
          <iframe
            src={`${tldr?.spotifyEpisodeUrl || 'https://open.spotify.com/embed/show/3aHz4AvuZTHjiKJaZ9FUdW'}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ border: 'none', borderRadius: '12px' }}
            title="3 Before 9 on Spotify"
          />
        </div>
      )}

      {/* Signals */}
      <main className="max-w-3xl mx-auto px-6 py-8 md:py-12">
        <div className="space-y-8">
          {signals.filter(s => !s.isBonus).map((signal) => {
            const imgUrl = signalImages[signal.number - 1] || '';
            return (
              <article key={signal.number} id={`signal-${signal.number}`} className="relative bg-card rounded-xl p-6 sm:p-8 border border-border shadow-sm scroll-mt-24">
                {/* Number badge */}
                <div className="absolute -top-5 left-6 sm:left-8">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-[22px] leading-none"
                    style={{ backgroundColor: TEAL, color: 'hsl(220, 15%, 10%)' }}
                  >
                    {signal.number}
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex gap-5 items-start">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[24px] font-bold text-foreground mb-4 leading-[1.3] font-display">
                        {signal.title}
                      </h2>
                    </div>
                    {imgUrl && (
                      <img
                        src={imgUrl}
                        alt=""
                        className="hidden sm:block w-[160px] h-[160px] rounded-lg object-cover shrink-0"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="text-foreground/90 text-base leading-[1.7] mb-6 max-w-[680px] space-y-4">
                    {signal.explainer.split('\n\n').filter(Boolean).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>

                  {signal.whyItMatters && (
                    <div className="border-l-4 pl-5 pr-5 py-4 rounded-r-lg mb-5" style={{ borderColor: TEAL, backgroundColor: TEAL_BG }}>
                      <p className="text-sm font-bold mb-1" style={{ color: TEAL }}>Why it matters for Asia</p>
                      <p className="text-foreground/80 text-[15px] leading-[1.7]">{signal.whyItMatters}</p>
                    </div>
                  )}

                  {signal.readMoreUrl && (
                    <a
                      href={signal.readMoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium transition-colors group hover:opacity-80"
                      style={{ color: TEAL }}
                    >
                      <span>Read more</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  )}
                </div>
              </article>
            );
          })}

          {/* Bonus signal */}
          {signals.find(s => s.isBonus) && (
            <div className="relative mt-10 rounded-xl p-8 border" style={{ backgroundColor: TEAL_BG, borderColor: TEAL_BORDER }}>
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg" style={{ backgroundColor: TEAL, color: 'hsl(220, 15%, 10%)' }}>
                  Bonus Signal
                </span>
              </div>
              <div className="pt-2">
                <p className="text-foreground text-base leading-[1.7]">
                  {signals.find(s => s.isBonus)?.explainer}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* TLDR metadata */}
        {tldr && (tldr.whoShouldPayAttention || tldr.whatChangesNext) && (
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            {tldr.whoShouldPayAttention && (
              <div className="bg-card rounded-lg p-5 border-l-4" style={{ borderColor: TEAL }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: TEAL }}>
                  Who should pay attention
                </h3>
                <p className="text-foreground text-sm leading-relaxed">{tldr.whoShouldPayAttention}</p>
              </div>
            )}
            {tldr.whatChangesNext && (
              <div className="bg-card rounded-lg p-5 border-l-4" style={{ borderColor: TEAL }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: TEAL }}>
                  What changes next
                </h3>
                <p className="text-foreground text-sm leading-relaxed">{tldr.whatChangesNext}</p>
              </div>
            )}
          </div>
        )}

        {/* AI in Asia View editorial section */}
        {asiaViewHtml && (
          <div className="mt-10 rounded-xl overflow-hidden border" style={{ borderColor: TEAL_BORDER }}>
            <div className="px-5 py-3 border-b" style={{ backgroundColor: TEAL_BG, borderColor: TEAL_BORDER }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: TEAL }}>The AI in Asia View</p>
            </div>
            <div
              className="px-5 py-5 prose prose-sm max-w-none dark:prose-invert article-content"
              dangerouslySetInnerHTML={{ __html: asiaViewHtml }}
            />
          </div>
        )}

        {/* Outro */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground text-center mb-2">
            That's today's <span className="font-medium" style={{ color: TEAL }}>3 Before 9</span>.
          </p>
          <p className="text-muted-foreground/70 text-sm text-center mb-8">
            Explore more at{' '}
            <a href="/" className="hover:opacity-80 transition-colors" style={{ color: TEAL }}>AIinASIA.com</a>
            {' '}or{' '}
            <a href="/contact" className="hover:opacity-80 transition-colors" style={{ color: TEAL }}>share signals with us</a>.
          </p>

          {/* Newsletter signup */}
          {subDone ? (
            <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: TEAL_BG, borderColor: TEAL_BORDER }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: TEAL_BG }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: TEAL }}><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">You're in!</h3>
              <p className="text-muted-foreground text-sm">3 Before 9 will land in your inbox every weekday morning.</p>
            </div>
          ) : (
            <div className="bg-muted/50 border border-border rounded-xl p-8 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: TEAL_BG }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: TEAL }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <h3 className="text-[22px] font-bold text-foreground mb-1">Get 3 Before 9 in your inbox</h3>
              <p className="text-muted-foreground text-base mb-5">Three AI signals from Asia, every weekday</p>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={subLoading}
                  required
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={subLoading}
                  className="px-6 h-10 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
                  style={{ backgroundColor: TEAL }}
                >
                  {subLoading ? '...' : 'Subscribe'}
                </button>
              </form>
              {subError && <p className="text-red-400 text-xs mt-2">{subError}</p>}
              <p className="text-muted-foreground/60 text-[13px] mt-3">Free forever. Unsubscribe anytime. No spam.</p>
            </div>
          )}
        </div>
      </main>

      {/* Recent editions */}
      {recentEditions.length > 0 && (
        <div className="border-t border-border" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-foreground font-display">Recent Editions</h3>
              <a href="/news/3-before-9/editions" className="text-sm hover:opacity-80 transition-colors flex items-center gap-1" style={{ color: TEAL }}>
                View all{' '}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {recentEditions.map((edition) => {
                const date = edition.published_at ? new Date(edition.published_at) : new Date();
                const bullets: string[] = (edition.tldr_snapshot as any)?.bullets || [];
                return (
                  <a
                    key={edition.id}
                    href={`/news/${edition.slug}`}
                    className="group bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all"
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(26, 184, 214, 0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: TEAL }}>
                      {format(date, 'EEEE')}
                    </p>
                    <p className="text-foreground font-semibold text-sm mb-3">{format(date, 'd MMMM yyyy')}</p>
                    {edition.excerpt ? (
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 mb-3">{edition.excerpt}</p>
                    ) : bullets.length > 0 ? (
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 mb-3">
                        {bullets.slice(0, 3).join('. ').replace(/\.+$/, '')}.
                      </p>
                    ) : null}
                    <span className="text-xs font-medium group-hover:underline flex items-center gap-1" style={{ color: TEAL }}>
                      Read edition{' '}
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

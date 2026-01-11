import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Clock, ChevronRight, ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet";
import ThreeBeforeNineSignup from "./ThreeBeforeNineSignup";
import ThreeBeforeNineRecent from "./ThreeBeforeNineRecent";
import { cn } from "@/lib/utils";

interface Signal {
  number: number;
  title: string;
  explainer: string;
  whyItMatters: string;
  readMoreUrl?: string;
  isBonus?: boolean;
}

interface ThreeBeforeNineTemplateProps {
  article: {
    id: string;
    title: string;
    slug: string;
    content: any;
    excerpt: string;
    published_at: string;
    updated_at: string;
    featured_image_url?: string;
    meta_title?: string;
    meta_description?: string;
    tldr_snapshot?: {
      whoShouldPayAttention?: string;
      whatChangesNext?: string;
    } | null;
    author?: {
      name: string;
      slug: string;
      avatar_url?: string;
    };
  };
}

function parseSignals(content: any): Signal[] {
  const signals: Signal[] = [];
  
  // Handle string content (from CMS)
  let textContent = '';
  if (typeof content === 'string') {
    textContent = content;
  } else if (content?.content) {
    // Handle Tiptap/ProseMirror JSON format
    textContent = extractTextFromContent(content);
  }

  // Convert HTML div tags to newlines for easier parsing
  textContent = textContent
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  // Split by signal patterns: ##1. or ## 1. or just 1. at start
  const sections = textContent.split(/(?=##?\s*\d+[\.\:])/g).filter(s => s.trim());

  for (const section of sections) {
    // Extract signal number
    const numMatch = section.match(/^(?:##?\s*)?(\d+)[\.\:]\s*/);
    if (!numMatch) continue;
    
    const number = parseInt(numMatch[1]);
    const rest = section.slice(numMatch[0].length);
    
    // First line after number is the title
    const lines = rest.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) continue;
    
    // Title might run into the explainer - check for common patterns
    let title = lines[0];
    let startIdx = 1;
    
    // If title is very long and contains sentence patterns, it might include explainer
    if (title.length > 100) {
      // Try to find where title ends (first lowercase letter after initial phrase)
      const titleEnd = title.match(/^[^.]+[.!?]?\s*(?=[A-Z])/);
      if (titleEnd) {
        const explainerPart = title.slice(titleEnd[0].length);
        title = titleEnd[0].trim();
        if (explainerPart) {
          lines.splice(1, 0, explainerPart);
        }
      }
    }
    
    // Find "Why it matters" section
    let whyMattersIdx = -1;
    for (let i = startIdx; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('why it matters') || 
          lines[i].toLowerCase().includes('why this matters') ||
          lines[i].match(/^\*?\*?why\s+it\s+matters/i)) {
        whyMattersIdx = i;
        break;
      }
    }
    
    let explainer = '';
    let whyItMatters = '';
    let readMoreUrl = '';
    
    // Extract "Read more" link from any line
    const allText = lines.join('\n');
    const linkPatterns = [
      /Read more:\s*\[([^\]]+)\]\(([^)]+)\)/i,  // Markdown: [text](url)
      /Read more:\s*\[?(https?:\/\/[^\s\]\)]+)\]?/i,  // Plain URL or [url]
      /\[Read more\]\(([^)]+)\)/i,  // [Read more](url)
    ];
    
    for (const pattern of linkPatterns) {
      const match = allText.match(pattern);
      if (match) {
        readMoreUrl = match[2] || match[1];
        break;
      }
    }
    
    if (whyMattersIdx > 0) {
      explainer = lines.slice(startIdx, whyMattersIdx).join(' ').trim();
      
      // Extract "Why it matters" content - might be inline or on next lines
      let whyLine = lines[whyMattersIdx];
      const colonMatch = whyLine.match(/why\s+it\s+matters[^:]*:\s*/i);
      if (colonMatch) {
        whyLine = whyLine.slice(colonMatch.index! + colonMatch[0].length);
      } else {
        whyLine = whyLine.replace(/^\*?\*?why\s+it\s+matters[^:]*:?\s*/i, '');
      }
      
      const remainingLines = [whyLine, ...lines.slice(whyMattersIdx + 1)].filter(l => l.trim());
      whyItMatters = remainingLines.join(' ').trim();
      
      // Remove any "Read more:" links from whyItMatters
      whyItMatters = whyItMatters.replace(/\s*Read more:?\s*\[[^\]]*\]\([^)]*\)/gi, '').trim();
      whyItMatters = whyItMatters.replace(/\s*Read more:?\s*\[?https?:\/\/[^\s\]\)]+\]?/gi, '').trim();
      whyItMatters = whyItMatters.replace(/\s*\[Read more\]\([^)]*\)/gi, '').trim();
    } else {
      explainer = lines.slice(startIdx).join(' ').trim();
    }
    
    // Clean links from explainer too
    explainer = explainer.replace(/\s*Read more:?\s*\[[^\]]*\]\([^)]*\)/gi, '').trim();
    explainer = explainer.replace(/\s*Read more:?\s*\[?https?:\/\/[^\s\]\)]+\]?/gi, '').trim();
    explainer = explainer.replace(/\s*\[Read more\]\([^)]*\)/gi, '').trim();

    signals.push({
      number,
      title: cleanHtml(title),
      explainer: cleanHtml(explainer),
      whyItMatters: cleanHtml(whyItMatters),
      readMoreUrl: readMoreUrl || undefined,
      isBonus: false
    });
  }

  // Check for bonus signal
  const bonusMatch = textContent.match(/(?:##?\s*)?Bonus\s*(?:signal)?[:\.\s]*(.+?)(?=##|That's today|$)/is);
  if (bonusMatch) {
    signals.push({
      number: 4,
      title: 'Bonus Signal',
      explainer: cleanHtml(bonusMatch[1].trim()),
      whyItMatters: '',
      isBonus: true
    });
  }

  // Sort by number
  signals.sort((a, b) => a.number - b.number);

  return signals;
}

// Removed parseSimpleFormat - consolidated into main parseSignals function

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
  if (node.content) {
    return node.content.map(extractNodeText).join('');
  }
  return '';
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function ThreeBeforeNineTemplate({ article }: ThreeBeforeNineTemplateProps) {
  const signals = parseSignals(article.content);
  const publishDate = article.published_at ? new Date(article.published_at) : new Date();
  const formattedDate = format(publishDate, "EEEE, d MMMM yyyy");
  
  const tldr = article.tldr_snapshot as { whoShouldPayAttention?: string; whatChangesNext?: string } | null;
  const canonicalUrl = `https://aiinasia.com/news/${article.slug}`;

  return (
    <div className="min-h-screen bg-slate-900">
      <Helmet>
        <title>{article.meta_title || article.title} | AI in ASIA</title>
        <meta name="description" content={article.meta_description || article.excerpt} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={article.meta_title || article.title} />
        <meta property="og:description" content={article.meta_description || article.excerpt} />
        <meta property="og:image" content="https://aiinasia.com/images/3-before-9-hero.png" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.meta_title || article.title} />
        <meta name="twitter:description" content={article.meta_description || article.excerpt} />
        <meta name="twitter:image" content="https://aiinasia.com/images/3-before-9-hero.png" />
      </Helmet>

      {/* Compact Header */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900 z-10" />
        <img 
          src="/images/3-before-9-hero.png" 
          alt="3 Before 9 - AI signals from Asia"
          className="w-full h-48 md:h-64 object-cover object-center"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-8">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
              <Clock className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
              <span className="text-amber-400">3</span> Before <span className="text-amber-400">9</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base">
              {article.excerpt || "Three AI signals worth knowing before your first coffee."}
            </p>
          </div>
        </div>
      </header>

      {/* TLDR Block - Collapsible on Mobile */}
      {tldr && (tldr.whoShouldPayAttention || tldr.whatChangesNext) && (
        <div className="bg-slate-800/50 border-y border-slate-700">
          <details className="max-w-3xl mx-auto md:open" open>
            <summary className="md:hidden px-6 py-3 text-amber-400 text-sm font-medium cursor-pointer flex items-center gap-2">
              <ChevronRight className="h-4 w-4 transition-transform details-open:rotate-90" />
              Quick Context
            </summary>
            <div className="px-6 py-4 md:py-5 grid md:grid-cols-2 gap-4">
              {tldr.whoShouldPayAttention && (
                <div>
                  <h3 className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">
                    Who should pay attention
                  </h3>
                  <p className="text-slate-300 text-sm">{tldr.whoShouldPayAttention}</p>
                </div>
              )}
              {tldr.whatChangesNext && (
                <div>
                  <h3 className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">
                    What changes next
                  </h3>
                  <p className="text-slate-300 text-sm">{tldr.whatChangesNext}</p>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* Signals */}
      <main className="max-w-3xl mx-auto px-6 py-8 md:py-12">
        <div className="space-y-10 md:space-y-12">
          {signals.filter(s => !s.isBonus).map((signal, idx) => (
            <article key={signal.number} className="relative bg-slate-800/40 rounded-xl p-6 md:p-8 border border-slate-700/50">
              {/* Signal Number Badge */}
              <div className="absolute -top-5 left-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 font-bold text-lg shadow-lg shadow-amber-500/20">
                  {signal.number}
                </div>
              </div>
              
              <div className="pt-2">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-4 leading-tight">
                  {signal.title}
                </h2>
                <p className="text-slate-200 text-base md:text-lg leading-relaxed mb-5">
                  {signal.explainer}
                </p>
                {signal.whyItMatters && (
                  <div className="bg-amber-500/10 border-l-4 border-amber-500 pl-4 pr-4 py-3 rounded-r-lg mb-4">
                    <p className="text-sm font-semibold text-amber-400 mb-1">
                      Why it matters for Asia
                    </p>
                    <p className="text-amber-100 text-sm md:text-base leading-relaxed">
                      {signal.whyItMatters}
                    </p>
                  </div>
                )}
                {signal.readMoreUrl && (
                  <a 
                    href={signal.readMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors group"
                  >
                    <span>Read more</span>
                    <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                )}
              </div>
            </article>
          ))}

          {/* Bonus Signal */}
          {signals.find(s => s.isBonus) && (
            <div className="relative mt-10 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl p-6 md:p-8 border border-amber-500/30">
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-900 text-xs font-bold uppercase tracking-wide shadow-lg">
                  Bonus Signal
                </span>
              </div>
              <div className="pt-2">
                <p className="text-slate-100 text-base md:text-lg leading-relaxed">
                  {signals.find(s => s.isBonus)?.explainer}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Outro */}
        <div className="mt-12 pt-8 border-t border-slate-700">
          <p className="text-slate-400 text-center mb-2">
            That's today's <span className="text-amber-400 font-medium">3-Before-9</span>.
          </p>
          <p className="text-slate-500 text-sm text-center mb-8">
            Explore more at{' '}
            <Link to="/" className="text-amber-400 hover:text-amber-300 transition-colors">
              AIinASIA.com
            </Link>
            {' '}or{' '}
            <Link to="/contact" className="text-amber-400 hover:text-amber-300 transition-colors">
              share signals with us
            </Link>.
          </p>

          {/* Newsletter Signup */}
          <ThreeBeforeNineSignup />
        </div>
      </main>


      {/* Recent Editions */}
      <div className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <ThreeBeforeNineRecent currentSlug={article.slug} />
        </div>
      </div>
    </div>
  );
}

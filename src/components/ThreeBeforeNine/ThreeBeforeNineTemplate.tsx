import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Clock, ChevronRight, ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet";
import Comments from "@/components/Comments";
import ThreeBeforeNineSignup from "./ThreeBeforeNineSignup";
import ThreeBeforeNineRecent from "./ThreeBeforeNineRecent";
import { cn } from "@/lib/utils";

interface Signal {
  number: number;
  title: string;
  explainer: string;
  whyItMatters: string;
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

  // Parse signals from text
  // Match patterns like "## 1. Title" or "## Bonus signal" or just numbered headings
  const signalRegex = /##\s*(\d+|Bonus)[\.:]\s*(.+?)(?=\n##|\n*$)/gs;
  const matches = textContent.matchAll(signalRegex);

  for (const match of matches) {
    const isBonus = match[1].toLowerCase() === 'bonus';
    const number = isBonus ? 4 : parseInt(match[1]);
    const fullText = match[2].trim();
    
    // Split into title and rest
    const lines = fullText.split('\n').filter(l => l.trim());
    const title = lines[0]?.replace(/<[^>]*>/g, '').trim() || '';
    
    // Find "Why it matters" section
    const whyMattersIdx = lines.findIndex(l => 
      l.toLowerCase().includes('why it matters') || 
      l.toLowerCase().includes('why this matters')
    );
    
    let explainer = '';
    let whyItMatters = '';
    
    if (whyMattersIdx > 0) {
      explainer = lines.slice(1, whyMattersIdx).join('\n').trim();
      whyItMatters = lines.slice(whyMattersIdx + 1).join('\n').trim();
      // If why it matters is on same line
      if (!whyItMatters && lines[whyMattersIdx]) {
        const afterColon = lines[whyMattersIdx].split(/matters?( for Asia)?/i)[2];
        if (afterColon) whyItMatters = afterColon.trim();
      }
    } else {
      explainer = lines.slice(1).join('\n').trim();
    }

    signals.push({
      number,
      title,
      explainer: cleanHtml(explainer),
      whyItMatters: cleanHtml(whyItMatters),
      isBonus
    });
  }

  // Fallback: try simpler parsing if regex fails
  if (signals.length === 0) {
    const simpleSignals = parseSimpleFormat(textContent);
    return simpleSignals;
  }

  return signals;
}

function parseSimpleFormat(text: string): Signal[] {
  const signals: Signal[] = [];
  const sections = text.split(/(?=##?\s*\d+[\.:])/).filter(s => s.trim());
  
  for (const section of sections) {
    const numberMatch = section.match(/##?\s*(\d+)[\.:]\s*/);
    if (!numberMatch) continue;
    
    const number = parseInt(numberMatch[1]);
    const rest = section.slice(numberMatch[0].length);
    const lines = rest.split('\n').filter(l => l.trim());
    
    const title = lines[0]?.replace(/<[^>]*>/g, '').trim() || '';
    
    const whyIdx = lines.findIndex(l => 
      l.toLowerCase().includes('why it matters') ||
      l.toLowerCase().includes('**why')
    );
    
    let explainer = '';
    let whyItMatters = '';
    
    if (whyIdx > 0) {
      explainer = lines.slice(1, whyIdx).join(' ').trim();
      whyItMatters = lines.slice(whyIdx).join(' ')
        .replace(/\*\*why.*?\*\*/gi, '')
        .replace(/why it matters.*?:/gi, '')
        .trim();
    } else {
      explainer = lines.slice(1).join(' ').trim();
    }
    
    signals.push({
      number,
      title: cleanHtml(title),
      explainer: cleanHtml(explainer),
      whyItMatters: cleanHtml(whyItMatters),
      isBonus: false
    });
  }
  
  // Check for bonus signal
  const bonusMatch = text.match(/##?\s*Bonus\s*(?:signal)?[:\s]*(.+?)(?=##|That's today|$)/is);
  if (bonusMatch) {
    signals.push({
      number: 4,
      title: 'Bonus Signal',
      explainer: cleanHtml(bonusMatch[1].trim()),
      whyItMatters: '',
      isBonus: true
    });
  }
  
  return signals;
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
        <div className="space-y-8 md:space-y-10">
          {signals.filter(s => !s.isBonus).map((signal, idx) => (
            <article key={signal.number} className="relative">
              {/* Signal Number */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 font-bold text-lg">
                  {signal.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold text-white mb-3 leading-tight">
                    {signal.title}
                  </h2>
                  <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
                    {signal.explainer}
                  </p>
                  {signal.whyItMatters && (
                    <div className="border-l-2 border-amber-500/50 pl-4 py-1">
                      <p className="text-amber-200/80 text-sm italic">
                        <span className="font-medium text-amber-400 not-italic">Why it matters for Asia:</span>{' '}
                        {signal.whyItMatters}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Divider */}
              {idx < signals.filter(s => !s.isBonus).length - 1 && (
                <div className="mt-8 border-b border-slate-700/50" />
              )}
            </article>
          ))}

          {/* Bonus Signal */}
          {signals.find(s => s.isBonus) && (
            <div className="relative mt-10">
              <div className="absolute -top-4 left-0 right-0 border-t border-dashed border-amber-500/30" />
              <div className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wide">
                    Bonus
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                      {signals.find(s => s.isBonus)?.explainer}
                    </p>
                  </div>
                </div>
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

      {/* Comments Section */}
      <div className="bg-slate-800/30">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Comments articleId={article.id} />
        </div>
      </div>

      {/* Recent Editions */}
      <div className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <ThreeBeforeNineRecent currentSlug={article.slug} />
        </div>
      </div>
    </div>
  );
}

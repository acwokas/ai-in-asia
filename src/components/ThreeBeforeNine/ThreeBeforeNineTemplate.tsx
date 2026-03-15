import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useState } from "react";
import { Clock, ExternalLink, Edit, Eye, EyeOff, Send, Loader2, ChevronRight, Home } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { ArticleStructuredData, BreadcrumbStructuredData } from "@/components/StructuredData";
import ThreeBeforeNineSignup from "./ThreeBeforeNineSignup";
import ThreeBeforeNineRecent from "./ThreeBeforeNineRecent";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AMBER = "hsl(37, 78%, 60%)";
const AMBER_BG = "hsla(37, 78%, 60%, 0.1)";
const AMBER_BORDER = "hsla(37, 78%, 60%, 0.3)";

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
    status?: string;
    view_count?: number;
    tldr_snapshot?: {
      whoShouldPayAttention?: string;
      whatChangesNext?: string;
      signalImages?: string[];
    } | null;
    author?: {
      name: string;
      slug: string;
      avatar_url?: string;
    };
  };
}

function parseSignals(content: any): Signal[] {
  let textContent = '';
  if (typeof content === 'string') {
    textContent = content;
  } else if (content?.content) {
    textContent = extractTextFromContent(content);
  }

  // Normalise all HTML to plain-ish text while preserving structure cues
  textContent = textContent
    // Convert HTML headings to markdown-style markers
    .replace(/<h[1-3][^>]*>\s*/gi, '\n## ')
    .replace(/<\/h[1-3]>/gi, '\n')
    // Convert <a> tags to markdown links
    .replace(/<a\s+[^>]*?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Strip remaining HTML
    .replace(/<\/?div[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/?(?:strong|b)>/gi, '**')
    .replace(/<\/?(?:em|i)>/gi, '*')
    .replace(/<[^>]+>/g, '')
    // Normalise whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // ── Strategy 1: Numbered sections ──
  // Match patterns like: ## 1. Title, ##1: Title, # 1. Title, 1. Title, 1: Title, **1. Title**
  const numberedPattern = /(?:^|\n)\s*(?:#{1,3}\s*)?(?:\*\*\s*)?(\d+)\s*[\.\:\)\-]\s*(?:\*\*\s*)?/g;
  const numberPositions: { number: number; start: number; contentStart: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = numberedPattern.exec(textContent)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 5) {
      numberPositions.push({
        number: num,
        start: match.index,
        contentStart: match.index + match[0].length,
      });
    }
  }

  const signals: Signal[] = [];

  if (numberPositions.length >= 2) {
    // We have numbered sections — parse each
    for (let i = 0; i < numberPositions.length; i++) {
      const pos = numberPositions[i];
      const end = i + 1 < numberPositions.length
        ? numberPositions[i + 1].start
        : textContent.length;
      const sectionText = textContent.slice(pos.contentStart, end).trim();
      const parsed = parseSignalSection(sectionText, pos.number);
      if (parsed) signals.push(parsed);
    }
  } else {
    // ── Strategy 2: Unnumbered — split by headings (## Title) ──
    const headingSections = textContent.split(/(?=\n\s*##\s+[^#])/g).filter(s => s.trim());

    if (headingSections.length >= 2) {
      let signalNum = 1;
      for (const section of headingSections) {
        const headingMatch = section.match(/^\s*##\s+(.+)/m);
        if (!headingMatch) continue;
        const title = headingMatch[1].trim();
        const body = section.slice(section.indexOf(headingMatch[0]) + headingMatch[0].length).trim();
        const parsed = parseSignalSection(body, signalNum, title);
        if (parsed) {
          signals.push(parsed);
          signalNum++;
        }
      }
    } else {
      // ── Strategy 3: Split by double newlines (paragraph blocks) ──
      const paragraphs = textContent.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 10);
      // Group into chunks of ~3 (title, body, why-it-matters) if we have enough
      if (paragraphs.length >= 3) {
        let signalNum = 1;
        let idx = 0;
        while (idx < paragraphs.length && signalNum <= 4) {
          const title = paragraphs[idx];
          // Gather remaining paragraphs until we hit what looks like the next title (short line)
          const bodyParts: string[] = [];
          idx++;
          while (idx < paragraphs.length) {
            // If this paragraph is short and the next one exists, it might be a new title
            if (paragraphs[idx].length < 80 && bodyParts.length >= 1 && idx + 1 < paragraphs.length) break;
            bodyParts.push(paragraphs[idx]);
            idx++;
            if (bodyParts.length >= 3) break;
          }
          const combined = bodyParts.join('\n');
          const parsed = parseSignalSection(combined, signalNum, cleanHtml(title));
          if (parsed) {
            signals.push(parsed);
            signalNum++;
          }
        }
      }
    }
  }

  // Check for bonus signal
  const bonusMatch = textContent.match(/(?:##?\s*)?Bonus\s*(?:signal)?[:\.\s]*(.+?)(?=##|That's today|$)/is);
  if (bonusMatch) {
    signals.push({
      number: signals.length + 1,
      title: 'Bonus Signal',
      explainer: cleanHtml(bonusMatch[1].trim()),
      whyItMatters: '',
      isBonus: true
    });
  }

  signals.sort((a, b) => a.number - b.number);
  return signals;
}

/**
 * Parse a single signal section's text into structured data.
 * Handles: title extraction, body/explainer, "why it matters", and read-more URLs.
 */
function parseSignalSection(sectionText: string, number: number, preTitle?: string): Signal | null {
  const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length === 0 && !preTitle) return null;

  let title = preTitle || '';
  let startIdx = 0;

  if (!title && lines.length > 0) {
    title = lines[0];
    startIdx = 1;

    // If title is very long, try to split it
    if (title.length > 100) {
      const titleEnd = title.match(/^[^.]+[.!?]?\s*(?=[A-Z])/);
      if (titleEnd) {
        const explainerPart = title.slice(titleEnd[0].length);
        title = titleEnd[0].trim();
        if (explainerPart) lines.splice(1, 0, explainerPart);
      }
    }
  }

  // Find "Why it matters" / "What this means" section
  let whyMattersIdx = -1;
  for (let i = startIdx; i < lines.length; i++) {
    if (/why\s+(?:it|this)\s+matters/i.test(lines[i]) ||
        /what\s+this\s+means/i.test(lines[i])) {
      whyMattersIdx = i;
      break;
    }
  }

  // Extract URL from any format:
  // - [text](url)
  // - Read more: url
  // - https://bare-url
  // - <a href="url">
  let readMoreUrl = '';
  const allText = lines.join('\n');

  const linkPatterns = [
    /Read more:\s*\[([^\]]+)\]\(([^)]+)\)/i,
    /Read more:\s*\[?(https?:\/\/[^\s\]<]+)\]?/i,
    /\[Read more\]\(([^)]+)\)/i,
    /\[(?:Read|Source|Link|Full (?:story|article))[^\]]*\]\(([^)]+)\)/i,
    // Bare URL on its own line (likely the read-more link)
    /(?:^|\n)\s*(https?:\/\/[^\s]+)\s*$/m,
  ];

  for (const pattern of linkPatterns) {
    const m = allText.match(pattern);
    if (m) {
      readMoreUrl = m[2] || m[1];
      break;
    }
  }

  let explainer = '';
  let whyItMatters = '';

  if (whyMattersIdx > 0) {
    explainer = lines.slice(startIdx, whyMattersIdx).join(' ').trim();

    let whyLine = lines[whyMattersIdx];
    // Strip the "why it matters:" prefix
    whyLine = whyLine.replace(/^\*?\*?(?:why\s+(?:it|this)\s+matters|what\s+this\s+means)[^:]*:?\s*\*?\*?\s*/i, '');

    const remainingLines = [whyLine, ...lines.slice(whyMattersIdx + 1)].filter(l => l.trim());
    whyItMatters = remainingLines.join(' ').trim();
  } else {
    explainer = lines.slice(startIdx).join(' ').trim();
  }

  // Clean URLs out of explainer and whyItMatters
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
  
  const tldr = article.tldr_snapshot as { whoShouldPayAttention?: string; whatChangesNext?: string; signalImages?: string[] } | null;
  const signalImages = tldr?.signalImages || [];
  const canonicalUrl = `https://aiinasia.com/news/${article.slug}`;
  
  const { isAdmin, isLoading: isLoadingAdmin } = useAdminRole();
  
  const queryClient = useQueryClient();
  const [showAdminView, setShowAdminView] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!article || !isAdmin) return;
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', article.id);
      if (error) throw error;
      toast.success("Article published", { description: "The article is now live" });
      queryClient.invalidateQueries({ queryKey: ["article", article.slug] });
    } catch (error) {
      console.error("Error publishing article:", error);
      toast.error("Error", { description: "Failed to publish article" });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={article.meta_title || article.title}
        description={article.meta_description || article.excerpt || ''}
        canonical={canonicalUrl}
        ogImage={article.featured_image_url || "https://aiinasia.com/images/3-before-9-hero.webp"}
        ogType="article"
      />
      <ArticleStructuredData
        title={article.title}
        description={article.meta_description || article.excerpt || ''}
        imageUrl={article.featured_image_url || "https://aiinasia.com/images/3-before-9-hero.webp"}
        datePublished={article.published_at}
        dateModified={article.updated_at}
        authorName={article.author?.name || 'Intelligence Desk'}
        authorSlug={article.author?.slug}
        categoryName="3 Before 9"
        categorySlug="news"
        canonicalUrl={canonicalUrl}
      />
      <BreadcrumbStructuredData
        items={[
          { name: "Home", url: "https://aiinasia.com" },
          { name: "3 Before 9", url: "https://aiinasia.com/3-before-9" },
          { name: article.title, url: canonicalUrl },
        ]}
      />

      {/* Admin Controls */}
      {!isLoadingAdmin && isAdmin && (
        <div className="border-b" style={{ backgroundColor: AMBER_BG, borderColor: AMBER_BORDER }}>
          <div className="max-w-3xl mx-auto px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 flex-shrink-0" style={{ color: AMBER }} />
              <span className="text-sm font-medium text-foreground">Admin Controls</span>
              {article.status !== 'published' && (
                <Badge variant="outline" className="ml-2" style={{ borderColor: AMBER_BORDER, color: AMBER }}>
                  {article.status}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-2">
                {article.view_count || 0} views
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdminView(!showAdminView)}
                className="cursor-pointer"
              >
                {showAdminView ? (
                  <><Eye className="h-4 w-4 mr-2" />Normal View</>
                ) : (
                  <><EyeOff className="h-4 w-4 mr-2" />Admin View</>
                )}
              </Button>
              {article.status !== 'published' && (
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="cursor-pointer text-white hover:opacity-90"
                  style={{ backgroundColor: AMBER }}
                >
                  {isPublishing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publishing...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" />Publish Now</>
                  )}
                </Button>
              )}
              <Button asChild size="sm" variant="outline" className="cursor-pointer">
                <Link to={`/editor?id=${article.id}`}>
                  <Edit className="h-4 w-4 mr-2" />Edit Article
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Debug Info */}
      {!isLoadingAdmin && isAdmin && showAdminView && (
        <div className="bg-muted/80 border-b border-border">
          <div className="max-w-3xl mx-auto px-6 py-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground mb-2">Article Metadata</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">ID:</span> <span className="text-foreground">{article.id}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="text-foreground">{article.status || 'published'}</span></div>
              <div><span className="text-muted-foreground">Slug:</span> <span className="text-foreground">{article.slug}</span></div>
              <div><span className="text-muted-foreground">Views:</span> <span className="text-foreground">{article.view_count || 0}</span></div>
              <div><span className="text-muted-foreground">Published:</span> <span className="text-foreground">{article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Not published'}</span></div>
              <div><span className="text-muted-foreground">Updated:</span> <span className="text-foreground">{article.updated_at ? new Date(article.updated_at).toLocaleDateString() : '-'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav className="bg-muted/30 border-b border-border" aria-label="Breadcrumb">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
            </li>
            <li>
              <ChevronRight className="h-4 w-4" />
            </li>
            <li>
              <Link to="/news/3-before-9" className="hover:text-foreground transition-colors hover:underline">
                3 Before 9
              </Link>
            </li>
            <li>
              <ChevronRight className="h-4 w-4" />
            </li>
            <li className="text-foreground font-medium" aria-current="page">
              {format(new Date(article.published_at || Date.now()), "d MMM yyyy")}
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative bg-muted/50 border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-[60px] text-center">
          <div className="flex items-center justify-center gap-2 text-base font-medium mb-6" style={{ color: AMBER }}>
            <Clock className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          
          {/* Typographic lockup */}
          <h1 className="mb-4">
            <span className="font-bold text-[64px] leading-none" style={{ color: AMBER }}>3</span>
            <span className="text-foreground font-normal text-[32px] mx-3">Before</span>
            <span className="font-bold text-[64px] leading-none" style={{ color: AMBER }}>9</span>
          </h1>
          
          <p className="text-muted-foreground text-[20px] mb-2">
            3 must-know AI stories before your 9am coffee
          </p>
        </div>
      </header>

      {/* TLDR Metadata */}
      {tldr && (tldr.whoShouldPayAttention || tldr.whatChangesNext) && (
        <div className="bg-muted/50 border-y border-border">
          <div className="max-w-3xl mx-auto px-6 py-6 grid md:grid-cols-2 gap-6">
            {tldr.whoShouldPayAttention && (
              <div className="bg-card rounded-lg p-5 border-l-4" style={{ borderColor: AMBER }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: AMBER }}>
                  Who should pay attention
                </h3>
                <p className="text-foreground text-sm leading-relaxed">{tldr.whoShouldPayAttention}</p>
              </div>
            )}
            {tldr.whatChangesNext && (
              <div className="bg-card rounded-lg p-5 border-l-4" style={{ borderColor: AMBER }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: AMBER }}>
                  What changes next
                </h3>
                <p className="text-foreground text-sm leading-relaxed">{tldr.whatChangesNext}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signals */}
      <main className="max-w-3xl mx-auto px-6 py-8 md:py-12">
        <div className="space-y-8">
          {signals.filter(s => !s.isBonus).map((signal) => (
            <article key={signal.number} className="relative bg-card rounded-xl p-6 sm:p-8 border border-border shadow-sm">
              {/* Signal Number Badge */}
              <div className="absolute -top-5 left-6 sm:left-8">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-[22px] leading-none"
                  style={{ backgroundColor: AMBER, color: 'hsl(220, 15%, 10%)' }}
                >
                  {signal.number}
                </div>
              </div>
              
              <div className="pt-4">
                {/* Header area with title + thumbnail */}
                <div className="flex gap-5 items-start">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[24px] font-bold text-foreground mb-4 leading-[1.3] font-display">
                      {signal.title}
                    </h2>
                  </div>
                  {(() => {
                    const imgUrl = signalImages[signal.number - 1] || '';
                    return imgUrl ? (
                      <img
                        src={imgUrl}
                        alt=""
                        className="hidden sm:block w-[200px] h-[120px] rounded-lg object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : null;
                  })()}
                </div>

                <p className="text-foreground/90 text-base leading-[1.7] mb-6 max-w-[680px]">
                  {signal.explainer}
                </p>
                {signal.whyItMatters && (
                  <div className="border-l-4 pl-5 pr-5 py-4 rounded-r-lg mb-5" style={{ borderColor: AMBER, backgroundColor: AMBER_BG }}>
                    <p className="text-sm font-bold mb-1" style={{ color: AMBER }}>
                      Why it matters for Asia
                    </p>
                    <p className="text-foreground/80 text-[15px] leading-[1.7]">
                      {signal.whyItMatters}
                    </p>
                  </div>
                )}
                {signal.readMoreUrl && (
                  <a 
                    href={signal.readMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium transition-colors group hover:opacity-80"
                    style={{ color: AMBER }}
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
            <div className="relative mt-10 rounded-xl p-8 border" style={{ backgroundColor: AMBER_BG, borderColor: AMBER_BORDER }}>
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg" style={{ backgroundColor: AMBER, color: 'hsl(220, 15%, 10%)' }}>
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

        {/* Outro */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground text-center mb-2">
            That's today's <span className="font-medium" style={{ color: AMBER }}>3-Before-9</span>.
          </p>
          <p className="text-muted-foreground/70 text-sm text-center mb-8">
            Explore more at{' '}
            <Link to="/" className="hover:opacity-80 transition-colors" style={{ color: AMBER }}>
              AIinASIA.com
            </Link>
            {' '}or{' '}
            <Link to="/contact" className="hover:opacity-80 transition-colors" style={{ color: AMBER }}>
              share signals with us
            </Link>.
          </p>

          {/* Newsletter Signup */}
          <ThreeBeforeNineSignup />
        </div>
      </main>

      {/* Recent Editions */}
      <div className="bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <ThreeBeforeNineRecent currentSlug={article.slug} />
        </div>
      </div>
    </div>
  );
}

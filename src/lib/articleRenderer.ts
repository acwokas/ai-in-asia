/**
 * Server-safe article content renderer for AI in Asia.
 * No React, no DOMPurify — content comes from our own Supabase CMS.
 */

import { fixEncoding } from './textUtils';

const parseMarkdownTable = (block: string): string | null => {
  const lines = block.trim().split('\n').map(l => l.trim());
  if (lines.length < 2) return null;
  if (!lines.every(l => l.startsWith('|') && l.endsWith('|'))) return null;
  if (!/^\|[-:| ]+\|$/.test(lines[1])) return null;

  const parseRow = (line: string) =>
    line.slice(1, -1).split('|').map(cell => cell.trim());

  const headers = parseRow(lines[0]);
  const body = lines.slice(2).map(parseRow);

  const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${body.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
};

const stripWrappingQuotes = (text: string): string =>
  text.replace(/^[\u201c\u201d\u201e\u201f\u2018\u2019"'""'']+|[\u201c\u201d\u201e\u201f\u2018\u2019"'""'']+$/g, '').trim();

const wrapFaqAnswers = (html: string): string =>
  html.replace(
    /<h[34][^>]*>([^<]*\?[^<]*)<\/h[34]>\s*<p[^>]*>([\s\S]*?)<\/p>/gi,
    '<details class="group border border-border rounded-lg overflow-hidden mb-2"><summary class="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer font-semibold text-sm list-none select-none hover:bg-muted/40 transition-colors"><span>$1</span><svg class="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></summary><div class="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/40">$2</div></details>'
  );

const wrapBtnNumbers = (html: string): string =>
  html.replace(
    /(<div[^>]*class="by-the-numbers"[^>]*>[\s\S]*?<\/div>)/gi,
    (block) => block.replace(
      /(<li[^>]*>)(?![\s]*<)([\$€£]?[\d][,\d.]*(?:\s*(?:million|billion|trillion|thousand|[kKmMbBx]|\+|%))?)[\s:,]/g,
      '$1<strong>$2</strong> '
    )
  );

export const addNofollowToExternalLinks = (html: string): string =>
  html.replace(
    /(<a\s[^>]*href="https?:\/\/(?!(?:www\.)?aiinasia\.com)[^"]*"[^>]*)/gi,
    (match) => {
      if (/\brel="([^"]*)"/.test(match)) {
        return match.replace(/\brel="([^"]*)"/, (_, rel) =>
          `rel="${rel.includes('nofollow') ? rel : rel + ' nofollow'}"`
        ) + '>';
      }
      return match + ' rel="nofollow">';
    }
  );

export const addTargetBlankToExternalLinks = (html: string): string =>
  html.replace(
    /(<a\s[^>]*href="https?:\/\/(?!(?:www\.)?aiinasia\.com)[^"]*"[^>]*)/gi,
    (match) => {
      let result = match;
      if (!/\btarget=/.test(result)) result += ' target="_blank"';
      if (/\brel="([^"]*)"/.test(result)) {
        result = result.replace(/\brel="([^"]*)"/i, (_: string, rel: string) => {
          const parts = rel.split(/\s+/).filter(Boolean);
          if (!parts.includes('noopener')) parts.push('noopener');
          if (!parts.includes('noreferrer')) parts.push('noreferrer');
          return `rel="${parts.join(' ')}"`;
        });
      } else {
        result += ' rel="noopener noreferrer"';
      }
      return result + '>';
    }
  );

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export function injectAiTermTooltips(html: string, terms: GlossaryTerm[]): string {
  if (!terms.length) return html;

  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const usedTerms = new Set<string>();
  const skipTags = new Set(['a', 'code', 'pre', 'script', 'style', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em']);

  const parts = html.split(/(<[^>]*>)/);
  let skipDepth = 0;

  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const tagMatch = part.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/);
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        if (skipTags.has(tag)) {
          if (part.startsWith('</')) skipDepth = Math.max(0, skipDepth - 1);
          else if (!part.endsWith('/>')) skipDepth++;
        }
      }
      return part;
    }
    if (skipDepth > 0 || !part.trim()) return part;
    let text = part;
    for (const { term, definition } of sorted) {
      const key = term.toLowerCase();
      if (usedTerms.has(key)) continue;
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escaped})\\b`, 'i');
      if (regex.test(text)) {
        const safeDef = definition.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        text = text.replace(
          regex,
          `<span class="ai-term-tooltip" tabindex="0"><span class="ai-term-text">$1</span><span class="ai-term-popup" role="tooltip"><span class="ai-term-badge">✦ AI TERM</span><strong class="ai-term-name">${term}</strong><span class="ai-term-def">${safeDef}</span></span></span>`
        );
        usedTerms.add(key);
      }
    }
    return text;
  }).join('');
}

const generateHeadingId = (text: string): string =>
  text
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const cleanInternalLinks = (html: string): string =>
  html.replace(
    /<a\s+([^>]*?)href="(\/[^"]*|https?:\/\/(www\.)?aiinasia\.com[^"]*)"([^>]*?)>([\s\S]*?)<\/a>/gi,
    (_match, before, href, _www, after, inner) => {
      let attrs = (before + after)
        .replace(/\s*target="_blank"\s*/g, ' ')
        .replace(/\s*rel="noopener noreferrer"\s*/g, ' ')
        .replace(/inline-flex\s*/g, '')
        .replace(/items-center\s*/g, '')
        .replace(/gap-1\s*/g, '')
        .trim();
      const cleanInner = inner.replace(/<svg[\s\S]*?<\/svg>/gi, '').trim();
      return `<a ${attrs}href="${href}">${cleanInner}</a>`;
    }
  );

const normalizeYouTubeEmbeds = (html: string): string => {
  html = html.replace(
    /src="https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/[^"?]+\?[^\"]*\blist=([^"&]+)[^\"]*"/gi,
    'src="https://www.youtube.com/embed?listType=playlist&list=$1"'
  );
  html = html
    .replace(
      /<div([^>]*\bclass="[^"]*\byoutube-embed\b[^"]*"[^>]*)\sstyle="[^"]*"([^>]*)>/gi,
      '<div$1$2>'
    )
    .replace(
      /<iframe([^>]*\bsrc="[^"]*(?:youtube\.com|youtube-nocookie\.com)\/embed[^"]*"[^>]*)\sstyle="[^"]*"([^>]*)>/gi,
      '<iframe$1$2>'
    );
  return html;
};

const postProcess = (html: string, isSponsored: boolean): string => {
  html = html.replace(
    /(<h[2-6][^>]*>[^<]*by the numbers[^<]*<\/h[2-6]>\s*)(<ul[\s\S]*?<\/ul>)/gi,
    '<div class="by-the-numbers">$1$2</div>'
  );
  html = wrapBtnNumbers(html);

  html = html.replace(
    /(<h[1-6][^>]*>[^<]*[Cc]losing\s+[Tt]hought[^<]*<\/h[1-6]>\s*(?:<p[\s\S]*?<\/p>\s*)*)/g,
    '<div class="closing-thought">$1</div>'
  );

  html = html.replace(
    /<\/blockquote>\s*<blockquote[^>]*>\s*<p[^>]*>\s*(["\u201c]?\s*[-\u2014\u2013][\s\S]*?)\s*<\/p>\s*<\/blockquote>/gi,
    (_, attr) => {
      const cleanAttr = attr.replace(/^["\u201c]\s*/, '').replace(/["\u201d]\s*$/, '').replace(/^[-\u2014\u2013]\s*/, '').trim();
      return `<footer>${cleanAttr}</footer></blockquote>`;
    }
  );

  html = html.replace(
    /(<blockquote[^>]*>)\s*<p[^>]*>([\s\S]*?)\s+[\u2014\u2013]\s+([\s\S]*?)<\/p>\s*(<\/blockquote>)/gi,
    (_, open, quoteText, attribution, close) => {
      const cleanQuote = stripWrappingQuotes(quoteText.trim());
      const cleanAttr = attribution.replace(/["\u201d]\s*$/, '').trim();
      return `${open}<p>${cleanQuote}</p><footer>${cleanAttr}</footer>${close}`;
    }
  );

  html = cleanInternalLinks(html);

  html = html.replace(
    /(<div[^>]*class="(?:scout-view|editorial-view)"[^>]*>)([\s\S]*?)(<h[1-6][^>]*>[^<]*(?:FAQ|Frequently Asked)[^<]*<\/h[1-6]>[\s\S]*?)(<\/div>)/gi,
    (_, open, before, faq, close) => `${open}${before}${close}${faq}`
  );
  html = html.replace(
    /<div[^>]*class="(?:scout-view|editorial-view)"[^>]*>\s*<\/div>/gi,
    ''
  );

  html = html.replace(
    /(<div[^>]*class="scout-view"[^>]*>)\s*<h[1-6][^>]*>([^<]*(?:AI\s+IN\s+ASIA\s+VIEW|AIINASIA\s+VIEW)[^<]*)<\/h[1-6]>\s*/gi,
    '$1<strong>$2</strong>'
  );
  html = html.replace(
    /<h[1-6][^>]*>[^<]*(?:AI\s+IN\s+ASIA\s+VIEW|AIINASIA\s+VIEW)[^<]*<\/h[1-6]>\s*/gi,
    ''
  );

  // Rename scout-view → editorial-view so the CSS .editorial-view rules apply
  html = html.replace(
    /<div([^>]*)\bclass="scout-view"([^>]*)>/gi,
    '<div$1class="editorial-view"$2>'
  );

  // Wrap divs with arbitrary CMS classes containing "The AI in Asia View" strong
  if (!html.includes('class="editorial-view"')) {
    html = html.replace(
      /<div\s+class="[^"]*"[^>]*>\s*<strong[^>]*>\s*(?:THE\s+AI\s+IN\s+ASIA\s+VIEW|The\s+AI\s+in\s+Asia\s+View)[:\s]*<\/strong>([\s\S]*?)<\/div>/gi,
      (_, content) => `<div class="editorial-view"><strong>The AI in Asia View</strong>${content}</div>`
    );
  }

  // Wrap bare <p><strong>THE AI IN ASIA VIEW…</strong></p> + following paragraphs
  if (!html.includes('class="editorial-view"')) {
    html = html.replace(
      /(<p[^>]*>\s*<strong[^>]*>\s*(?:THE\s+AI\s+IN\s+ASIA\s+VIEW|The\s+AI\s+in\s+Asia\s+View)[:\s]*<\/strong>\s*<\/p>)((?:\s*<p[^>]*>[\s\S]*?<\/p>)+)/gi,
      (_, header, content) => `<div class="editorial-view"><strong>The AI in Asia View</strong>${content}</div>`
    );
  }

  html = wrapFaqAnswers(html);

  html = addTargetBlankToExternalLinks(html);
  if (isSponsored) html = addNofollowToExternalLinks(html);

  return html;
};

export function normaliseEditorialView(html: string): string {
  // Promote heading inside scout-view to <strong> before renaming
  html = html.replace(
    /(<div[^>]*class="scout-view"[^>]*>)\s*<h[1-6][^>]*>([^<]*(?:AI\s+IN\s+ASIA\s+VIEW|AIINASIA\s+VIEW)[^<]*)<\/h[1-6]>\s*/gi,
    '$1<strong>$2</strong>'
  );
  // Rename scout-view → editorial-view
  html = html.replace(
    /<div([^>]*)\bclass="scout-view"([^>]*)>/gi,
    '<div$1class="editorial-view"$2>'
  );
  // Wrap divs with arbitrary CMS classes containing "The AI in Asia View" strong
  if (!html.includes('class="editorial-view"')) {
    html = html.replace(
      /<div\s+class="[^"]*"[^>]*>\s*<strong[^>]*>\s*(?:THE\s+AI\s+IN\s+ASIA\s+VIEW|The\s+AI\s+in\s+Asia\s+View)[:\s]*<\/strong>([\s\S]*?)<\/div>/gi,
      (_, content) => `<div class="editorial-view"><strong>The AI in Asia View</strong>${content}</div>`
    );
  }
  // Wrap bare <p><strong>THE AI IN ASIA VIEW…</strong></p> + following paragraphs
  if (!html.includes('class="editorial-view"')) {
    html = html.replace(
      /(<p[^>]*>\s*<strong[^>]*>\s*(?:THE\s+AI\s+IN\s+ASIA\s+VIEW|The\s+AI\s+in\s+Asia\s+View)[:\s]*<\/strong>\s*<\/p>)((?:\s*<p[^>]*>[\s\S]*?<\/p>)+)/gi,
      (_, _header, content) => `<div class="editorial-view"><strong>The AI in Asia View</strong>${content}</div>`
    );
  }
  return html;
}

export function renderArticleContentHtml(content: any, isSponsored = false): string {
  if (!content) return '';

  if (typeof content !== 'string') {
    return '';
  }

  let fixedContent = fixEncoding(content);
  fixedContent = fixedContent
    .replace(/\bScout\s+View\b/gi, 'THE AI IN ASIA VIEW')
    .replace(/(?:THE\s+)?AIINASIA\s+VIEW\s*:?/gi, 'THE AI IN ASIA VIEW');
  fixedContent = fixedContent.replace(/^### (By The Numbers[^\n]*)/gim, '## $1');

  const hasPromptBoxes = fixedContent.includes('prompt-box');

  let consolidated = normalizeYouTubeEmbeds(fixedContent)
    .replace(/(- [^\n]+)\n\n(?=- )/g, '$1\n');

  consolidated = consolidated.replace(/<hr\s*\/?>/gi, '\n\n<hr />\n\n');
  consolidated = consolidated.replace(/(\d+\.\s[^\n]+)\n\n(?=\d+\.\s)/g, '$1\n');

  if (!hasPromptBoxes) {
    consolidated = consolidated
      .replace(/<div>\s*<\/div>/g, '\n\n')
      .replace(/<\/div>\s*<div>/g, '\n\n')
      .replace(/<\/?div>/g, '');
  }

  consolidated = consolidated
    .replace(/<a[^>]*>\s*Tweet\s*<\/a>/gi, '')
    .replace(/\[Tweet\]\([^)]*\)/gi, '')
    .replace(/^\s*Tweet\s*$/gm, '')
    .replace(/!\[([^\]]*)\]\(([^)]+\.(?:png|jpg|jpeg|gif|webp|svg|avif)(?:\?[^)]*)?)\)/gi,
      '<div class="my-8"><img src="$2" alt="$1" class="w-full rounded-lg" loading="lazy" /></div>')
    .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)')
    .replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]*subscribe[^\]]*)\]\((https?:\/\/)?(www\.)?aiinasia\.com[^\)]*\)/gi, '[Subscribe to our newsletter](/newsletter)')
    .replace(/\[([^\]]+)\]\((https?:\/\/)?(www\.)?aiinasia\.com\/connect\/?[^\)]*\)/gi, '[$1](/contact)')
    .replace(/\[([^\]]+)\]\((\/[^)]+)\)\^/g, '[$1]($2)')
    .replace(/\[([^\]]+)\]\((https?:\/\/(www\.)?aiinasia\.com[^)]*)\)\^/g, '[$1]($2)')
    .replace(/\[([^\]]+)\]\(([^)]+)\)\^/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline inline-flex items-center gap-1">$1<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline ml-0.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg></a>')
    .replace(/\[([^\]]+)\]\((https?:\/\/(?!aiinasia\.com)[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary underline hover:no-underline">$1</a>');

  consolidated = consolidated.replace(
    /(<blockquote[^>]*>)\s*<p[^>]*>([\s\S]*?)<\/p>\s*(<\/blockquote>)/gi,
    (_, open, inner, close) => `${open}<p>${stripWrappingQuotes(inner)}</p>${close}`
  );

  consolidated = consolidated.replace(/([^\n])\n(> )/g, '$1\n\n$2');
  consolidated = consolidated.replace(/(^> .+$)\n([^>\n])/gm, '$1\n\n$2');

  consolidated = consolidated
    .replace(/<p[^>]*>\s*(#{1,3}\s+)/gi, '$1')
    .replace(/<p[^>]*>\s*(- )/gi, '$1')
    .replace(/<p[^>]*>\s*(\d+\.\s)/gi, '$1')
    .replace(/<p[^>]*>\s*(> )/gi, '$1')
    .replace(/(#{1,3}\s+[^<]*)<\/p>/gi, '$1')
    .replace(/(- [^<]*)<\/p>/gi, '$1')
    .replace(/(\d+\.\s[^<]*)<\/p>/gi, '$1')
    .replace(/(> [^<]*)<\/p>/gi, '$1');

  consolidated = consolidated.replace(/(^|\n)(#{1,3}\s+)/g, (match, prefix, hashes) =>
    `${prefix || ''}\n\n${hashes}`
  );
  consolidated = consolidated.replace(/(#{1,3}\s+[^\n]+)\n(?!\n)/g, '$1\n\n');

  const protectedContent = consolidated.replace(
    /<figure>[\s\S]*?<\/figure>/g,
    (match) => match.replace(/\n\n/g, '\n')
  );

  const processBlock = (block: string): string => {
    if (
      block.includes('twitter-tweet') ||
      block.includes('instagram-media') ||
      block.includes('tiktok-embed') ||
      block.includes('youtube.com/embed')
    ) {
      return block;
    }
    if (block.startsWith('### ')) {
      const text = block.substring(4);
      const id = generateHeadingId(text);
      return `<h4 id="${id}" class="text-xl font-semibold mt-6 mb-3">${text}</h4>`;
    }
    if (block.startsWith('## ')) {
      const text = block.substring(3);
      const id = generateHeadingId(text);
      return `<h3 id="${id}" class="text-2xl font-semibold mt-8 mb-4">${text}</h3>`;
    }
    if (block.startsWith('# ')) {
      const text = block.substring(2);
      const id = generateHeadingId(text);
      return `<h2 id="${id}" class="text-3xl font-bold mt-12 mb-6 text-foreground">${text}</h2>`;
    }
    if (block.startsWith('> ') && !block.includes('twitter-tweet')) {
      const quoteLines = block.split('\n')
        .map(line => line.replace(/^>\s?/, '').trim())
        .filter(line => line.length > 0);
      let quoteText = '';
      let attribution = '';
      if (quoteLines.length > 1 && /^[-\u2014\u2013]/.test(quoteLines[quoteLines.length - 1])) {
        attribution = quoteLines.pop()!.replace(/^[-\u2014\u2013]\s*/, '').trim();
        quoteText = stripWrappingQuotes(quoteLines.join(' '));
      } else {
        quoteText = stripWrappingQuotes(quoteLines.join(' '));
      }
      return `<blockquote class="article-pull-quote"><p>${quoteText}</p>${attribution ? `<footer>${attribution}</footer>` : ''}</blockquote>`;
    }
    if (block.includes('\n- ') || block.startsWith('- ')) {
      const items = block.split('\n')
        .filter(line => line.trim().startsWith('- '))
        .map(line => `<li class="leading-relaxed mb-2">${line.trim().substring(2)}</li>`)
        .join('');
      return `<ul class="pl-6 my-6 space-y-1">${items}</ul>`;
    }
    if (/^\d+\.\s/.test(block) || /\n\d+\.\s/.test(block)) {
      const items = block.split('\n')
        .filter(line => /^\d+\.\s/.test(line.trim()))
        .map(line => `<li>${line.trim().replace(/^\d+\.\s/, '')}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }
    if (/^<(div|blockquote|figure|iframe|table|ul|ol|hr|h[1-6]|section|img|pre)\b/i.test(block)) {
      return block;
    }
    const tableHtml = parseMarkdownTable(block);
    if (tableHtml) return tableHtml;
    return `<p class="leading-relaxed mb-6">${block.replace(/\n/g, ' ')}</p>`;
  };

  let blocks: string[];
  let htmlBlocks: string[];

  if (hasPromptBoxes) {
    const promptBoxRegex = /<div\s+class="prompt-box"[^>]*>[\s\S]*?<div\s+class="prompt-box-content"[^>]*>[\s\S]*?<\/div>(?:\s*<br\s*\/?>)*\s*<\/div>/gi;
    const promptBoxes: string[] = [];
    const contentWithPlaceholders = consolidated.replace(promptBoxRegex, (match) => {
      const index = promptBoxes.length;
      promptBoxes.push(match);
      return `\n\n__PROMPT_BOX_${index}__\n\n`;
    });

    blocks = contentWithPlaceholders.split('\n\n').map(b => b.trim()).filter(b => b.length > 0);
    htmlBlocks = blocks.map(block => {
      const placeholderMatch = block.match(/^__PROMPT_BOX_(\d+)__$/);
      if (placeholderMatch) {
        return promptBoxes[parseInt(placeholderMatch[1], 10)];
      }
      return processBlock(block);
    });
  } else {
    blocks = protectedContent.split('\n\n').map(b => b.trim()).filter(b => b.length > 0);
    htmlBlocks = blocks.map(processBlock);
  }

  let html = htmlBlocks.join('\n');
  html = postProcess(html, isSponsored);

  return html;
}

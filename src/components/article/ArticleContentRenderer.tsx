/**
 * Article Content Renderer
 * Handles rendering of article content from various formats (string/markdown/JSON)
 * Extracted from Article.tsx for maintainability
 */

import DOMPurify from "dompurify";

import { InArticleAd } from "@/components/GoogleAds";

/** Generate a URL-safe heading ID from text */
export const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/^\d+\.\s*/, '') // strip leading "1. "
    .replace(/[^\w\s-]/g, '') // strip special chars, emojis, punctuation
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};


// Process inline formatting for text content
const processInlineFormatting = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .replace(/<a[^>]*>\s*Tweet\s*<\/a>/gi, '')
    .replace(/\[Tweet\]\([^)]*\)/gi, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/(?!aiinasia\.com)[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1</a>')
    .replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, '<em>$1</em>');
};

// Normalize YouTube embeds
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

interface RenderContentProps {
  content: any;
}

export const renderArticleContent = (content: any): React.ReactNode => {
  if (!content) return null;

  // Handle string content (markdown or raw HTML from the editor)
  if (typeof content === 'string') {
    const hasPromptBoxes = content.includes('prompt-box');

    // Consolidate consecutive bullet points
    let consolidated = normalizeYouTubeEmbeds(content).replace(/(- [^\n]+)\n\n(?=- )/g, '$1\n');

    // Normalize <hr> separators
    consolidated = consolidated.replace(/<hr\s*\/?>/gi, "\n\n<hr />\n\n");
    
    // Consolidate numbered lists
    consolidated = consolidated.replace(/(\d+\.\s[^\n]+)\n\n(?=\d+\.\s)/g, '$1\n');
    
    // Clean up div wrappers (only when no prompt boxes)
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
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<div class="my-8"><img src="$2" alt="$1" class="w-full rounded-lg" loading="lazy" /></div>')
      .replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, '<em>$1</em>')
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]*subscribe[^\]]*)\]\((https?:\/\/)?(www\.)?aiinasia\.com[^\)]*\)/gi, '[Subscribe to our newsletter](/newsletter)')
      .replace(/\[([^\]]+)\]\((https?:\/\/)?(www\.)?aiinasia\.com\/connect\/?[^\)]*\)/gi, '[$1](/contact)')
      .replace(/\[([^\]]+)\]\(([^)]+)\)\^/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline inline-flex items-center gap-1">$1<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline ml-0.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg></a>')
      .replace(/\[([^\]]+)\]\((https?:\/\/(?!aiinasia\.com)[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1</a>');

    // Ensure headings start their own block
    consolidated = consolidated.replace(/(^|\n)(#{1,3}\s+)/g, (match, prefix, hashes) => {
      const safePrefix = prefix || '';
      return `${safePrefix}\n\n${hashes}`;
    });
    
    // Handle content with prompt boxes
    if (consolidated.includes('prompt-box')) {
      const promptBoxRegex = /<div\s+class="prompt-box"[^>]*>[\s\S]*?<div\s+class="prompt-box-content"[^>]*>[\s\S]*?<\/div>(?:\s*<br\s*\/?>)*\s*<\/div>/gi;
      const promptBoxes: string[] = [];
      let contentWithPlaceholders = consolidated.replace(promptBoxRegex, (match) => {
        const index = promptBoxes.length;
        promptBoxes.push(match);
        return `\n\n__PROMPT_BOX_${index}__\n\n`;
      });
      
      const blocks = contentWithPlaceholders.split('\n\n').map(block => block.trim()).filter(block => block.length > 0);
      
      const htmlBlocks = blocks.map(block => {
        const placeholderMatch = block.match(/^__PROMPT_BOX_(\d+)__$/);
        if (placeholderMatch) {
          const index = parseInt(placeholderMatch[1], 10);
          return promptBoxes[index];
        }
        
        if (block.includes('twitter-tweet') || 
            block.includes('instagram-media') || 
            block.includes('tiktok-embed') ||
            block.includes('youtube.com/embed')) {
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
          const quoteContent = block.substring(2);
          return `<blockquote class="article-pull-quote">
            <p>${quoteContent}</p>
          </blockquote>`;
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
            .map(line => {
              const content = line.trim().replace(/^\d+\.\s/, '');
              return `<li>${content}</li>`;
            })
            .join('');
          return `<ol>${items}</ol>`;
        }
        return `<p class="leading-relaxed mb-6">${block.replace(/\n/g, ' ')}</p>`;
      });
      
      const sanitizedHtml = DOMPurify.sanitize(htmlBlocks.join('\n\n'), {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'div', 'span', 'iframe', 'img', 'figure', 'figcaption', 'button', 'svg', 'path', 'section', 'time', 'hr'],
        ALLOWED_ATTR: ['id', 'href', 'target', 'rel', 'class', 'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style', 'alt', 'title', 'loading', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'data-prompt-title', 'data-prompt-content', 'type', 'lang', 'dir', 'data-instgrm-captioned', 'data-instgrm-permalink', 'data-instgrm-version', 'cite', 'data-video-id', 'datetime', 'onclick']
      });
      
      return <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
    }
    
    // Standard content processing (no prompt boxes)
    const blocks = consolidated.split('\n\n').map(block => block.trim()).filter(block => block.length > 0);
    
    const htmlBlocks = blocks.map((block, index) => {
      if (block.includes('twitter-tweet') || 
          block.includes('instagram-media') || 
          block.includes('tiktok-embed') ||
          block.includes('youtube.com/embed')) {
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
        const quoteContent = block.substring(2);
        return `<blockquote class="article-pull-quote">
          <p>${quoteContent}</p>
        </blockquote>`;
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
          .map(line => {
            const content = line.trim().replace(/^\d+\.\s/, '');
            return `<li>${content}</li>`;
          })
          .join('');
        return `<ol>${items}</ol>`;
      }
      return `<p class="leading-relaxed mb-6">${block.replace(/\n/g, ' ')}</p>`;
    });
    
    // Inject ad after certain blocks
    const totalBlocks = htmlBlocks.length;
    const adPosition = Math.floor(totalBlocks * 0.7);
    
    const finalBlocks: React.ReactNode[] = [];
    htmlBlocks.forEach((block, index) => {
      const sanitizedBlock = DOMPurify.sanitize(block, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'div', 'span', 'iframe', 'img', 'figure', 'figcaption', 'button', 'svg', 'path', 'section', 'time', 'hr'],
        ALLOWED_ATTR: ['id', 'href', 'target', 'rel', 'class', 'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style', 'alt', 'title', 'loading', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'cite', 'data-video-id', 'datetime']
      });
      
      finalBlocks.push(
        <div key={index} dangerouslySetInnerHTML={{ __html: sanitizedBlock }} />
      );
/** Generate a URL-safe heading ID from text */
const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/^\d+\.\s*/, '') // strip leading "1. "
    .replace(/[^\w\s-]/g, '') // strip special chars, emojis, punctuation
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};


      if (index === adPosition && totalBlocks > 8) {
        finalBlocks.push(<InArticleAd key="ad-inline" />);
      }
    });
    
    return <div className="prose prose-lg max-w-none">{finalBlocks}</div>;
  }
  
  // Handle JSON content (legacy format)
  try {
    const blocks = typeof content === 'string' ? JSON.parse(content) : content;
    
    return blocks.map((block: any, index: number) => {
      if (block.type === 'heading' && block.content && 
          (block.content.toLowerCase().includes('tl;dr') || block.content.toLowerCase().includes('tldr'))) {
        return null;
      }
      
      switch (block.type) {
        case 'paragraph':
          const contentText = block.content || '';
          const sanitizedContent = DOMPurify.sanitize(processInlineFormatting(contentText), {
            ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'a', 'br', 'span'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
          });

          const isLikelyImageCaption = contentText.length < 100 && (
            contentText.toLowerCase().includes('image:') ||
            contentText.toLowerCase().includes('source:') ||
            contentText.toLowerCase().includes('credit:') ||
            contentText.toLowerCase().includes('photo:')
          );

          return (
            <p 
              key={index} 
              className={`leading-relaxed mb-6 ${isLikelyImageCaption ? 'text-sm text-muted-foreground text-center -mt-4' : ''}`}
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          );
          
        case 'heading':
          const level = block.attrs?.level || 2;
          const shiftedLevel = Math.min(level + 1, 6);
          const HeadingTag = `h${shiftedLevel}` as keyof JSX.IntrinsicElements;
          const headingClasses = shiftedLevel === 2 ? "text-3xl font-bold mt-12 mb-6 text-foreground" :
                               shiftedLevel === 3 ? "text-2xl font-semibold mt-8 mb-4" :
                               "text-xl font-semibold mt-6 mb-3";
          const headingId = generateHeadingId(block.content || '');
          return (
            <HeadingTag key={index} id={headingId} className={headingClasses}>
              {block.content}
            </HeadingTag>
          );
          
        case 'quote':
          return (
            <blockquote key={index} className="article-pull-quote">
              <p>{block.content}</p>
            </blockquote>
          );
          
        case 'list':
          const listItems = Array.isArray(block.content) ? block.content : [block.content];
          const isOrdered = block.attrs?.listType === 'ordered';
          const ListTag = isOrdered ? 'ol' : 'ul';
          
          return (
            <ListTag 
              key={index} 
              className={isOrdered ? "list-none pl-10 my-6 space-y-2" : "list-disc pl-8 my-6 space-y-2"}
              style={isOrdered ? { counterReset: 'list-counter' } : undefined}
            >
              {listItems.map((item: string, i: number) => {
                const sanitizedItem = DOMPurify.sanitize(processInlineFormatting(item), {
                  ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'a', 'br', 'span'],
                  ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
                });
                return (
                  <li 
                    key={i}
                    className={isOrdered ? "relative pl-2" : ""}
                    style={isOrdered ? { counterIncrement: 'list-counter' } : undefined}
                    dangerouslySetInnerHTML={{ __html: sanitizedItem }}
                  />
                );
              })}
            </ListTag>
          );
        
        case 'image':
          return (
            <div key={index} className="my-8">
              <img 
                src={block.attrs?.src || block.url} 
                alt={block.attrs?.alt || block.alt || ''} 
                className="w-full rounded-lg"
                loading="lazy"
              />
              {(block.attrs?.caption || block.caption) && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  {block.attrs?.caption || block.caption}
                </p>
              )}
            </div>
          );
          
        default:
          return null;
      }
    }).filter(Boolean);
  } catch (error) {
    return <p className="leading-relaxed mb-6">{content}</p>;
  }
};

export default renderArticleContent;

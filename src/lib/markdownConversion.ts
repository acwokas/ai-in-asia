/**
 * Markdown/HTML Conversion Utilities
 * Extracted from RichTextEditor for reuse and maintainability
 */

// Helper function to generate URL-safe slugs
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

export const convertMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return "";

  // First, preserve any existing HTML (prompt boxes, YouTube embeds, iframes) by converting to placeholders
  const preservedMatches: string[] = [];

  const hasPromptBoxes = markdown.includes('prompt-box');

  // Preserve prompt boxes
  let processed = markdown.replace(/<div class="prompt-box"[^>]*>.*?<\/div>/gs, (match) => {
    const index = preservedMatches.length;
    preservedMatches.push(match);
    return `__PRESERVED_${index}__`;
  });

  // Preserve YouTube embeds
  processed = processed.replace(/<div class="youtube-embed"[^>]*>.*?<\/div>/gs, (match) => {
    const index = preservedMatches.length;
    preservedMatches.push(match);
    return `__PRESERVED_${index}__`;
  });

  // Preserve social media embeds (Twitter, Instagram, TikTok)
  processed = processed.replace(/<div class="social-embed[^"]*"[^>]*>.*?<\/div>/gs, (match) => {
    const index = preservedMatches.length;
    preservedMatches.push(match);
    return `__PRESERVED_${index}__`;
  });

  if (!hasPromptBoxes) {
    // Normalize simple <div> wrappers from pasted content so markdown headings are detectable
    processed = processed
      .replace(/<div>\s*<\/div>/g, '\n\n')
      .replace(/<\/div>\s*<div>/g, '\n\n')
      .replace(/<\/?div>/g, '');
  }

  // More robust line-by-line markdown handling, especially for headings
  const lines = processed.split(/\r?\n/);
  const htmlLines = lines.map((line) => {
    const trimmed = line.trim();

    // Headings (support up to ### for now)
    if (/^###\s+/.test(trimmed)) {
      return `<h3>${trimmed.replace(/^###\s+/, "")}</h3>`;
    }
    if (/^##\s+/.test(trimmed)) {
      return `<h2>${trimmed.replace(/^##\s+/, "")}</h2>`;
    }
    if (/^#\s+/.test(trimmed)) {
      return `<h1>${trimmed.replace(/^#\s+/, "")}</h1>`;
    }

    // Blockquote
    if (/^>\s+/.test(trimmed)) {
      return `<blockquote>${trimmed.replace(/^>\s+/, "")}</blockquote>`;
    }

    // Unordered list item
    if (/^-\s+/.test(trimmed)) {
      return `<li>${trimmed.replace(/^-\s+/, "")}</li>`;
    }

    // Ordered list item
    if (/^\d+\.\s+/.test(trimmed)) {
      return `<li>${trimmed.replace(/^\d+\.\s+/, "")}</li>`;
    }

    // Empty line
    if (trimmed === "") {
      return "";
    }

    // Fallback paragraph text (inline formatting and links will be handled later)
    return trimmed;
  });

  let html = htmlLines.join("\n");

  // Inline formatting and links
  html = html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Handle links with new tab marker (^)
    .replace(/\[(.+?)\]\((.+?)\)\^/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Handle regular links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Group consecutive list items into <ul> / <ol>
  html = html
    .replace(/(?:<li>.*?<\/li>\n?)+/gs, (match) => {
      // If it already has a parent list, leave as is
      if (/<ul>|<ol>/.test(match)) return match;
      // Heuristic: treat as unordered list for now
      return `<ul>${match}</ul>`;
    })
    // Convert single line-breaks to <br> and double to paragraph breaks
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");

  // Wrap entire content in a paragraph if it doesn't start with a block-level element
  if (!/^\s*<(h[1-6]|ul|ol|blockquote|div|table|p|iframe)/i.test(html)) {
    html = `<p>${html}</p>`;
  }

  // Restore preserved elements
  preservedMatches.forEach((preserved, index) => {
    html = html.replace(`__PRESERVED_${index}__`, preserved);
  });

  return html;
};

export const convertHtmlToMarkdown = (html: string): string => {
  if (!html) return '';

  // If the content contains our custom prompt cards, keep the raw HTML
  if (html.includes('class="prompt-box"')) {
    return html;
  }
  
  // First, preserve YouTube embeds, iframes, and prompt boxes by converting them to placeholder markers
  const preservedMatches: string[] = [];
  
  // Preserve prompt boxes
  let processed = html.replace(/<div class="prompt-box"[^>]*>.*?<\/div>/gs, (match) => {
    const index = preservedMatches.length;
    preservedMatches.push(match);
    return `__PRESERVED_${index}__`;
  });
  
  // Preserve YouTube embeds
  processed = processed.replace(/<div class="youtube-embed"[^>]*>.*?<\/div>/gs, (match) => {
    const index = preservedMatches.length;
    preservedMatches.push(match);
    return `__PRESERVED_${index}__`;
  });

  // Preserve social media embeds (Twitter, Instagram, TikTok)
  processed = processed.replace(/<div class="social-embed[^"]*"[^>]*>.*?<\/div>/gs, (match) => {
    const index = preservedMatches.length;
    preservedMatches.push(match);
    return `__PRESERVED_${index}__`;
  });
  
  // Also preserve standalone iframes
  processed = processed.replace(/<iframe[^>]*>.*?<\/iframe>/gs, (match) => {
    const index = preservedMatches.length;
    preservedMatches.push(match);
    return `__PRESERVED_${index}__`;
  });
  
  // First, normalize block elements to ensure they're properly separated
  let normalized = processed
    // Ensure block elements have line breaks before them if they don't already
    .replace(/([^\n>])(<h[123])/g, '$1\n\n$2')
    .replace(/([^\n>])(<blockquote)/g, '$1\n\n$2')
    .replace(/([^\n>])(<p[^>]*>)/g, '$1\n\n$2')
    .replace(/([^\n>])(<ul)/g, '$1\n\n$2')
    .replace(/([^\n>])(<ol)/g, '$1\n\n$2')
    // Ensure block closing tags have line breaks after them
    .replace(/(<\/h[123]>)([^\n])/g, '$1\n\n$2')
    .replace(/(<\/blockquote>)([^\n])/g, '$1\n\n$2')
    .replace(/(<\/p>)([^\n])/g, '$1\n\n$2')
    .replace(/(<\/ul>)([^\n])/g, '$1\n\n$2')
    .replace(/(<\/ol>)([^\n])/g, '$1\n\n$2');
  
  let markdown = normalized
    // Strip span elements but keep their content (before other conversions)
    .replace(/<span[^>]*>(.*?)<\/span>/gs, '$1')
    // Convert inline formatting first
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<i>(.*?)<\/i>/g, '*$1*')
    // Convert headings (must be done before paragraphs)
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1')
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
    // Convert links - preserve target="_blank" with ^ marker (handles various attribute orders)
    .replace(/<a\s+[^>]*?href="([^"]*)"[^>]*?target="_blank"[^>]*?>(.*?)<\/a>/gi, '[$2]($1)^')
    .replace(/<a\s+[^>]*?target="_blank"[^>]*?href="([^"]*)"[^>]*?>(.*?)<\/a>/gi, '[$2]($1)^')
    .replace(/<a\s+[^>]*?href="([^"]*)"[^>]*?rel="[^"]*"[^>]*?target="_blank"[^>]*?>(.*?)<\/a>/gi, '[$2]($1)^')
    // Convert regular links (must be after target="_blank" patterns)
    .replace(/<a\s+[^>]*?href="([^"]*)"[^>]*?>(.*?)<\/a>/gi, '[$2]($1)')
    // Convert ordered lists first
    .replace(/<ol[^>]*>(.*?)<\/ol>/gs, (match, content) => {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gs, (_: string, item: string) => {
        return `${counter++}. ${item}\n`;
      });
    })
    // Convert unordered lists
    .replace(/<li[^>]*>(.*?)<\/li>/gs, '- $1\n')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gs, '$1')
    // Convert blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, '> $1')
    // Convert paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gs, '$1')
    // Convert breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Clean up excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Restore preserved elements (prompt boxes, iframes, YouTube embeds) back to actual HTML
  preservedMatches.forEach((preserved, index) => {
    markdown = markdown.replace(`__PRESERVED_${index}__`, preserved);
  });
  
  return markdown;
};

// Helper function to convert JSONB content to markdown (for CMSEditor)
export const convertJsonbToMarkdown = (jsonbContent: any): string => {
  if (!jsonbContent) return "";
  if (typeof jsonbContent === "string") return jsonbContent;
  if (!Array.isArray(jsonbContent)) return "";
  
  let listCounter = 0;
  let currentListType = '';
  
  return jsonbContent.map((block: any) => {
    if (!block || !block.type) return "";
    
    // Reset counter when switching list types
    if (block.type !== currentListType) {
      listCounter = 0;
      currentListType = block.type;
    }
    
    switch (block.type) {
      case "paragraph":
        return block.content || "";
      case "heading":
        const level = block.attrs?.level || 2;
        const prefix = "#".repeat(level);
        return `${prefix} ${block.content || ""}`;
      case "bulletList":
      case "listItem":
        // Handle both flat lists and nested content
        if (Array.isArray(block.content)) {
          return block.content.map((item: any) => `- ${item.content || item}`).join("\n");
        }
        return `- ${block.content || ""}`;
      case "orderedList":
        // Handle both flat lists and nested content  
        if (Array.isArray(block.content)) {
          return block.content.map((item: any, idx: number) => `${idx + 1}. ${item.content || item}`).join("\n");
        }
        listCounter++;
        return `${listCounter}. ${block.content || ""}`;
      case "blockquote":
        return `> ${block.content || ""}`;
      default:
        return block.content || "";
    }
  }).join("\n\n");
};

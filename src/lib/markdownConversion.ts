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

  // Preserve any existing HTML blocks (prompt boxes, embeds) using placeholders.
  // This prevents our markdown-to-html logic from corrupting complex pasted HTML.
  const preservedMatches: string[] = [];
  const hasPromptBoxes = markdown.includes("prompt-box");

  const preserve = (input: string, regex: RegExp) =>
    input.replace(regex, (match) => {
      const index = preservedMatches.length;
      preservedMatches.push(match);
      return `__PRESERVED_${index}__`;
    });

  // Preserve prompt boxes (must capture the full structure; single </div> is not enough)
  let processed = preserve(
    markdown,
    /<div\s+class="prompt-box"[^>]*>[\s\S]*?<div\s+class="prompt-box-content"[^>]*>[\s\S]*?<\/div>(?:\s*<br\s*\/?>(?:\s*)?)*\s*<\/div>/gi
  );

  // Preserve YouTube embeds
  processed = preserve(processed, /<div\s+class="youtube-embed"[^>]*>[\s\S]*?<\/div>/gi);

  // Preserve social media embeds (Twitter, Instagram, TikTok)
  processed = preserve(processed, /<div\s+class="social-embed[^\"]*"[^>]*>[\s\S]*?<\/div>/gi);

  if (!hasPromptBoxes) {
    // Normalize simple <div> wrappers from pasted content so markdown headings are detectable
    processed = processed
      .replace(/<div>\s*<\/div>/g, "\n\n")
      .replace(/<\/div>\s*<div>/g, "\n\n")
      .replace(/<\/?div>/g, "");
  }

  const applyInline = (text: string) => {
    return text
      // Links with new tab marker (^)
      .replace(
        /\[(.+?)\]\((.+?)\)\^/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      )
      // Regular links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      // Bold then italic (avoid eating **bold**)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
  };

  const lines = processed.split(/\r?\n/);
  const blocks: string[] = [];

  let paragraphLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const raw = paragraphLines.join("\n").trim();
    paragraphLines = [];
    if (!raw) return;
    const htmlText = applyInline(raw).replace(/\n/g, "<br>");
    blocks.push(`<p>${htmlText}</p>`);
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }

    const itemsHtml = listItems.map((item) => `<li>${applyInline(item)}</li>`).join("");
    blocks.push(`<${listType}>${itemsHtml}</${listType}>`);
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Blank line => paragraph/list boundary
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // Restore-preserved placeholders should pass through as-is
    if (/^__PRESERVED_\d+__$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push(trimmed);
      continue;
    }

    // Headings
    if (/^###\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push(`<h3>${applyInline(trimmed.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push(`<h2>${applyInline(trimmed.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push(`<h1>${applyInline(trimmed.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }

    // Blockquote
    if (/^>\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${applyInline(trimmed.replace(/^>\s+/, ""))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^-\s+/.test(trimmed)) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(trimmed.replace(/^-\s+/, ""));
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      continue;
    }

    // If line is already an HTML block, keep it (but don't mix inside <p>)
    if (/^<(h[1-6]|p|ul|ol|li|blockquote|div|iframe|table|hr)\b/i.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push(trimmed);
      continue;
    }

    // Default => paragraph content
    if (listType) flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  let html = blocks.join("\n\n");

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

  // Preserve prompt boxes (capture full structure)
  let processed = html.replace(
    /<div\s+class="prompt-box"[^>]*>[\s\S]*?<div\s+class="prompt-box-content"[^>]*>[\s\S]*?<\/div>(?:\s*<br\s*\/?>(?:\s*)?)*\s*<\/div>/gi,
    (match) => {
      const index = preservedMatches.length;
      preservedMatches.push(match);
      return `__PRESERVED_${index}__`;
    }
  );

  // Preserve YouTube embeds
  processed = processed.replace(/<div\s+class="youtube-embed"[^>]*>[\s\S]*?<\/div>/gi, (match) => {
    const index = preservedMatches.length;
    preservedMatches.push(match);
    return `__PRESERVED_${index}__`;
  });

  // Preserve social media embeds (Twitter, Instagram, TikTok)
  processed = processed.replace(/<div\s+class="social-embed[^\"]*"[^>]*>[\s\S]*?<\/div>/gi, (match) => {
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
  
  // Strip ALL span elements (including those with complex attributes) but preserve inner content
  // Use a loop to handle nested spans
  let spanFree = normalized;
  while (/<span[^>]*>/.test(spanFree)) {
    spanFree = spanFree.replace(/<span[^>]*>([^<]*(?:(?!<\/?span)<[^<]*)*)<\/span>/gi, '$1');
  }
  
  let markdown = spanFree
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

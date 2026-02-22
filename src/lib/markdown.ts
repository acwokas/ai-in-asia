export const convertSimpleMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return "";

  // Clean up unnecessary <div> wrappers that may come from rich text editors
  // Keep the content inside, strip the <div> tags
  let cleaned = markdown
    .replace(/<div>\s*<\/div>/gi, '') // Remove empty divs
    .replace(/<div>(.*?)<\/div>/gi, '$1\n'); // Unwrap div contents and add newline

  // Process line by line to build proper HTML structure
  const lines = cleaned.split(/\r?\n/);
  const processedLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  
  const closeList = () => {
    if (listType) {
      processedLines.push(`</${listType}>`);
      listType = null;
    }
  };
  
  lines.forEach((line) => {
    const trimmed = line.trim();

    // Headers
    if (/^###\s+/.test(trimmed)) {
      closeList();
      processedLines.push(`<h3>${trimmed.replace(/^###\s+/, "")}</h3>`);
    } else if (/^##\s+/.test(trimmed)) {
      closeList();
      processedLines.push(`<h2>${trimmed.replace(/^##\s+/, "")}</h2>`);
    } else if (/^#\s+/.test(trimmed)) {
      closeList();
      processedLines.push(`<h1>${trimmed.replace(/^#\s+/, "")}</h1>`);
    } 
    // Blockquotes
    else if (/^>\s+/.test(trimmed)) {
      closeList();
      processedLines.push(`<blockquote>${trimmed.replace(/^>\s+/, "")}</blockquote>`);
    } 
    // List items (unordered)
    else if (/^[-•]\s+/.test(trimmed)) {
      if (listType && listType !== 'ul') closeList();
      if (!listType) {
        processedLines.push('<ul>');
        listType = 'ul';
      }
      processedLines.push(`<li>${trimmed.replace(/^[-•]\s+/, "")}</li>`);
    } 
    // List items (ordered)
    else if (/^\d+\.\s+/.test(trimmed)) {
      if (listType && listType !== 'ol') closeList();
      if (!listType) {
        processedLines.push('<ol style="list-style-type:decimal">');
        listType = 'ol';
      }
      processedLines.push(`<li>${trimmed.replace(/^\d+\.\s+/, "")}</li>`);
    } 
    // Empty lines
    else if (trimmed === "") {
      closeList();
      processedLines.push("");
    } 
    // Regular text
    else {
      closeList();
      processedLines.push(trimmed);
    }
  });

  // Close any open list
  closeList();

  let html = processedLines.join("\n");

  // Apply inline formatting
  html = html
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)\^/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">$1</a>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80">$1</a>')
    .replace(/\n{2,}/g, "</p><p>");

  // Wrap in paragraphs if needed
  if (!/^\s*<(h[1-6]|ul|ol|blockquote|div|table|p|iframe)/i.test(html)) {
    html = `<p>${html}</p>`;
  }

  return html;
};

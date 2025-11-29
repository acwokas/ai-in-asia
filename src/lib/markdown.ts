export const convertSimpleMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return "";

  // Process line by line to build proper HTML structure
  const lines = markdown.split(/\r?\n/);
  const processedLines: string[] = [];
  let inList = false;
  
  lines.forEach((line) => {
    const trimmed = line.trim();

    // Headers
    if (/^###\s+/.test(trimmed)) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(`<h3>${trimmed.replace(/^###\s+/, "")}</h3>`);
    } else if (/^##\s+/.test(trimmed)) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(`<h2>${trimmed.replace(/^##\s+/, "")}</h2>`);
    } else if (/^#\s+/.test(trimmed)) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(`<h1>${trimmed.replace(/^#\s+/, "")}</h1>`);
    } 
    // Blockquotes
    else if (/^>\s+/.test(trimmed)) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(`<blockquote>${trimmed.replace(/^>\s+/, "")}</blockquote>`);
    } 
    // List items (unordered)
    else if (/^[-•]\s+/.test(trimmed)) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${trimmed.replace(/^[-•]\s+/, "")}</li>`);
    } 
    // List items (ordered)
    else if (/^\d+\.\s+/.test(trimmed)) {
      if (!inList) {
        processedLines.push('<ol>');
        inList = true;
      }
      processedLines.push(`<li>${trimmed.replace(/^\d+\.\s+/, "")}</li>`);
    } 
    // Empty lines
    else if (trimmed === "") {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push("");
    } 
    // Regular text
    else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(trimmed);
    }
  });

  // Close any open list
  if (inList) {
    processedLines.push('</ul>');
  }

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

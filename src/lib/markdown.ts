export const convertSimpleMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return "";

  const lines = markdown.split(/\r?\n/);
  const htmlLines = lines.map((line) => {
    const trimmed = line.trim();

    if (/^###\s+/.test(trimmed)) return `<h3>${trimmed.replace(/^###\s+/, "")}</h3>`;
    if (/^##\s+/.test(trimmed)) return `<h2>${trimmed.replace(/^##\s+/, "")}</h2>`;
    if (/^#\s+/.test(trimmed)) return `<h1>${trimmed.replace(/^#\s+/, "")}</h1>`;
    if (/^>\s+/.test(trimmed)) return `<blockquote>${trimmed.replace(/^>\s+/, "")}</blockquote>`;
    if (/^-\s+/.test(trimmed)) return `<li>${trimmed.replace(/^-\s+/, "")}</li>`;
    if (/^\d+\.\s+/.test(trimmed)) return `<li>${trimmed.replace(/^\d+\.\s+/, "")}</li>`;
    if (trimmed === "") return "";
    return trimmed;
  });

  let html = htmlLines.join("\n");

  html = html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1<\/strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1<\/em>")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong>$1<\/strong>")
    .replace(/\[(.+?)\]\((.+?)\)\^/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary\/80">$1<\/a>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline hover:text-primary\/80">$1<\/a>')
    // Auto-link bare URLs that aren't already inside an anchor tag
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary\/80">$2<\/a>')
    .replace(/(?:<li>.*?<\/li>\n?)+/gs, (match) => `<ul>${match}<\/ul>`)
    .replace(/\n{2,}/g, "<\/p><p>");

  if (!/^\s*<(h[1-6]|ul|ol|blockquote|div|table|p|iframe)/i.test(html)) {
    html = `<p>${html}</p>`;
  }

  return html;
};

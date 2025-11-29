import { TopListItem } from "./TopListsEditor";

interface TopListsPreviewProps {
  items: TopListItem[];
  intro?: string;
  outro?: string;
}

const convertMarkdownToHtml = (markdown: string): string => {
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
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1<\/strong>")
    .replace(/\*(.+?)\*/g, "<em>$1<\/em>")
    .replace(/\[(.+?)\]\((.+?)\)\^/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1<\/a>')
    .replace(/(?:<li>.*?<\/li>\n?)+/gs, (match) => `<ul>${match}<\/ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");

  if (!/^\s*<(h[1-6]|ul|ol|blockquote|div|table|p|iframe)/i.test(html)) {
    html = `<p>${html}</p>`;
  }

  return html;
};

const getHtmlContent = (content?: string) => {
  if (!content) return undefined;
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  const html = looksLikeHtml ? content : convertMarkdownToHtml(content);
  return { __html: html };
};

export const TopListsPreview = ({ items, intro, outro }: TopListsPreviewProps) => {
  console.log('[TopListsPreview] intro:', intro);
  console.log('[TopListsPreview] outro:', outro);
  return (
    <div className="space-y-8 p-4">
      {intro && (
        <div className="prose prose-sm max-w-none mb-8" dangerouslySetInnerHTML={getHtmlContent(intro)} />
      )}
      
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground">No items to preview</p>
      ) : (
        items.map((item, index) => (
          <div key={item.id} className="space-y-4">
            <h3 className="text-xl font-bold">
              {index + 1}. {item.title || "(No title)"}
            </h3>

            {item.description_top && (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={getHtmlContent(item.description_top)}
              />
            )}

            {item.contentBox && (
              <div
                className="prose prose-sm max-w-none my-4"
                dangerouslySetInnerHTML={getHtmlContent(item.contentBox)}
              />
            )}

            {item.image_urls && item.image_urls.length > 0 && (
              <div className="my-4 space-y-2">
                {item.image_urls.map((url, imgIndex) => (
                  <img
                    key={imgIndex}
                    src={url}
                    alt={`${item.title} - Image ${imgIndex + 1}`}
                    className="rounded-lg max-w-full h-auto"
                  />
                ))}
              </div>
            )}

            <div className="prompt-box bg-muted/50 border border-border rounded-lg p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {item.prompt || "(No prompt)"}
              </pre>
            </div>

            {item.variations && item.variations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Model-specific variations:</p>
                {item.variations.map((variation, varIndex) => (
                  <div key={varIndex} className="prompt-box bg-muted/30 border border-border rounded-lg p-3">
                    <p className="text-xs font-semibold mb-2 uppercase">{variation.model}</p>
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {variation.prompt}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {item.description_bottom && (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={getHtmlContent(item.description_bottom)}
              />
            )}
          </div>
        ))
      )}
      
      {outro && (
        <div className="prose prose-sm max-w-none mt-8" dangerouslySetInnerHTML={getHtmlContent(outro)} />
      )}
    </div>
  );
};

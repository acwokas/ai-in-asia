import { TopListItem } from "./TopListsEditor";
import type { ImageWithSize } from "./TopListsEditor";
import { convertSimpleMarkdownToHtml } from "@/lib/markdown";
import { ProgressiveImage } from "@/components/ProgressiveImage";
import { getOptimizedThumbnail, generateResponsiveSrcSet } from "@/lib/imageOptimization";

interface TopListsPreviewProps {
  items: TopListItem[];
  intro?: string;
  outro?: string;
}

const getHtmlContent = (content?: string) => {
  if (!content) return undefined;
  
  // Check for markdown syntax (including inside HTML tags)
  const hasMarkdownBullets = /(?:^|>)\s*[-•]\s+/m.test(content);
  const hasMarkdownHeaders = /#+ /.test(content);
  const hasHtmlTags = /<\/?(div|p|span|ul|ol|li|article|section|header|footer|main|aside)[\s>]/i.test(content);
  
  // If content has HTML tags AND markdown syntax, it's mixed - process through markdown
  // If content has markdown syntax without HTML tags, process through markdown
  // Only treat as pure HTML if it has HTML tags but NO markdown syntax
  const isPureHtml = hasHtmlTags && !hasMarkdownBullets && !hasMarkdownHeaders;
  
  if (isPureHtml) {
    return { __html: content };
  }
  
  // For mixed or pure markdown content, process markdown
  const html = convertSimpleMarkdownToHtml(content);
  return { __html: html };
};

export const TopListsPreview = ({ items, intro, outro }: TopListsPreviewProps) => {
  return (
    <div className="space-y-8 p-4">
      {intro && (
        <div className="prose prose-sm max-w-none mb-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:ml-4" dangerouslySetInnerHTML={getHtmlContent(intro)} />
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
                className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:ml-4"
                dangerouslySetInnerHTML={getHtmlContent(item.description_top)}
              />
            )}

            {item.contentBox && (
              <div
                className="prose prose-sm max-w-none my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:ml-4"
                dangerouslySetInnerHTML={getHtmlContent(item.contentBox)}
              />
            )}

            {item.image_urls && item.image_urls.length > 0 && (
              <div className="my-4 space-y-2">
                {item.image_urls.map((imageData, imgIndex) => {
                  const url = typeof imageData === 'string' ? imageData : imageData.url;
                  const size = typeof imageData === 'string' ? 'large' : imageData.size;
                  const sizeClass = size === 'small' ? 'max-w-xs' : size === 'medium' ? 'max-w-md' : 'max-w-full';
                  const widthPx = size === 'small' ? 320 : size === 'medium' ? 512 : 1024;
                  
                  return (
                    <ProgressiveImage
                      key={imgIndex}
                      src={getOptimizedThumbnail(url, widthPx, Math.round(widthPx * 0.75))}
                      srcSet={url.includes('supabase.co/storage') ? generateResponsiveSrcSet(url, [widthPx, widthPx * 1.5, widthPx * 2]) : undefined}
                      sizes={size === 'small' ? '320px' : size === 'medium' ? '512px' : '(max-width: 768px) 100vw, 1024px'}
                      alt={`${item.title} - Image ${imgIndex + 1}`}
                      className={`rounded-lg h-auto ${sizeClass}`}
                      loading="lazy"
                      width={widthPx}
                      height={Math.round(widthPx * 0.75)}
                    />
                  );
                })}
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
                className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:ml-4"
                dangerouslySetInnerHTML={getHtmlContent(item.description_bottom)}
              />
            )}
          </div>
        ))
      )}
      
      {outro && (
        <div className="prose prose-sm max-w-none mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:ml-4" dangerouslySetInnerHTML={getHtmlContent(outro)} />
      )}
    </div>
  );
};

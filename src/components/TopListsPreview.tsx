import { TopListItem } from "./TopListsEditor";
import { convertSimpleMarkdownToHtml } from "@/lib/markdown";

interface TopListsPreviewProps {
  items: TopListItem[];
  intro?: string;
  outro?: string;
}

const getHtmlContent = (content?: string) => {
  if (!content) return undefined;
  const html = convertSimpleMarkdownToHtml(content);
  return { __html: html };
};

export const TopListsPreview = ({ items, intro, outro }: TopListsPreviewProps) => {
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

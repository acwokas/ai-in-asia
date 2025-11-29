import { TopListItem } from "./TopListsEditor";

interface TopListsPreviewProps {
  items: TopListItem[];
}

export const TopListsPreview = ({ items }: TopListsPreviewProps) => {
  return (
    <div className="space-y-8 p-4">
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground">No items to preview</p>
      ) : (
        items.map((item, index) => (
          <div key={item.id} className="space-y-4">
            <h3 className="text-xl font-bold">
              {index + 1}. {item.title || "(No title)"}
            </h3>

            {item.description_top && (
              <div className="prose prose-sm max-w-none">
                <p>{item.description_top}</p>
              </div>
            )}

            {item.image_url && (
              <div className="my-4">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="rounded-lg max-w-full h-auto"
                />
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
              <div className="prose prose-sm max-w-none">
                <p>{item.description_bottom}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

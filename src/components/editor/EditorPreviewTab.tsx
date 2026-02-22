import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { convertMarkdownToHtml } from "@/lib/markdownConversion";
import type { CMSEditorState } from "@/hooks/useCMSEditorState";
import TldrSnapshot from "@/components/TldrSnapshot";

interface EditorPreviewTabProps {
  state: CMSEditorState;
  authorName?: string;
}

const EditorPreviewTab = ({ state, authorName }: EditorPreviewTabProps) => {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  const htmlContent = convertMarkdownToHtml(state.content);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={viewport === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewport("desktop")}
        >
          <Monitor className="h-4 w-4 mr-1" />
          Desktop
        </Button>
        <Button
          variant={viewport === "mobile" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewport("mobile")}
        >
          <Smartphone className="h-4 w-4 mr-1" />
          Mobile
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-background overflow-auto">
        <div
          className={cn(
            "mx-auto p-6 md:p-10 transition-all",
            viewport === "desktop" ? "max-w-[1200px]" : "max-w-[375px]"
          )}
        >
          {/* Status badge */}
          <Badge variant="outline" className="mb-4">
            {state.status === "published" ? "Published" : state.status === "scheduled" ? "Scheduled" : "Draft"}
          </Badge>

          {/* Title */}
          <h1 className="font-[Poppins] font-bold text-3xl md:text-4xl leading-tight mb-4">
            {state.title || "Untitled Article"}
          </h1>

          {/* Author + date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            {authorName && <span className="font-medium">{authorName}</span>}
            {state.publishedAt && (
              <>
                <span>·</span>
                <span>{new Date(state.publishedAt).toLocaleDateString()}</span>
              </>
            )}
          </div>

          {/* Featured image */}
          {state.featuredImage && (
            <img
              src={state.featuredImage}
              alt={state.featuredImageAlt || ""}
              className="w-full rounded-lg mb-6 object-cover max-h-[500px]"
            />
          )}

          {/* TLDR */}
          {(state.tldrSnapshot.some(b => b) || state.whoShouldPayAttention || state.whatChangesNext) && (
            <TldrSnapshot
              bullets={state.tldrSnapshot.filter(b => b)}
              whoShouldPayAttention={state.whoShouldPayAttention}
              whatChangesNext={state.whatChangesNext}
            />
          )}

          {/* Body */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPreviewTab;

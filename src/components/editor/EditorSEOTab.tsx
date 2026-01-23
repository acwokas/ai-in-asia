import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from "lucide-react";

interface EditorSEOTabProps {
  seoTitle: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyphrase: string;
  keyphraseSynonyms: string;
  isGeneratingSEO: boolean;
  canGenerateSEO: boolean;
  onSeoTitleChange: (value: string) => void;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onFocusKeyphraseChange: (value: string) => void;
  onKeyphraseSynonymsChange: (value: string) => void;
  onGenerateSEO: () => void;
}

export const EditorSEOTab = ({
  seoTitle,
  metaTitle,
  metaDescription,
  focusKeyphrase,
  keyphraseSynonyms,
  isGeneratingSEO,
  canGenerateSEO,
  onSeoTitleChange,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onFocusKeyphraseChange,
  onKeyphraseSynonymsChange,
  onGenerateSEO,
}: EditorSEOTabProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>SEO Settings</CardTitle>
            <CardDescription>Optimize for search engines</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerateSEO}
            disabled={isGeneratingSEO || !canGenerateSEO}
            className="bg-[#10b981] hover:bg-[#059669] text-white border-0"
            title={!canGenerateSEO ? "Save article first" : "Generate all SEO fields"}
          >
            {isGeneratingSEO ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Scout Assist: SEO
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="seo-title">SEO Title</Label>
          <Input
            id="seo-title"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder="Title for search engines"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {seoTitle.length}/60 characters
          </p>
        </div>

        <div>
          <Label htmlFor="meta-title">Meta Title</Label>
          <Input
            id="meta-title"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder="Browser tab title"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {metaTitle.length}/60 characters
          </p>
        </div>

        <div>
          <Label htmlFor="meta-description">Meta Description</Label>
          <Textarea
            id="meta-description"
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="SEO description (max 160 characters)"
            maxLength={160}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {metaDescription.length}/160 characters
          </p>
        </div>

        <div>
          <Label htmlFor="focus-keyphrase">Focus Keyphrase</Label>
          <Input
            id="focus-keyphrase"
            value={focusKeyphrase}
            onChange={(e) => onFocusKeyphraseChange(e.target.value)}
            placeholder="Primary keyword for this article"
          />
        </div>

        <div>
          <Label htmlFor="keyphrase-synonyms">Keyphrase Synonyms</Label>
          <Input
            id="keyphrase-synonyms"
            value={keyphraseSynonyms}
            onChange={(e) => onKeyphraseSynonymsChange(e.target.value)}
            placeholder="Comma separated list of synonyms"
          />
          <p className="text-xs text-muted-foreground mt-1">
            e.g., artificial intelligence, machine learning, AI technology
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

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
  // Additional props for previews
  title?: string;
  slug?: string;
  excerpt?: string;
  featuredImage?: string;
  categorySlug?: string;
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
  title = '',
  slug = '',
  excerpt = '',
  featuredImage = '',
  categorySlug = '',
}: EditorSEOTabProps) => {
  const displayTitle = metaTitle || seoTitle || title || 'Article Title';
  const displayDescription = metaDescription || excerpt || 'Add a meta description to control how this appears in search results.';

  return (
    <div className="space-y-6">
      {/* Google SERP Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Google Search Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-[600px] font-sans">
            <div className="text-sm text-green-700 dark:text-green-400 truncate">
              aiinasia.com &rsaquo; {categorySlug || 'news'} &rsaquo; {slug || 'article-slug'}
            </div>
            <div className="text-xl text-blue-600 dark:text-blue-400 hover:underline cursor-pointer leading-tight mt-1 line-clamp-1">
              {displayTitle} | AI in ASIA
            </div>
            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {displayDescription}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Card Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Social Share Preview</CardTitle>
          <CardDescription>How this looks when shared on LinkedIn / X</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-[500px] border border-border rounded-lg overflow-hidden bg-card">
            {featuredImage ? (
              <img
                src={featuredImage}
                alt="OG preview"
                className="w-full h-[200px] object-cover"
              />
            ) : (
              <div className="w-full h-[200px] bg-muted flex items-center justify-center text-muted-foreground text-sm">
                No featured image set
              </div>
            )}
            <div className="p-3 space-y-1">
              <p className="text-xs text-muted-foreground uppercase">aiinasia.com</p>
              <p className="font-semibold text-sm line-clamp-2 text-foreground">
                {displayTitle}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {displayDescription}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Settings Form */}
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
            <p className={`text-xs mt-1 ${seoTitle.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
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
            <p className={`text-xs mt-1 ${metaTitle.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
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
    </div>
  );
};

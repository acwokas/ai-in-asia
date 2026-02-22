import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ExternalLink, Lightbulb, Pencil, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Author {
  id: string;
  name: string;
}

interface EditorSettingsTabProps {
  status: string;
  slug: string;
  scheduledFor: Date | undefined;
  scheduledTime: string;
  publishedAt: Date | undefined;
  publishedTime: string;
  featuredOnHomepage: boolean;
  sticky: boolean;
  isTrending: boolean;
  homepageTrending: boolean;
  authorId: string;
  authors: Author[] | undefined;
  initialData?: any;
  onStatusChange: (value: string) => void;
  onScheduledForChange: (date: Date | undefined) => void;
  onScheduledTimeChange: (time: string) => void;
  onPublishedAtChange: (date: Date | undefined) => void;
  onPublishedTimeChange: (time: string) => void;
  onFeaturedOnHomepageChange: (value: boolean) => void;
  onStickyChange: (value: boolean) => void;
  onIsTrendingChange: (value: boolean) => void;
  onHomepageTrendingChange: (value: boolean) => void;
  onAuthorIdChange: (value: string) => void;
  onOpenAuthorDialog: (author?: any) => void;
}

export const EditorSettingsTab = ({
  status,
  slug,
  scheduledFor,
  scheduledTime,
  publishedAt,
  publishedTime,
  featuredOnHomepage,
  sticky,
  isTrending,
  homepageTrending,
  authorId,
  authors,
  initialData,
  onStatusChange,
  onScheduledForChange,
  onScheduledTimeChange,
  onPublishedAtChange,
  onPublishedTimeChange,
  onFeaturedOnHomepageChange,
  onStickyChange,
  onIsTrendingChange,
  onHomepageTrendingChange,
  onAuthorIdChange,
  onOpenAuthorDialog,
}: EditorSettingsTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Article Settings</CardTitle>
        <CardDescription>Configure article type and visibility</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="status">Status</Label>
            {slug && (
              <div className="flex gap-2">
                {status === 'published' ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/article/${slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      View on site
                    </a>
                  </Button>
                ) : initialData?.preview_code ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/article/${slug}?preview=${initialData.preview_code}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Preview draft
                    </a>
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" disabled title="Save article first to generate preview link">
                    <ExternalLink className="h-3 w-3" />
                    Preview draft
                  </Button>
                )}
              </div>
            )}
          </div>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {status !== 'published' && !initialData?.preview_code && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
              <Lightbulb className="h-3.5 w-3.5 inline text-yellow-500 mr-0.5" /> Save this article first to generate a preview link
            </p>
          )}
          {status !== 'published' && initialData?.preview_code && (
            <p className="text-xs text-muted-foreground mt-2">
              Preview code: {initialData.preview_code}
            </p>
          )}
        </div>

        {/* Scheduled Publishing */}
        {status === 'scheduled' && (
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/50">
            <div>
              <Label>Schedule for Publishing</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Set a date and time to automatically publish this article
              </p>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !scheduledFor && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledFor ? format(scheduledFor, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledFor}
                      onSelect={onScheduledForChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="w-32">
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => onScheduledTimeChange(e.target.value)}
                    disabled={!scheduledFor}
                  />
                </div>
                {scheduledFor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onScheduledForChange(undefined);
                      onScheduledTimeChange("09:00");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feature Toggles */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="featured">Feature on Homepage</Label>
            <p className="text-xs text-muted-foreground">
              Display this article prominently on the homepage
            </p>
          </div>
          <Switch id="featured" checked={featuredOnHomepage} onCheckedChange={onFeaturedOnHomepageChange} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="sticky">Make Sticky</Label>
            <p className="text-xs text-muted-foreground">
              Pin this article in the top 3 positions of homepage featured section
            </p>
          </div>
          <Switch id="sticky" checked={sticky} onCheckedChange={onStickyChange} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="trending">Add to Trending</Label>
            <p className="text-xs text-muted-foreground">
              Show this article in the trending section on its category pages
            </p>
          </div>
          <Switch id="trending" checked={isTrending} onCheckedChange={onIsTrendingChange} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="global-trending">Add to Global Trending</Label>
            <p className="text-xs text-muted-foreground">
              Show this article in the global trending list (top left of homepage)
            </p>
          </div>
          <Switch id="global-trending" checked={homepageTrending} onCheckedChange={onHomepageTrendingChange} />
        </div>

        {/* Custom Published Date */}
        <div className="space-y-4">
          <div>
            <Label>Custom Published Date</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Set a custom past date for when this article was published
            </p>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !publishedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {publishedAt ? format(publishedAt, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={publishedAt}
                    onSelect={onPublishedAtChange}
                    initialFocus
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
              <div className="w-32">
                <Input
                  type="time"
                  value={publishedTime}
                  onChange={(e) => onPublishedTimeChange(e.target.value)}
                  disabled={!publishedAt}
                />
              </div>
              {publishedAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onPublishedAtChange(undefined);
                    onPublishedTimeChange("09:00");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Author Selection */}
        <div>
          <Label htmlFor="author">Author</Label>
          <div className="flex gap-2">
            <Select value={authorId} onValueChange={onAuthorIdChange}>
              <SelectTrigger id="author" className="flex-1">
                <SelectValue placeholder="Select author..." />
              </SelectTrigger>
              <SelectContent>
                {authors?.map((author) => (
                  <SelectItem key={author.id} value={author.id}>
                    {author.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onOpenAuthorDialog()}
              title="Create new author"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {authorId && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const author = authors?.find(a => a.id === authorId);
                  if (author) onOpenAuthorDialog(author);
                }}
                title="Edit selected author"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

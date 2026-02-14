import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { generateSlug } from "@/lib/markdownConversion";

interface ImageData {
  url: string;
  caption: string;
  alt: string;
  description: string;
  size: 'small' | 'medium' | 'large';
  filename: string;
}

interface LinkData {
  url: string;
  text: string;
  openInNewTab: boolean;
}

interface TableData {
  rows: number;
  columns: number;
  hasHeader: boolean;
}

interface PromptData {
  title: string;
  content: string;
}

// Image Dialog
interface ImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageData: ImageData;
  setImageData: (data: ImageData) => void;
  pendingImageFile: File | null;
  onInsert: () => void;
  onImageInputClick: () => void;
  onRemoveImage: () => void;
  isUploading: boolean;
}

export const ImageDialog = ({
  open,
  onOpenChange,
  imageData,
  setImageData,
  pendingImageFile,
  onInsert,
  onImageInputClick,
  onRemoveImage,
  isUploading
}: ImageDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Insert Image</DialogTitle>
        <DialogDescription>Add optional details for your image</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        {imageData.url && (
          <div>
            <img src={imageData.url} alt="Preview" className="w-full max-w-md h-48 object-cover rounded-lg border border-border" />
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={onImageInputClick} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Change Image
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onRemoveImage} className="flex-1">
                Remove Image
              </Button>
            </div>
          </div>
        )}
        {pendingImageFile && (
          <div>
            <Label htmlFor="image-filename">Filename (SEO-friendly)</Label>
            <Input
              id="image-filename"
              placeholder="Enter filename for the image"
              value={imageData.filename}
              onChange={(e) => setImageData({ ...imageData, filename: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Will be saved as: {generateSlug(imageData.filename || 'image')}-[timestamp].jpg
            </p>
          </div>
        )}
        <div>
          <Label htmlFor="image-size">Display Size</Label>
          <Select value={imageData.size} onValueChange={(value: 'small' | 'medium' | 'large') => setImageData({ ...imageData, size: value })}>
            <SelectTrigger id="image-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small (320px)</SelectItem>
              <SelectItem value="medium">Medium (512px)</SelectItem>
              <SelectItem value="large">Large (Full Width)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="image-caption">Caption (optional)</Label>
          <Input
            id="image-caption"
            placeholder="Image caption"
            value={imageData.caption}
            onChange={(e) => setImageData({ ...imageData, caption: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="image-alt">Alt Text</Label>
          <Input
            id="image-alt"
            placeholder="Describe the image"
            value={imageData.alt}
            onChange={(e) => setImageData({ ...imageData, alt: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="image-description">Description (for accessibility)</Label>
          <Textarea
            id="image-description"
            placeholder="Detailed description for screen readers"
            value={imageData.description}
            onChange={(e) => setImageData({ ...imageData, description: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onInsert} disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Insert Image'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Link Dialog
interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkData: LinkData;
  setLinkData: (data: LinkData) => void;
  isEditingLink: boolean;
  onInsert: () => void;
  onRemove: () => void;
}

export const LinkDialog = ({
  open,
  onOpenChange,
  linkData,
  setLinkData,
  isEditingLink,
  onInsert,
  onRemove
}: LinkDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditingLink ? 'Edit Link' : 'Insert Link'}</DialogTitle>
        <DialogDescription>
          {isEditingLink ? 'Update or remove your link' : 'Add a link to your content'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="link-url">URL</Label>
          <div className="flex gap-2">
            <Input
              id="link-url"
              placeholder="https://example.com"
              value={linkData.url}
              onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onInsert();
                }
              }}
              className="flex-1"
            />
            {isEditingLink && linkData.url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive"
                onClick={() => setLinkData({ ...linkData, url: '' })}
                title="Clear URL"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="link-text">Link Text</Label>
          <Input
            id="link-text"
            placeholder="Click here"
            value={linkData.text}
            onChange={(e) => setLinkData({ ...linkData, text: e.target.value })}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="link-newtab"
            checked={linkData.openInNewTab}
            onCheckedChange={(checked) => setLinkData({ ...linkData, openInNewTab: checked as boolean })}
          />
          <Label htmlFor="link-newtab" className="cursor-pointer">Open in new tab</Label>
        </div>
      </div>
      <DialogFooter>
        {isEditingLink && (
          <Button variant="destructive" onClick={onRemove}>Remove Link</Button>
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onInsert}>{isEditingLink ? 'Update Link' : 'Insert Link'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Table Dialog
interface TableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableData: TableData;
  setTableData: (data: TableData) => void;
  onInsert: () => void;
}

export const TableDialog = ({
  open,
  onOpenChange,
  tableData,
  setTableData,
  onInsert
}: TableDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Insert Table</DialogTitle>
        <DialogDescription>Configure your table dimensions</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="table-rows">Number of Rows</Label>
          <Input
            id="table-rows"
            type="number"
            min="1"
            max="20"
            placeholder="3"
            value={tableData.rows}
            onChange={(e) => setTableData({ ...tableData, rows: parseInt(e.target.value) || 3 })}
          />
        </div>
        <div>
          <Label htmlFor="table-columns">Number of Columns</Label>
          <Input
            id="table-columns"
            type="number"
            min="1"
            max="10"
            placeholder="3"
            value={tableData.columns}
            onChange={(e) => setTableData({ ...tableData, columns: parseInt(e.target.value) || 3 })}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="table-header"
            checked={tableData.hasHeader}
            onCheckedChange={(checked) => setTableData({ ...tableData, hasHeader: checked as boolean })}
          />
          <Label htmlFor="table-header" className="cursor-pointer">Include header row</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onInsert}>Insert Table</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// YouTube Dialog
interface YouTubeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  youtubeUrl: string;
  setYoutubeUrl: (url: string) => void;
  onInsert: () => void;
}

export const YouTubeDialog = ({
  open,
  onOpenChange,
  youtubeUrl,
  setYoutubeUrl,
  onInsert
}: YouTubeDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Embed YouTube Video</DialogTitle>
        <DialogDescription>Paste a YouTube video URL to embed it in your article</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="youtube-url">YouTube URL</Label>
          <Input
            id="youtube-url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onInsert();
              }
            }}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onInsert}>Embed Video</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Prompt Dialog
interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptData: PromptData;
  setPromptData: (data: PromptData) => void;
  onInsert: () => void;
}

export const PromptDialog = ({
  open,
  onOpenChange,
  promptData,
  setPromptData,
  onInsert
}: PromptDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Insert Prompt Box</DialogTitle>
        <DialogDescription>Add a copyable AI prompt to your article</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="prompt-title">Prompt Title</Label>
          <Input
            id="prompt-title"
            placeholder="e.g., Writing Assistant"
            value={promptData.title}
            onChange={(e) => setPromptData({ ...promptData, title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="prompt-content">Prompt Content</Label>
          <Textarea
            id="prompt-content"
            placeholder="Enter your prompt text here..."
            value={promptData.content}
            onChange={(e) => setPromptData({ ...promptData, content: e.target.value })}
            rows={5}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onInsert}>Insert Prompt</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Social Embed Dialog
interface SocialEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embedCode: string;
  setEmbedCode: (code: string) => void;
  onInsert: () => void;
}

export const SocialEmbedDialog = ({
  open,
  onOpenChange,
  embedCode,
  setEmbedCode,
  onInsert
}: SocialEmbedDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Embed Social Media</DialogTitle>
        <DialogDescription>
          Paste an embed code or URL from Twitter/X, Instagram, or TikTok
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="social-embed">Embed Code or URL</Label>
          <Textarea
            id="social-embed"
            placeholder="Paste embed code or social media URL..."
            value={embedCode}
            onChange={(e) => setEmbedCode(e.target.value)}
            rows={5}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tip: Copy the embed code from Twitter/X, Instagram, or TikTok share options for best results
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onInsert}>Embed</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

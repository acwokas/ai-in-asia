import { Button } from "@/components/ui/button";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Minus, Image, Type, Table as TableIcon, Video, Sparkles, Share2 } from "lucide-react";

interface EditorToolbarProps {
  onFormat: (format: string) => void;
}

const EditorToolbar = ({ onFormat }: EditorToolbarProps) => {
  return (
    <div className="sticky top-20 z-40 flex items-center gap-1 p-2 border border-input rounded-t-md bg-background flex-wrap shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('bold')}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('italic')}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('h1')}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('h2')}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('h3')}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('paragraph')}
        title="Paragraph"
      >
        <Type className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('list')}
        title="Bulleted List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('quote')}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('link')}
        title="Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('hr')}
        title="Horizontal Line"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('image')}
        title="Insert Image"
      >
        <Image className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('table')}
        title="Insert Table"
      >
        <TableIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('youtube')}
        title="Insert YouTube Video"
      >
        <Video className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('prompt')}
        title="Insert Prompt Box"
        className="text-primary hover:text-primary"
      >
        <Sparkles className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onFormat('social')}
        title="Embed Social Media (Twitter/X, Instagram, TikTok)"
      >
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default EditorToolbar;

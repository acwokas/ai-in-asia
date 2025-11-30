import { ExternalLink, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface PromptQuickActionsProps {
  prompt: string;
  title: string;
}

export const PromptQuickActions = ({ prompt, title }: PromptQuickActionsProps) => {
  const { toast } = useToast();

  const tryInChatGPT = () => {
    const url = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`;
    window.open(url, '_blank');
  };

  const tryInClaude = () => {
    const url = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    window.open(url, '_blank');
  };

  const tryInGemini = () => {
    const url = `https://gemini.google.com/app?q=${encodeURIComponent(prompt)}`;
    window.open(url, '_blank');
  };

  const exportAsText = () => {
    const blob = new Blob([`${title}\n\n${prompt}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded!",
      description: "Prompt saved as text file",
    });
  };

  const shareOnTwitter = () => {
    const text = `Check out this AI prompt: ${title}\n\n${window.location.origin}/prompts`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Share this prompt with others",
    });
  };

  return (
    <div className="flex gap-2">
      {/* Try In... */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Try In...
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Open in AI Tool</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={tryInChatGPT}>
            ChatGPT
          </DropdownMenuItem>
          <DropdownMenuItem onClick={tryInClaude}>
            Claude
          </DropdownMenuItem>
          <DropdownMenuItem onClick={tryInGemini}>
            Gemini
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Export */}
      <Button variant="outline" size="sm" onClick={exportAsText} className="gap-2">
        <Download className="h-4 w-4" />
        Export
      </Button>

      {/* Share */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Share Prompt</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyLink}>
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareOnTwitter}>
            Share on Twitter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareOnLinkedIn}>
            Share on LinkedIn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Card } from "./ui/card";
import { Share2, Download, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareCardGeneratorProps {
  articleTitle: string;
  articleExcerpt: string;
  selectedQuote?: string;
}

const ShareCardGenerator = ({ articleTitle, articleExcerpt, selectedQuote }: ShareCardGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardImage, setCardImage] = useState<string | null>(null);
  const { toast } = useToast();

  const generateCard = async (quote: string) => {
    setIsGenerating(true);
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d')!;

      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add accent line
      ctx.fillStyle = '#0f62fe';
      ctx.fillRect(60, 60, 8, 120);

      // Quote text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      
      const maxWidth = 1000;
      const words = quote.split(' ');
      let line = '';
      let y = 200;
      const lineHeight = 60;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, 100, y);
          line = words[i] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
        
        if (y > 450) break; // Prevent overflow
      }
      ctx.fillText(line, 100, y);

      // Footer
      ctx.fillStyle = '#a0a0a0';
      ctx.font = '24px system-ui';
      ctx.fillText('AI in ASIA', 100, 550);
      ctx.fillText(articleTitle.substring(0, 60) + (articleTitle.length > 60 ? '...' : ''), 100, 580);

      // Convert to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCardImage(url);
        }
        setIsGenerating(false);
      });
    } catch (error) {
      console.error('Error generating card:', error);
      toast({
        title: "Error",
        description: "Failed to generate share card",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!cardImage) return;
    
    const link = document.createElement('a');
    link.download = 'share-card.png';
    link.href = cardImage;
    link.click();
    
    toast({ description: "Card downloaded!" });
  };

  const handleCopyImage = async () => {
    if (!cardImage) return;
    
    try {
      const response = await fetch(cardImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      toast({ description: "Card copied to clipboard!" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy card. Try downloading instead.",
        variant: "destructive",
      });
    }
  };

  const defaultQuote = selectedQuote || articleExcerpt.substring(0, 200);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          title="Generate share card"
          onClick={() => {
            setCardImage(null);
            generateCard(defaultQuote);
          }}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Share Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isGenerating ? (
            <Card className="aspect-[1.9/1] flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin" />
            </Card>
          ) : cardImage ? (
            <>
              <Card className="overflow-hidden">
                <img 
                  src={cardImage} 
                  alt="Share card" 
                  className="w-full"
                />
              </Card>
              
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={handleCopyImage} variant="outline" className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareCardGenerator;

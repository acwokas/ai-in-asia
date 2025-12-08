import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import aiinasiaLogo from "@/assets/aiinasia-logo.png";

interface SeasoningMatrixDownloadProps {
  className?: string;
}

const SeasoningMatrixDownload = ({ className }: SeasoningMatrixDownloadProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const logoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Preload logo
    const img = new Image();
    img.src = aiinasiaLogo;
    img.onload = () => {
      logoRef.current = img;
    };
  }, []);

  const generateMatrix = async () => {
    setIsGenerating(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d')!;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.5, '#16213e');
      gradient.addColorStop(1, '#0f0f23');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header section with logo
      if (logoRef.current) {
        const logoHeight = 60;
        const logoWidth = (logoRef.current.width / logoRef.current.height) * logoHeight;
        ctx.drawImage(logoRef.current, 60, 40, logoWidth, logoHeight);
      }

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.fillText('Seasoning Matrix', 60, 160);

      ctx.fillStyle = '#a0a0a0';
      ctx.font = '24px system-ui';
      ctx.fillText('AI Viral Recipe: Hot Honey Cottage Cheese Bowl', 60, 200);

      // Accent line
      ctx.fillStyle = '#f97316';
      ctx.fillRect(60, 230, 200, 4);

      // Matrix headers
      const startY = 290;
      const colWidth = 260;
      const rowHeight = 100;
      const startX = 60;

      // Column headers
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 22px system-ui';
      const headers = ['Base Spice', 'Heat Level', 'Sweet Element', 'Acid/Tang'];
      headers.forEach((header, i) => {
        ctx.fillText(header, startX + (i * colWidth) + 10, startY);
      });

      // Grid lines
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;

      // Horizontal lines
      for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + 20 + (i * rowHeight));
        ctx.lineTo(startX + (4 * colWidth), startY + 20 + (i * rowHeight));
        ctx.stroke();
      }

      // Vertical lines
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(startX + (i * colWidth), startY + 20);
        ctx.lineTo(startX + (i * colWidth), startY + 20 + (10 * rowHeight));
        ctx.stroke();
      }

      // Example combinations (first 3 rows filled)
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px system-ui';
      
      const examples = [
        ['Smoked Paprika', 'Hot Honey', 'Honey', 'Lemon Zest'],
        ['Cumin', 'Sriracha', 'Maple Syrup', 'Lime Juice'],
        ['Garlic Powder', 'Chilli Flakes', 'Agave', 'Balsamic'],
      ];

      examples.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          ctx.fillText(cell, startX + (colIndex * colWidth) + 15, startY + 60 + (rowIndex * rowHeight));
        });
      });

      // "Your combinations" label
      ctx.fillStyle = '#6b7280';
      ctx.font = 'italic 18px system-ui';
      ctx.fillText('Add your own combinations below...', startX + 15, startY + 60 + (3 * rowHeight));

      // Tips section at bottom
      const tipsY = 1350;
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 24px system-ui';
      ctx.fillText('Pro Tips', 60, tipsY);

      ctx.fillStyle = '#d1d5db';
      ctx.font = '18px system-ui';
      const tips = [
        '• Start with small amounts and adjust to taste',
        '• Balance heat with sweetness for viral appeal',
        '• Fresh herbs can elevate any combination',
        '• Document what works for future reference',
      ];
      tips.forEach((tip, i) => {
        ctx.fillText(tip, 60, tipsY + 35 + (i * 30));
      });

      // Footer
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px system-ui';
      ctx.fillText('Share your creations with #AIinASIA', 60, 1550);
      ctx.fillText('aiinasia.com/guides', 900, 1550);

      // Download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = 'seasoning-matrix-aiinasia.png';
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          
          toast({ description: "Seasoning matrix downloaded!" });
        }
        setIsGenerating(false);
      });
    } catch (error) {
      console.error('Error generating matrix:', error);
      toast({
        title: "Error",
        description: "Failed to generate matrix",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generateMatrix} 
      disabled={isGenerating}
      className={className}
      variant="outline"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Download Seasoning Matrix
    </Button>
  );
};

export default SeasoningMatrixDownload;

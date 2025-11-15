import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Play, Pause, Square, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "./ui/slider";

interface TextToSpeechProps {
  content: string;
  title: string;
}

const TextToSpeech = ({ content, title }: TextToSpeechProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      toast({
        title: "Not Supported",
        description: "Text-to-speech is not supported in your browser",
        variant: "destructive",
      });
    }

    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const extractText = (content: string): string => {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed
          .map((block: any) => {
            if (block.type === 'paragraph' || block.type === 'heading') {
              return block.content;
            }
            if (block.type === 'list' && Array.isArray(block.content)) {
              return block.content.join('. ');
            }
            return '';
          })
          .filter(Boolean)
          .join('. ');
      }
    } catch {
      // If not JSON, treat as plain text and clean HTML
      return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return content;
  };

  const handlePlay = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    const text = extractText(content);
    const fullText = `${title}. ${text}`;
    
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsPlaying(true);
      toast({
        description: "Starting audio playback",
        duration: 2000,
      });
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      toast({
        description: "Finished reading article",
        duration: 2000,
      });
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      toast({
        title: "Playback Error",
        description: "Failed to play audio",
        variant: "destructive",
      });
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleRateChange = (value: number[]) => {
    const newRate = value[0];
    setRate(newRate);
    
    if (isPlaying && utteranceRef.current) {
      // Restart with new rate
      window.speechSynthesis.cancel();
      handlePlay();
    }
  };

  if (!('speechSynthesis' in window)) {
    return null;
  }

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Volume2 className="h-5 w-5 text-primary" />
        <span className="font-semibold">Listen to Article</span>
      </div>
      
      <div className="flex items-center gap-2">
        {!isPlaying && !isPaused ? (
          <Button onClick={handlePlay} size="sm" className="gap-2">
            <Play className="h-4 w-4" />
            Play
          </Button>
        ) : isPlaying ? (
          <Button onClick={handlePause} size="sm" variant="outline" className="gap-2">
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        ) : (
          <Button onClick={handlePlay} size="sm" className="gap-2">
            <Play className="h-4 w-4" />
            Resume
          </Button>
        )}
        
        {(isPlaying || isPaused) && (
          <Button onClick={handleStop} size="sm" variant="outline" className="gap-2">
            <Square className="h-4 w-4" />
            Stop
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Speed</span>
          <span className="font-medium">{rate}x</span>
        </div>
        <Slider
          value={[rate]}
          onValueChange={handleRateChange}
          min={0.5}
          max={2}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5x</span>
          <span>1x</span>
          <span>2x</span>
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech;

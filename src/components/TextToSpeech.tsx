import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Play, Pause, Square } from "lucide-react";

interface TextToSpeechProps {
  content: string;
  title: string;
}

const TextToSpeech = ({ content, title }: TextToSpeechProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const extractText = (content: string): string => {
    try {
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
    utterance.rate = 1;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
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

  if (!('speechSynthesis' in window)) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {!isPlaying ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlay}
          className="h-7 w-7"
          title="Listen to article"
        >
          <Play className="h-3 w-3" />
        </Button>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePause}
            className="h-7 w-7"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            className="h-7 w-7"
            title="Stop"
          >
            <Square className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
};

export default TextToSpeech;

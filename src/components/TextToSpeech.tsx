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
    // Load voices on mount
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        window.speechSynthesis.getVoices();
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
    
    // Get available voices and select a high-quality one
    const voices = window.speechSynthesis.getVoices();
    
    // Prefer Google, Microsoft, or Apple neural voices for better quality
    const preferredVoice = voices.find(voice => 
      (voice.name.includes('Google') || 
       voice.name.includes('Microsoft') || 
       voice.name.includes('Samantha') ||
       voice.name.includes('Alex')) && 
      voice.lang.startsWith('en')
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Optimize speech parameters for more natural sound
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0; // Natural pitch
    utterance.volume = 1.0; // Full volume

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

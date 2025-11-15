import { useState } from "react";
import { Button } from "./ui/button";
import { Play, Pause, Square } from "lucide-react";
import { toast } from "./ui/use-toast";

interface TextToSpeechProps {
  content: string;
  title: string;
}

declare global {
  interface Window {
    puter: {
      ai: {
        txt2speech: (text: string, options?: {
          voice?: string;
          engine?: 'standard' | 'neural' | 'generative';
          language?: string;
        }) => Promise<HTMLAudioElement>;
      };
    };
  }
}

const TextToSpeech = ({ content, title }: TextToSpeechProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

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

  const handlePlay = async () => {
    if (!window.puter) {
      toast({
        title: "Error",
        description: "Text-to-speech service is not available",
        variant: "destructive",
      });
      return;
    }

    if (isPaused && currentAudio) {
      currentAudio.play();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    const text = extractText(content);
    const fullText = `${title}. ${text}`.substring(0, 3000); // Puter has 3000 char limit
    
    try {
      toast({
        title: "Generating audio...",
        description: "Please wait while we prepare the audio",
      });

      const audio = await window.puter.ai.txt2speech(fullText, {
        voice: "Joanna",
        engine: "neural",
        language: "en-US"
      });

      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };

      audio.onpause = () => {
        setIsPlaying(false);
        setIsPaused(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentAudio(null);
      };

      setCurrentAudio(audio);
      audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      toast({
        title: "Error",
        description: "Failed to generate audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePause = () => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentAudio(null);
    }
  };

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

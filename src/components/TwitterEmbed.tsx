import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
      };
    };
  }
}

interface TwitterEmbedProps {
  html: string;
}

// Load Twitter widgets script once globally
let twitterScriptLoaded = false;

const loadTwitterScript = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.twttr) {
      resolve();
      return;
    }

    if (twitterScriptLoaded) {
      // Script is loading, wait for it
      const checkInterval = setInterval(() => {
        if (window.twttr) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    twitterScriptLoaded = true;
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
};

export const TwitterEmbed = ({ html }: TwitterEmbedProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadEmbed = async () => {
      await loadTwitterScript();
      if (containerRef.current && window.twttr) {
        window.twttr.widgets.load(containerRef.current);
      }
    };

    loadEmbed();
  }, [html]);

  return (
    <div 
      ref={containerRef}
      className="my-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// Helper to detect and extract Twitter embeds from HTML content
export const extractTwitterEmbeds = (content: string): { parts: Array<{ type: 'text' | 'twitter'; content: string }> } => {
  const twitterPattern = /<blockquote class="twitter-tweet"[\s\S]*?<\/blockquote>/gi;
  const parts: Array<{ type: 'text' | 'twitter'; content: string }> = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = twitterPattern.exec(content)) !== null) {
    // Add text before the embed
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index).trim();
      if (textPart) {
        parts.push({ type: 'text', content: textPart });
      }
    }
    
    // Add the Twitter embed
    parts.push({ type: 'twitter', content: match[0] });
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last embed
  if (lastIndex < content.length) {
    const textPart = content.slice(lastIndex).trim();
    if (textPart) {
      parts.push({ type: 'text', content: textPart });
    }
  }
  
  // If no embeds found, return the whole content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }
  
  return { parts };
};

// Hook to load Twitter widgets for any twitter-tweet blockquotes in the DOM
export const useTwitterWidgets = (dependencies: any[] = []) => {
  useEffect(() => {
    const loadWidgets = async () => {
      await loadTwitterScript();
      if (window.twttr) {
        window.twttr.widgets.load();
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadWidgets, 100);
    return () => clearTimeout(timer);
  }, dependencies);
};

export default TwitterEmbed;

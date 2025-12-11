import { useEffect } from 'react';

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
      };
    };
    instgrm?: {
      Embeds: {
        process: (element?: HTMLElement) => void;
      };
    };
    TikTok?: {
      Player?: {
        create: () => void;
      };
    };
  }
}

// Track which scripts are loaded/loading
const scriptStatus: Record<string, 'loading' | 'loaded'> = {};

// Generic script loader
const loadScript = (id: string, src: string): Promise<void> => {
  return new Promise((resolve) => {
    if (scriptStatus[id] === 'loaded') {
      resolve();
      return;
    }

    if (scriptStatus[id] === 'loading') {
      // Script is loading, wait for it
      const checkInterval = setInterval(() => {
        if (scriptStatus[id] === 'loaded') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    // Check if script already exists
    if (document.getElementById(id)) {
      scriptStatus[id] = 'loaded';
      resolve();
      return;
    }

    scriptStatus[id] = 'loading';
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      scriptStatus[id] = 'loaded';
      resolve();
    };
    script.onerror = () => {
      scriptStatus[id] = 'loaded'; // Mark as loaded to prevent retries
      resolve();
    };
    document.body.appendChild(script);
  });
};

// Twitter/X
const loadTwitterWidgets = async () => {
  await loadScript('twitter-wjs', 'https://platform.twitter.com/widgets.js');
  if (window.twttr?.widgets) {
    window.twttr.widgets.load();
  }
};

// Instagram
const loadInstagramEmbeds = async () => {
  await loadScript('instagram-embed', 'https://www.instagram.com/embed.js');
  if (window.instgrm?.Embeds) {
    window.instgrm.Embeds.process();
  }
};

// TikTok
const loadTikTokEmbeds = async () => {
  await loadScript('tiktok-embed', 'https://www.tiktok.com/embed.js');
};

// Check content for social embeds
const hasSocialEmbeds = (content: any): { twitter: boolean; instagram: boolean; tiktok: boolean } => {
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content || '');
  return {
    twitter: contentStr.includes('twitter-tweet') || contentStr.includes('twitter.com') || contentStr.includes('x.com/'),
    instagram: contentStr.includes('instagram-media') || contentStr.includes('instagram.com'),
    tiktok: contentStr.includes('tiktok-embed') || contentStr.includes('tiktok.com'),
  };
};

// Hook to load all necessary social embed scripts
export const useSocialEmbeds = (dependencies: any[] = []) => {
  useEffect(() => {
    const loadEmbeds = async () => {
      // Check what embeds are present
      const content = dependencies[0];
      const embeds = hasSocialEmbeds(content);

      // Load scripts for detected embeds
      const promises: Promise<void>[] = [];
      
      if (embeds.twitter) {
        promises.push(loadTwitterWidgets());
      }
      if (embeds.instagram) {
        promises.push(loadInstagramEmbeds());
      }
      if (embeds.tiktok) {
        promises.push(loadTikTokEmbeds());
      }

      await Promise.all(promises);
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadEmbeds, 200);
    return () => clearTimeout(timer);
  }, dependencies);
};

// Re-export useTwitterWidgets for backward compatibility
export const useTwitterWidgets = useSocialEmbeds;

export default useSocialEmbeds;

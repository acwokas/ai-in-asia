import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const SPOTIFY_SHOW_URL = "https://open.spotify.com/embed/show/3aHz4AvuZTHjiKJaZ9FUdW";

const EXPANDED_KEY = "spotify-player-expanded";

export default function SpotifyMiniPlayer() {
  const [expanded, setExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(EXPANDED_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });
  const [embedUrl, setEmbedUrl] = useState(SPOTIFY_SHOW_URL);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(EXPANDED_KEY, String(expanded)); } catch {}
  }, [expanded]);

  useEffect(() => {
    const updateHeight = () => {
      const h = playerRef.current?.offsetHeight ?? 44;
      document.documentElement.style.setProperty("--mini-player-height", `${h}px`);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (playerRef.current) observer.observe(playerRef.current);

    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty("--mini-player-height", "0px");
    };
  }, []);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.episodeUrl) setEmbedUrl(detail.episodeUrl);
      setExpanded(true);
    };
    window.addEventListener("open-spotify-player", handleOpen);
    return () => window.removeEventListener("open-spotify-player", handleOpen);
  }, []);

  return (
    <div ref={playerRef} className="fixed bottom-0 left-0 right-0 z-50">
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
        style={{ background: "hsl(222 47% 11%)", borderTop: "1px solid rgba(95,114,255,0.2)" }}
      >
        <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "hsl(220 10% 85%)" }}>
          <svg className="h-4 w-4 shrink-0" style={{ color: "#1DB954" }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span>3 Before 9 Podcast</span>
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? "160px" : "0px", background: "hsl(222 47% 11%)" }}
      >
        <iframe
          src={`${embedUrl}?utm_source=generator&theme=0`}
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ border: "none", display: "block" }}
          title="3 Before 9 on Spotify"
        />
      </div>
    </div>
  );
}

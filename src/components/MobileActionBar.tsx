import { useState, useEffect } from "react";
import { ArrowLeft, Bookmark, Share2, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import FontSizeControl from "./FontSizeControl";
import { useNavigate } from "react-router-dom";

interface MobileActionBarProps {
  isBookmarked: boolean;
  onBookmark: () => void;
  onShare: () => void;
}

const MobileActionBar = ({ isBookmarked, onBookmark, onShare }: MobileActionBarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden animate-in slide-in-from-bottom duration-200">
      <div className="h-12 bg-background/90 backdrop-blur border-t border-border flex items-center justify-around px-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onBookmark}>
          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onShare}>
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <div className="flex items-center">
          <FontSizeControl />
        </div>
      </div>
    </div>
  );
};

export default MobileActionBar;

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Compass, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { trackEvent } from "./GoogleAnalytics";

const categories = [
  { name: "News", slug: "news" },
  { name: "Business", slug: "business" },
  { name: "Life", slug: "life" },
  { name: "Learn", slug: "learn" },
  { name: "Create", slug: "create" },
  { name: "Voices", slug: "voices" },
];

interface ExploreMoreButtonProps {
  minScrollPercent?: number;
}

const ExploreMoreButton = ({ minScrollPercent = 30 }: ExploreMoreButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (window.scrollY / scrollHeight) * 100;
      
      // Show between 30% and 90% scroll
      setIsVisible(scrollPercent >= minScrollPercent && scrollPercent < 90);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [minScrollPercent]);

  const handleCategoryClick = (categoryName: string, categorySlug: string) => {
    trackEvent("explore_more_click", { category: categoryName, slug: categorySlug });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-[calc(100vw-2rem)]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-lg gap-2 pr-3"
            onClick={() => trackEvent("explore_more_open")}
          >
            <Compass className="h-4 w-4" />
            Explore More
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-background">
          {categories.map((cat) => (
            <DropdownMenuItem key={cat.slug} asChild>
              <Link 
                to={`/category/${cat.slug}`} 
                className="cursor-pointer"
                onClick={() => handleCategoryClick(cat.name, cat.slug)}
              >
                {cat.name}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem asChild>
            <Link 
              to="/guides" 
              className="cursor-pointer"
              onClick={() => handleCategoryClick("Guides", "guides")}
            >
              Guides
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ExploreMoreButton;

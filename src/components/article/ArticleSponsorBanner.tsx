import { useEffect } from "react";
import { trackSponsorClick, trackSponsorImpression } from "@/hooks/useSponsorTracking";

export interface ArticleSponsorData {
  sponsor_name: string;
  sponsor_logo_url: string;
  sponsor_website_url: string;
  sponsor_tagline?: string | null;
}

interface ArticleSponsorBannerProps {
  sponsor: ArticleSponsorData;
  categoryName: string;
}

export const ArticleSponsorBanner = ({ sponsor, categoryName }: ArticleSponsorBannerProps) => {
  useEffect(() => {
    trackSponsorImpression('category_sponsor', sponsor.sponsor_name, { category: categoryName, location: 'article' });
  }, [sponsor.sponsor_name, categoryName]);

  const handleClick = () => {
    trackSponsorClick('category_sponsor', sponsor.sponsor_name, sponsor.sponsor_website_url, { category: categoryName, location: 'article' });
  };

  return (
    <div className="mb-6 pb-4 border-b border-border/40">
      <a
        href={sponsor.sponsor_website_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="flex items-center gap-3 group"
        onClick={handleClick}
      >
        <span className="text-xs text-muted-foreground font-medium">
          In partnership with
        </span>
        <img
          src={sponsor.sponsor_logo_url}
          alt={sponsor.sponsor_name}
          className="h-6 object-contain group-hover:scale-105 transition-transform"
        />
        {sponsor.sponsor_tagline && (
          <span className="text-xs text-muted-foreground italic hidden sm:inline">
            {sponsor.sponsor_tagline}
          </span>
        )}
      </a>
    </div>
  );
};

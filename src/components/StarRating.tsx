import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  userRating?: number;
}

export const StarRating = ({
  rating,
  maxRating = 5,
  size = 16,
  interactive = false,
  onRatingChange,
  userRating,
}: StarRatingProps) => {
  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }).map((_, index) => {
        const isFilled = index < Math.floor(rating);
        const isPartial = index < rating && index >= Math.floor(rating);
        const isUserRated = userRating !== undefined && index < userRating;

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(index)}
            className={cn(
              "relative transition-colors",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default"
            )}
          >
            <Star
              size={size}
              className={cn(
                "transition-all",
                isFilled && "fill-yellow-400 text-yellow-400",
                isPartial && "fill-yellow-400/50 text-yellow-400",
                !isFilled && !isPartial && "text-muted-foreground",
                isUserRated && "fill-primary text-primary"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
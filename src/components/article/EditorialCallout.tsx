import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const EditorialCallout: React.FC = () => {
  const handleDropTake = () => {
    const commentsSection = document.getElementById("comments-section");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = document.title;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col items-center w-full pt-0 pb-2">
        <div className="w-full max-w-[640px]">
          {/* Divider */}
          <div className="flex items-center w-full py-2">
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
            <span className="mx-3 text-xs text-muted-foreground/40">◇</span>
            <div className="flex-1 h-px bg-gradient-to-l from-border to-transparent" />
          </div>

          {/* Your Take CTA */}
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2.5">
              <span className="w-[3px] h-[3px] rounded-full bg-primary flex-shrink-0" />
              YOUR TAKE
            </p>
            <p className="text-[15px] text-muted-foreground mb-4 leading-relaxed">
              We cover the story.{" "}
              <span className="font-semibold text-foreground/80">You tell us what it means on the ground.</span>
            </p>
            <div className="flex gap-2.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleDropTake}
                    className="text-[13px] font-medium bg-primary text-primary-foreground border-none rounded-md px-5 py-2 cursor-pointer transition-all hover:-translate-y-px hover:opacity-90"
                  >
                    Drop your take
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add comment</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleShare}
                    className="text-[13px] font-medium bg-transparent text-muted-foreground border border-border rounded-md px-5 py-2 cursor-pointer transition-colors hover:border-muted-foreground/40"
                  >
                    Share
                  </button>
                </TooltipTrigger>
                <TooltipContent>Share article</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EditorialCallout;

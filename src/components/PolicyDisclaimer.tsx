import { Link } from "react-router-dom";
import { format } from "date-fns";

interface PolicyDisclaimerProps {
  lastEditorialReview?: string | null;
}

const PolicyDisclaimer = ({ lastEditorialReview }: PolicyDisclaimerProps) => {
  const formatReviewDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "MMMM yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-border/50 space-y-6">
      {/* Last Editorial Review */}
      {lastEditorialReview && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Last editorial review:</span>{" "}
          {formatReviewDate(lastEditorialReview)}
        </p>
      )}

      {/* Related Coverage Link */}
      <p className="text-sm text-muted-foreground">
        Related coverage on AIinASIA explores how these policies affect businesses, platforms, and adoption across the region.{" "}
        <Link 
          to="/category/regulation" 
          className="text-primary hover:underline font-medium"
        >
          View AI regulation coverage
        </Link>
      </p>

      {/* Standard Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          This overview is provided for general informational purposes only and does not constitute legal advice. Regulatory frameworks may evolve, and readers should consult official government sources or legal counsel where appropriate.
        </p>
      </div>
    </div>
  );
};

export default PolicyDisclaimer;

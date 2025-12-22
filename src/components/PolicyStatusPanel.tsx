import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Calendar, Users, AlertTriangle } from "lucide-react";

interface PolicyStatusPanelProps {
  policyStatus?: string | null;
  effectiveDate?: string | null;
  appliesTo?: string | null;
  regulatoryImpact?: string | null;
}

const formatPolicyStatus = (status: string | null | undefined): string => {
  if (!status) return "TBC";
  const statusMap: Record<string, string> = {
    draft: "Draft",
    proposed: "Proposed",
    enacted: "Enacted",
    in_force: "In force",
    under_review: "Under review",
  };
  return statusMap[status] || status;
};

const formatAppliesTo = (appliesTo: string | null | undefined): string => {
  if (!appliesTo) return "TBC";
  const appliesToMap: Record<string, string> = {
    commercial_ai: "Commercial AI",
    public_sector_ai: "Public sector AI",
    both: "Both",
  };
  return appliesToMap[appliesTo] || appliesTo;
};

const formatRegulatoryImpact = (impact: string | null | undefined): string => {
  if (!impact) return "TBC";
  return impact.charAt(0).toUpperCase() + impact.slice(1);
};

const getImpactVariant = (impact: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (impact) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "outline";
  }
};

const PolicyStatusPanel = ({
  policyStatus,
  effectiveDate,
  appliesTo,
  regulatoryImpact,
}: PolicyStatusPanelProps) => {
  // Don't render if no data is provided
  if (!policyStatus && !effectiveDate && !appliesTo && !regulatoryImpact) {
    return null;
  }

  return (
    <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Policy Status</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Policy Status */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Policy status
            </p>
            <Badge variant="outline" className="text-sm font-medium">
              {formatPolicyStatus(policyStatus)}
            </Badge>
          </div>

          {/* Effective Date */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Effective date
            </p>
            <p className="text-sm font-medium">{effectiveDate || "TBC"}</p>
          </div>

          {/* Applies To */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Users className="h-3 w-3" />
              Applies to
            </p>
            <p className="text-sm font-medium">{formatAppliesTo(appliesTo)}</p>
          </div>

          {/* Regulatory Impact */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Regulatory impact
            </p>
            <Badge variant={getImpactVariant(regulatoryImpact)} className="text-sm">
              {formatRegulatoryImpact(regulatoryImpact)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicyStatusPanel;

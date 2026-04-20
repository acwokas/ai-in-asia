import { Info, Globe } from "lucide-react";

interface Props {
  variant?: "pending" | "coming-soon";
  message?: string;
}

export const EmptyDataNotice = ({ variant = "pending", message }: Props) => {
  if (variant === "coming-soon") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Globe className="h-4 w-4 shrink-0" />
        <span>{message ?? "Integration coming soon"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      <Info className="h-4 w-4 shrink-0" />
      <span>{message ?? "Custom tracking events will populate within 24-48 hours"}</span>
    </div>
  );
};

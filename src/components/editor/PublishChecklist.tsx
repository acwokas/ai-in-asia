import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ChecklistItem {
  label: string;
  passed: boolean;
  required: boolean;
}

interface PublishChecklistProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyphrase: string;
  featuredImage: string;
  featuredImageAlt: string;
  content: string;
  primaryCategoryId: string;
  authorId: string;
}

const PublishChecklist = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  slug,
  excerpt,
  metaTitle,
  metaDescription,
  focusKeyphrase,
  featuredImage,
  featuredImageAlt,
  content,
  primaryCategoryId,
  authorId,
}: PublishChecklistProps) => {
  const plainContent = content
    .replace(/<[^>]+>/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .trim();
  const wordCount = plainContent.split(/\s+/).filter(w => w.length > 0).length;

  const items: ChecklistItem[] = [
    { label: "Title is not empty", passed: title.trim().length > 0, required: true },
    { label: "Slug is not empty", passed: slug.trim().length > 0, required: true },
    { label: "Excerpt is set", passed: excerpt.trim().length > 0, required: false },
    { label: "Excerpt is under 160 characters", passed: excerpt.length <= 160, required: false },
    { label: "Meta title is set and under 60 chars", passed: metaTitle.trim().length > 0 && metaTitle.length <= 60, required: false },
    { label: "Meta description is set and under 160 chars", passed: metaDescription.trim().length > 0 && metaDescription.length <= 160, required: false },
    { label: "Focus keyphrase is set", passed: focusKeyphrase.trim().length > 0, required: false },
    { label: "Featured image is set", passed: featuredImage.trim().length > 0, required: false },
    { label: "Featured image alt text is set", passed: featuredImageAlt.trim().length > 0, required: false },
    { label: "Content has at least 300 words", passed: wordCount >= 300, required: false },
    { label: "Primary category is selected", passed: primaryCategoryId.trim().length > 0, required: false },
    { label: "Author is selected", passed: authorId.trim().length > 0, required: false },
  ];

  const hasRequiredFailures = items.some(item => item.required && !item.passed);
  const warningCount = items.filter(item => !item.required && !item.passed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publishing Checklist</DialogTitle>
          <DialogDescription>
            Review before publishing your article.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-[400px] overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.passed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : item.required ? (
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
              )}
              <span className={!item.passed && item.required ? 'text-red-500 font-medium' : ''}>
                {item.label}
              </span>
              {item.required && !item.passed && (
                <span className="text-xs text-red-500 ml-auto">Required</span>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go Back
          </Button>
          {hasRequiredFailures ? (
            <Button disabled>
              Fix Required Items
            </Button>
          ) : (
            <Button onClick={onConfirm}>
              {warningCount > 0 ? `Publish Anyway (${warningCount} warnings)` : 'Publish'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PublishChecklist;

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface CommentFormProps {
  authorName: string;
  setAuthorName: (name: string) => void;
  authorEmail: string;
  setAuthorEmail: (email: string) => void;
  content: string;
  setContent: (content: string) => void;
  isNotRobot: boolean;
  setIsNotRobot: (checked: boolean) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  isLoggedIn?: boolean;
  displayName?: string;
}

export const CommentForm = ({
  authorName,
  setAuthorName,
  authorEmail,
  setAuthorEmail,
  content,
  setContent,
  isNotRobot,
  setIsNotRobot,
  submitting,
  onSubmit,
  isLoggedIn = false,
  displayName,
}: CommentFormProps) => {
  return (
    <div className="bg-muted/30 rounded-lg p-6 mt-8">
      <h3 className="font-semibold text-lg mb-4">Leave a Comment</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        {isLoggedIn ? (
          <div className="flex items-center gap-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              Commenting as <span className="font-medium text-foreground">{displayName || authorName}</span>
            </span>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name *
              </label>
              <Input
                id="name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email *
              </label>
              <Input
                id="email"
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your email will not be published
              </p>
            </div>
          </div>
        )}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium mb-2">
            Comment *
          </label>
          <Textarea
            id="comment"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Share your thoughts..."
            className="min-h-[120px]"
          />
        </div>
        {!isLoggedIn && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="robot-check"
              checked={isNotRobot}
              onCheckedChange={(checked) => setIsNotRobot(checked as boolean)}
              required
            />
            <label
              htmlFor="robot-check"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I'm not a robot *
            </label>
          </div>
        )}
        <Button type="submit" disabled={submitting || (!isLoggedIn && !isNotRobot)}>
          {submitting ? "Submitting..." : "Post Comment"}
        </Button>
      </form>
    </div>
  );
};

export default CommentForm;

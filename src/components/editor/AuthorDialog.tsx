import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload } from "lucide-react";

export interface AuthorFormData {
  id: string;
  name: string;
  slug: string;
  job_title: string;
  bio: string;
  email: string;
  avatar_url: string;
  twitter_handle: string;
  linkedin_url: string;
  website_url: string;
}

interface AuthorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  authorForm: AuthorFormData;
  onAuthorFormChange: (form: AuthorFormData) => void;
  avatarPreview: string;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}

export const AuthorDialog = ({
  open,
  onOpenChange,
  isEditing,
  authorForm,
  onAuthorFormChange,
  avatarPreview,
  onAvatarChange,
  onSave,
}: AuthorDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Author' : 'Create New Author'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update author information' : 'Add a new author to the system'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="author-name">Name *</Label>
            <Input
              id="author-name"
              value={authorForm.name}
              onChange={(e) => onAuthorFormChange({ ...authorForm, name: e.target.value })}
              placeholder="Author name"
            />
          </div>
          <div>
            <Label htmlFor="author-slug">Slug</Label>
            <Input
              id="author-slug"
              value={authorForm.slug}
              onChange={(e) => onAuthorFormChange({ ...authorForm, slug: e.target.value })}
              placeholder="author-slug (auto-generated if empty)"
            />
          </div>
          <div>
            <Label htmlFor="author-job-title">Job Title</Label>
            <Input
              id="author-job-title"
              value={authorForm.job_title}
              onChange={(e) => onAuthorFormChange({ ...authorForm, job_title: e.target.value })}
              placeholder="e.g., Senior Editor, AI Correspondent"
            />
          </div>
          <div>
            <Label htmlFor="author-bio">Bio</Label>
            <Textarea
              id="author-bio"
              value={authorForm.bio}
              onChange={(e) => onAuthorFormChange({ ...authorForm, bio: e.target.value })}
              placeholder="Brief author biography"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="author-email">Email</Label>
            <Input
              id="author-email"
              type="email"
              value={authorForm.email}
              onChange={(e) => onAuthorFormChange({ ...authorForm, email: e.target.value })}
              placeholder="author@example.com"
            />
          </div>
          <div>
            <Label>Avatar</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarPreview || authorForm.avatar_url} />
                <AvatarFallback>
                  {authorForm.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={onAvatarChange}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">Or paste URL below</p>
                <Input
                  value={authorForm.avatar_url}
                  onChange={(e) => onAuthorFormChange({ ...authorForm, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="author-twitter">Twitter Handle</Label>
              <Input
                id="author-twitter"
                value={authorForm.twitter_handle}
                onChange={(e) => onAuthorFormChange({ ...authorForm, twitter_handle: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div>
              <Label htmlFor="author-linkedin">LinkedIn URL</Label>
              <Input
                id="author-linkedin"
                value={authorForm.linkedin_url}
                onChange={(e) => onAuthorFormChange({ ...authorForm, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
          <div>
            <Label htmlFor="author-website">Website URL</Label>
            <Input
              id="author-website"
              value={authorForm.website_url}
              onChange={(e) => onAuthorFormChange({ ...authorForm, website_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!authorForm.name}>
            {isEditing ? 'Update Author' : 'Create Author'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

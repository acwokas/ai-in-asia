import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Trash2, X } from "lucide-react";

// Google Ads Dialog
interface GoogleAdsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: { enabled: boolean; client_id: string };
  onSettingsChange: (settings: { enabled: boolean; client_id: string }) => void;
  onSave: () => void;
}

export const GoogleAdsDialog = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onSave,
}: GoogleAdsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Google Ads Configuration</DialogTitle>
        <DialogDescription>
          Configure Google Ads settings for your site
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Google Ads</Label>
            <p className="text-sm text-muted-foreground">
              Show ads across the site
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => 
              onSettingsChange({ ...settings, enabled: checked })
            }
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="client_id">Google Ads Client ID</Label>
          <Input
            id="client_id"
            value={settings.client_id}
            onChange={(e) => 
              onSettingsChange({ ...settings, client_id: e.target.value })
            }
            placeholder="ca-pub-xxxxxxxxxxxxxxxx"
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          Save Settings
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Newsletter Dialog
interface NewsletterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: { enabled: boolean; delay: number; frequency: string };
  onSettingsChange: (settings: { enabled: boolean; delay: number; frequency: string }) => void;
  onSave: () => void;
}

export const NewsletterDialog = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onSave,
}: NewsletterDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Newsletter Popup Configuration</DialogTitle>
        <DialogDescription>
          Configure newsletter popup behavior
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Newsletter Popup</Label>
            <p className="text-sm text-muted-foreground">
              Show newsletter signup popup to visitors
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => 
              onSettingsChange({ ...settings, enabled: checked })
            }
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="delay">Popup Delay (milliseconds)</Label>
          <Input
            id="delay"
            type="number"
            value={settings.delay}
            onChange={(e) => 
              onSettingsChange({ ...settings, delay: parseInt(e.target.value) || 0 })
            }
            placeholder="5000"
          />
          <p className="text-sm text-muted-foreground">
            How long to wait before showing the popup (in milliseconds)
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="frequency">Popup Frequency</Label>
          <select
            id="frequency"
            value={settings.frequency}
            onChange={(e) => 
              onSettingsChange({ ...settings, frequency: e.target.value })
            }
            className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
          >
            <option value="once_per_session">Once per session</option>
            <option value="once_per_day">Once per day</option>
            <option value="always">Every visit</option>
          </select>
          <p className="text-sm text-muted-foreground">
            How often to show the popup to the same visitor
          </p>
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onSave}>
          Save Settings
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Authors Dialog
interface AuthorForm {
  name: string;
  slug: string;
  bio: string;
  email: string;
  job_title: string;
  avatar_url: string;
  twitter_handle: string;
  linkedin_url: string;
  website_url: string;
}

interface Author extends AuthorForm {
  id: string;
}

interface AuthorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authors: Author[] | undefined;
  editingAuthor: Author | null;
  authorForm: AuthorForm;
  onAuthorFormChange: (form: AuthorForm) => void;
  onEditAuthor: (author: Author) => void;
  onSaveAuthor: () => void;
  onDeleteAuthor: (id: string) => void;
  onResetForm: () => void;
  uploadingImage: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
}

export const AuthorsDialog = ({
  open,
  onOpenChange,
  authors,
  editingAuthor,
  authorForm,
  onAuthorFormChange,
  onEditAuthor,
  onSaveAuthor,
  onDeleteAuthor,
  onResetForm,
  uploadingImage,
  onImageUpload,
  onRemoveAvatar,
}: AuthorsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Manage Authors</DialogTitle>
        <DialogDescription>Add, edit, or delete authors</DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Author Form */}
        <div className="border border-border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-lg">
            {editingAuthor ? "Edit Author" : "Add New Author"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={authorForm.name}
                onChange={(e) => onAuthorFormChange({ ...authorForm, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={authorForm.slug}
                onChange={(e) => onAuthorFormChange({ ...authorForm, slug: e.target.value })}
                placeholder="john-doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={authorForm.email}
                onChange={(e) => onAuthorFormChange({ ...authorForm, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={authorForm.job_title}
                onChange={(e) => onAuthorFormChange({ ...authorForm, job_title: e.target.value })}
                placeholder="Senior Writer"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={authorForm.bio}
                onChange={(e) => onAuthorFormChange({ ...authorForm, bio: e.target.value })}
                placeholder="Author biography..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="avatar">Avatar Image</Label>
              {authorForm.avatar_url ? (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img 
                      src={authorForm.avatar_url} 
                      alt="Avatar preview" 
                      className="h-24 w-24 rounded-full object-cover border-2 border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={onRemoveAvatar}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={authorForm.avatar_url}
                    onChange={(e) => onAuthorFormChange({ ...authorForm, avatar_url: e.target.value })}
                    placeholder="Or enter URL directly"
                    className="text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={onImageUpload}
                      disabled={uploadingImage}
                      className="flex-1"
                    />
                    {uploadingImage && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <Input
                    value={authorForm.avatar_url}
                    onChange={(e) => onAuthorFormChange({ ...authorForm, avatar_url: e.target.value })}
                    placeholder="Or enter URL directly"
                    className="text-sm"
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="twitter_handle">Twitter Handle</Label>
              <Input
                id="twitter_handle"
                value={authorForm.twitter_handle}
                onChange={(e) => onAuthorFormChange({ ...authorForm, twitter_handle: e.target.value })}
                placeholder="@johndoe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                value={authorForm.linkedin_url}
                onChange={(e) => onAuthorFormChange({ ...authorForm, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                value={authorForm.website_url}
                onChange={(e) => onAuthorFormChange({ ...authorForm, website_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onSaveAuthor}>
              {editingAuthor ? "Update Author" : "Create Author"}
            </Button>
            {editingAuthor && (
              <Button variant="outline" onClick={onResetForm}>
                Cancel Edit
              </Button>
            )}
          </div>
        </div>
        
        {/* Authors List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Existing Authors</h3>
          <div className="space-y-2">
            {authors?.map((author) => (
              <div key={author.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold">{author.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {author.job_title || "No job title"} • {author.email || "No email"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditAuthor(author)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Author</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this author? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteAuthor(author.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {(!authors || authors.length === 0) && (
              <p className="text-muted-foreground text-center py-4">
                No authors yet. Create your first author above.
              </p>
            )}
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

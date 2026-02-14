import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Sparkles, RefreshCw, Trash2, Edit2, Eye, EyeOff, Loader2, ChevronDown, User, Calendar 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Comment, formatCommentWithEmojis } from "./CommentThread";

interface AICommentControlsProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  aiComments: Comment[];
  generating: boolean;
  onGenerate: () => void;
  onRegenerateAll: () => void;
  onPublishAll: () => void;
  onUnpublishAll: () => void;
  onDeleteAll: () => void;
  onPublishComment: (commentId: string, publish: boolean) => void;
  onEditComment: (comment: Comment) => void;
  onDeleteComment: (commentId: string) => void;
  onUpdateCommentDate?: (commentId: string, newDate: string) => void;
}

export const AICommentControls = ({
  isOpen,
  setIsOpen,
  aiComments,
  generating,
  onGenerate,
  onRegenerateAll,
  onPublishAll,
  onUnpublishAll,
  onDeleteAll,
  onPublishComment,
  onEditComment,
  onDeleteComment,
  onUpdateCommentDate,
}: AICommentControlsProps) => {
  const unpublishedCount = aiComments.filter(c => !c.published).length;
  const publishedCount = aiComments.filter(c => c.published).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-8">
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <CollapsibleTrigger className="flex items-center gap-2 w-full">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">AI Comment Controls</h3>
          <span className="text-sm text-muted-foreground ml-auto mr-2">
            {publishedCount} published / {unpublishedCount} unpublished
          </span>
          <ChevronDown className={`h-5 w-5 text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" onClick={onGenerate} disabled={generating}>
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> Generate Comments</>
              )}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={generating || aiComments.length === 0}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Regenerate All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerate all AI comments?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all existing AI comments for this article and generate new ones.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onRegenerateAll}>Regenerate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="sm" variant="outline" onClick={onPublishAll} disabled={unpublishedCount === 0}>
              <Eye className="h-4 w-4 mr-1" /> Publish All
            </Button>

            <Button size="sm" variant="outline" onClick={onUnpublishAll} disabled={publishedCount === 0}>
              <EyeOff className="h-4 w-4 mr-1" /> Unpublish All
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={aiComments.length === 0}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all AI comments?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all AI-generated comments for this article.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {aiComments.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <h4 className="text-sm font-medium text-muted-foreground">AI Comments ({aiComments.length})</h4>
              {aiComments.map((comment) => (
                <div 
                  key={comment.id} 
                  className={`flex gap-3 p-3 rounded-lg border ${
                    comment.published 
                      ? 'bg-background border-border' 
                      : 'bg-muted/50 border-dashed border-muted-foreground/30'
                  }`}
                >
                  {comment.avatar_url ? (
                    <img 
                      src={comment.avatar_url} 
                      alt={comment.author_name || "User"} 
                      className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-secondary/60 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{comment.author_name}</span>
                      {comment.author_handle && (
                        <span className="text-xs text-muted-foreground">@{comment.author_handle}</span>
                      )}
                      {!comment.published && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Unpublished</span>
                      )}
                      {comment.comment_date && (
                        <span className="text-xs text-muted-foreground">
                          Scheduled: {new Date(comment.comment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatCommentWithEmojis(comment.content) }} />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onPublishComment(comment.id, !comment.published)}
                      title={comment.published ? "Unpublish" : "Publish"}
                    >
                      {comment.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    {onUpdateCommentDate && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Change date">
                            <Calendar className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="end">
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Publish date</label>
                          <Input
                            type="date"
                            defaultValue={comment.comment_date ? new Date(comment.comment_date).toISOString().split('T')[0] : ''}
                            className="w-auto text-sm"
                            onChange={(e) => {
                              if (e.target.value) {
                                onUpdateCommentDate(comment.id, new Date(e.target.value).toISOString());
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onEditComment(comment)}
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this AI-generated comment.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDeleteComment(comment.id)}
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
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default AICommentControls;

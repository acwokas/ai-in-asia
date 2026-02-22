import { Bookmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "./GoogleAnalytics";

interface PromptBookmarkButtonProps {
  promptItemId: string;
  articleId: string;
}

export const PromptBookmarkButton = ({ promptItemId, articleId }: PromptBookmarkButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');

  // Fetch user's collections
  const { data: collections } = useQuery({
    queryKey: ['prompt-collections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('prompt_collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Check if bookmark exists
  const { data: bookmark } = useQuery({
    queryKey: ['prompt-bookmark', user?.id, promptItemId],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('prompt_bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('prompt_item_id', promptItemId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create collection
  const createCollectionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      const { data, error } = await supabase
        .from('prompt_collections')
        .insert({
          user_id: user.id,
          name: newCollectionName,
          description: newCollectionDesc,
        })
        .select()
        .single();
      if (error) throw error;

      // Award points for first collection
      const { data: existingCollections } = await supabase
        .from('prompt_collections')
        .select('id')
        .eq('user_id', user.id);

      if (existingCollections?.length === 1) {
        await supabase.rpc('award_points', {
          _user_id: user.id,
          _points: 10
        });
      }

      return data;
    },
    onSuccess: () => {
      trackEvent("prompt_collection_created", { collection_name: newCollectionName });
      queryClient.invalidateQueries({ queryKey: ['prompt-collections'] });
      setShowNewCollection(false);
      setNewCollectionName('');
      setNewCollectionDesc('');
      toast("Collection created!", {
        description: collections?.length === 0 ? "You earned 10 points for creating your first collection!" : undefined,
      });
    },
  });

  // Add/remove bookmark
  const bookmarkMutation = useMutation({
    mutationFn: async (collectionId?: string) => {
      if (!user) throw new Error("Must be logged in");

      if (bookmark) {
        // Remove bookmark
        trackEvent("prompt_bookmark_removed", { prompt_id: promptItemId });
        const { error } = await supabase
          .from('prompt_bookmarks')
          .delete()
          .eq('id', bookmark.id);
        if (error) throw error;
        return null;
      } else {
        // Add bookmark
        trackEvent("prompt_bookmark_added", { 
          prompt_id: promptItemId, 
          collection_id: collectionId || "none" 
        });
        const { data, error } = await supabase
          .from('prompt_bookmarks')
          .insert({
            user_id: user.id,
            prompt_item_id: promptItemId,
            article_id: articleId,
            collection_id: collectionId,
          })
          .select()
          .single();
        if (error) throw error;

        // Award points
        await supabase.rpc('award_points', {
          _user_id: user.id,
          _points: 3
        });

        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prompt-bookmark', user?.id, promptItemId] });
      queryClient.invalidateQueries({ queryKey: ['user-bookmarks', user?.id] });
      toast(data ? "Saved!" : "Removed", {
        description: data ? "You earned 3 points!" : "Bookmark removed",
      });
    },
    onError: (error: Error) => {
      if (error.message === "Must be logged in") {
        toast("Sign in required", {
          description: "Please sign in to save prompts.",
        });
      }
    },
  });

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/auth')}
      >
        <Bookmark className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
          >
            <Bookmark className={`h-4 w-4 ${bookmark ? 'fill-current' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {bookmark ? 'Remove from...' : 'Save to...'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {bookmark ? (
            <DropdownMenuItem onClick={() => bookmarkMutation.mutate(undefined)}>
              Remove Bookmark
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={() => bookmarkMutation.mutate(undefined)}>
                Quick Save (No Collection)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {collections?.map(collection => (
                <DropdownMenuItem
                  key={collection.id}
                  onClick={() => bookmarkMutation.mutate(collection.id)}
                >
                  {collection.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowNewCollection(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showNewCollection} onOpenChange={setShowNewCollection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Organize your saved prompts into collections
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Collection Name</Label>
              <Input
                id="name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., Marketing Prompts"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newCollectionDesc}
                onChange={(e) => setNewCollectionDesc(e.target.value)}
                placeholder="What kind of prompts will you save here?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCollection(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCollectionMutation.mutate()}
              disabled={!newCollectionName.trim()}
            >
              Create Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
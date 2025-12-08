import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: preferences } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      let { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      // Create default preferences if none exist
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user!.id })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newPrefs;
      }

      return data;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<typeof preferences>) => {
      const { error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
      toast({ description: "Preferences updated" });
    },
  });

  if (!user) return null;

  const isPWASupported = 'serviceWorker' in navigator && 'PushManager' in window;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Notification preferences">
              <Bell className="h-5 w-5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
        </DialogHeader>

        {!isPWASupported && (
          <div className="mb-4 p-3 bg-muted rounded-md text-sm">
            Push notifications are not supported in your browser.
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="breaking-news" className="flex-1">
              <div className="font-medium">Breaking AI News</div>
              <div className="text-sm text-muted-foreground">
                Get notified about major AI developments
              </div>
            </Label>
            <Switch
              id="breaking-news"
              checked={preferences?.breaking_news ?? true}
              onCheckedChange={(checked) =>
                updatePreferences.mutate({ breaking_news: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="followed-authors" className="flex-1">
              <div className="font-medium">Followed Authors</div>
              <div className="text-sm text-muted-foreground">
                New articles from authors you follow
              </div>
            </Label>
            <Switch
              id="followed-authors"
              checked={preferences?.followed_authors ?? true}
              onCheckedChange={(checked) =>
                updatePreferences.mutate({ followed_authors: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="followed-categories" className="flex-1">
              <div className="font-medium">Followed Topics</div>
              <div className="text-sm text-muted-foreground">
                New articles in categories you follow
              </div>
            </Label>
            <Switch
              id="followed-categories"
              checked={preferences?.followed_categories ?? true}
              onCheckedChange={(checked) =>
                updatePreferences.mutate({ followed_categories: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="daily-digest" className="flex-1">
              <div className="font-medium">Daily Digest</div>
              <div className="text-sm text-muted-foreground">
                Daily summary of top AI news (8:00 AM)
              </div>
            </Label>
            <Switch
              id="daily-digest"
              checked={preferences?.daily_digest ?? true}
              onCheckedChange={(checked) =>
                updatePreferences.mutate({ daily_digest: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="weekly-roundup" className="flex-1">
              <div className="font-medium">Weekly Roundup</div>
              <div className="text-sm text-muted-foreground">
                Weekly highlights every Monday
              </div>
            </Label>
            <Switch
              id="weekly-roundup"
              checked={preferences?.weekly_roundup ?? false}
              onCheckedChange={(checked) =>
                updatePreferences.mutate({ weekly_roundup: checked })
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPreferences;

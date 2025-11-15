import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  followType: "author" | "category";
  followId: string;
  followName: string;
}

const FollowButton = ({ followType, followId, followName }: FollowButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ["follow", user?.id, followType, followId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_follows")
        .select("id")
        .eq("user_id", user!.id)
        .eq("follow_type", followType)
        .eq("follow_id", followId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("user_id", user!.id)
          .eq("follow_type", followType)
          .eq("follow_id", followId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_follows")
          .insert({
            user_id: user!.id,
            follow_type: followType,
            follow_id: followId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow", user?.id, followType, followId] });
      toast({
        description: isFollowing 
          ? `Unfollowed ${followName}` 
          : `Following ${followName}! You'll get notified of new posts.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  return (
    <Button
      variant={isFollowing ? "default" : "outline"}
      size="sm"
      onClick={() => toggleFollow.mutate()}
      disabled={isLoading || toggleFollow.isPending}
      className="gap-2"
      title={isFollowing ? `Unfollow ${followName}` : `Follow ${followName}`}
    >
      {isFollowing ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
};

export default FollowButton;

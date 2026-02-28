import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface GuideBookmarkButtonProps {
  guideId: string;
  className?: string;
}

export const GuideBookmarkButton = ({ guideId, className }: GuideBookmarkButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: bookmark } = useQuery({
    queryKey: ["guide-bookmark", guideId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("guide_bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("guide_id", guideId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      if (bookmark) {
        const { error } = await supabase.from("guide_bookmarks").delete().eq("id", bookmark.id);
        if (error) throw error;
        return null;
      } else {
        const { data, error } = await supabase
          .from("guide_bookmarks")
          .insert({ user_id: user.id, guide_id: guideId })
          .select("id")
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["guide-bookmark", guideId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["saved-guides"] });
      toast(data ? "Guide saved!" : "Guide removed from saved");
    },
    onError: () => {
      toast.error("Something went wrong");
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Please sign in to save guides");
      navigate("/auth");
      return;
    }
    mutation.mutate();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={className}
    >
      <Bookmark className={`h-4 w-4 ${bookmark ? "fill-current" : ""}`} />
    </Button>
  );
};

export default GuideBookmarkButton;

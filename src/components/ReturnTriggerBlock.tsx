import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import FollowButton from "@/components/FollowButton";

const ALLOWED_CATEGORIES = ["news", "business", "life"];

interface ReturnTriggerBlockProps {
  categorySlug?: string;
  categoryId?: string;
  categoryName?: string;
  isBookmarked?: boolean;
  onBookmark?: () => void;
}

const ReturnTriggerBlock = ({
  categorySlug,
  categoryId,
  categoryName,
  isBookmarked = false,
  onBookmark,
}: ReturnTriggerBlockProps) => {
  
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // Only show for allowed categories
  if (!categorySlug || !ALLOWED_CATEGORIES.includes(categorySlug.toLowerCase())) {
    return null;
  }

  const handleNotificationRequest = async () => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'denied') {
      toast.error("Notifications blocked", {
        description: "Please enable notifications in your browser settings",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        new Notification('AIinASIA Updates', {
          body: "You'll now receive updates when articles change",
          icon: '/favicon.png',
        });
        toast.success("Notifications enabled", {
          description: "You'll be notified when articles are updated",
        });
      }
    } catch {
      toast.error("Error", {
        description: "Could not request notification permission",
      });
    }
  };

  const showNotificationButton = notificationPermission !== 'unsupported' && notificationPermission !== 'granted';

  return (
    <div className="my-8 p-5 bg-muted/40 border border-border/60 rounded-lg">
      <h3 className="text-base font-semibold text-foreground mb-2">
        This is a developing story
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        We're tracking this across Asia-Pacific and may update with new developments, follow-ups and regional context.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        {onBookmark && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBookmark}
            className="gap-2"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </Button>
        )}
        {showNotificationButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleNotificationRequest}
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            Alert me on updates
          </Button>
        )}
        {categoryId && categoryName && (
          <FollowButton
            followType="category"
            followId={categoryId}
            followName={categoryName}
          />
        )}
      </div>
    </div>
  );
};

export default ReturnTriggerBlock;

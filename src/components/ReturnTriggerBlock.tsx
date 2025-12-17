import { Bookmark, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const ReturnTriggerBlock = () => {
  return null; // Hidden per user request
  
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  const handleBookmarkPrompt = () => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? '⌘+D' : 'Ctrl+D';
    
    toast({
      title: "Add to bookmarks",
      description: `Press ${shortcut} to bookmark this page in your browser`,
    });
  };

  const handleNotificationRequest = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive",
      });
      return;
    }

    if (Notification.permission === 'granted') {
      toast({
        title: "Already enabled",
        description: "You'll be notified when this article is updated",
      });
      return;
    }

    if (Notification.permission === 'denied') {
      toast({
        title: "Notifications blocked",
        description: "Please enable notifications in your browser settings",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // Show a test notification
        new Notification('AIinASIA Updates', {
          body: "You'll now receive updates when articles change",
          icon: '/favicon.png',
        });
        
        toast({
          title: "Notifications enabled",
          description: "You'll be notified when articles are updated",
        });
      } else {
        toast({
          title: "Notifications not enabled",
          description: "You can enable them later in browser settings",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not request notification permission",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="my-8 p-6 bg-muted/50 border border-border rounded-lg">
      <h3 className="text-lg font-semibold text-foreground mb-3">
        This story isn't finished
      </h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        We track how AI, platforms, policy, and adoption evolve across Asia.
        This article may be updated as things change, with follow-ups and regional context.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBookmarkPrompt}
          className="gap-2"
        >
          <Bookmark className="h-4 w-4" />
          Bookmark this page
        </Button>
        {notificationPermission !== 'unsupported' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleNotificationRequest}
            className="gap-2"
          >
            <Bell className={`h-4 w-4 ${notificationPermission === 'granted' ? 'fill-current' : ''}`} />
            {notificationPermission === 'granted' ? 'Notifications on' : 'Alert me on updates'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ReturnTriggerBlock;

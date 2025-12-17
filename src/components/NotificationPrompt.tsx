import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PROMPT_STORAGE_KEY = 'aiinasia_notification_prompt_dismissed';
const PROMPT_DELAY_MS = 3000; // Show after 3 seconds

const NotificationPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // Don't show if already granted or denied
    if (currentPermission !== 'default') {
      return;
    }

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      // Don't show again for 30 days after dismissal
      if (daysSinceDismissed < 30) {
        return;
      }
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        new Notification('AIinASIA', {
          body: "You'll now receive updates when new articles are published",
          icon: '/favicon.png',
        });
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
    setIsVisible(false);
  };

  const handleDeny = () => {
    localStorage.setItem(PROMPT_STORAGE_KEY, new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <Card className="p-4 shadow-lg border-border bg-background">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm">
              Stay updated on AI in Asia
            </h4>
            <p className="text-muted-foreground text-sm mt-1">
              Get notified when we publish new articles and breaking news.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleAllow}>
                Allow
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeny}>
                Not now
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleDeny}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotificationPrompt;

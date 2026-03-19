import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trackEvent } from "./GoogleAnalytics";
import { supabase } from "@/integrations/supabase/client";

const PROMPT_STORAGE_KEY = 'aiinasia_notification_prompt_dismissed';
const PROMPT_DELAY_MS = 3000;
const VAPID_PUBLIC_KEY = 'BD8frhjMCLpofBswS-zbKdQGp6-8PVlVFUZvqr_C3NLHw5WFhk-yk7d2xvCTue2SDDHFd35t8YPQ4Ah7aH95pWY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!('Notification' in window)) return;

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    if (currentPermission !== 'default') return;

    const dismissed = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 30) return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
      trackEvent("notification_prompt_shown");
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    trackEvent("notification_prompt_allow_click");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      trackEvent("notification_permission_result", { result });

      if (result === 'granted') {
        // Subscribe to Web Push
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
          });

          const subJson = subscription.toJSON();
          const endpoint = subJson.endpoint!;
          const p256dh = subJson.keys!.p256dh!;
          const auth = subJson.keys!.auth!;

          // Get current user (may be null for anonymous visitors)
          const { data: { user } } = await supabase.auth.getUser();

          await supabase.from('push_subscriptions').upsert(
            {
              user_id: user?.id ?? null,
              endpoint,
              p256dh,
              auth,
            },
            { onConflict: 'endpoint' }
          );

          new Notification('AIinASIA', {
            body: "You'll now receive updates when new articles are published",
            icon: '/favicon.png',
          });
        } catch (pushError) {
          console.error('Push subscription error:', pushError);
        }
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
    setIsVisible(false);
  };

  const handleDeny = () => {
    trackEvent("notification_prompt_deny_click");
    localStorage.setItem(PROMPT_STORAGE_KEY, new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible || permission !== 'default') return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <Card className="p-4 shadow-lg border-border bg-background">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm">Stay updated on AI in Asia</h4>
            <p className="text-muted-foreground text-sm mt-1">
              Get notified when we publish new articles and breaking news.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleAllow}>Allow</Button>
              <Button size="sm" variant="outline" onClick={handleDeny}>Not now</Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleDeny}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotificationPrompt;

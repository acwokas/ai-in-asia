import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, CheckCircle, Smartphone, Trophy } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { awardPoints } from '@/lib/gamification';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const APP_INSTALL_POINTS = 50;

export const InstallAppButton = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const awardInstallPoints = async () => {
    if (!user) return;
    
    // Check if user already got install points (stored in localStorage to prevent duplicates)
    const alreadyAwarded = localStorage.getItem(`pwa-install-points-${user.id}`);
    if (alreadyAwarded) return;
    
    try {
      await awardPoints(user.id, APP_INSTALL_POINTS, "installing the app");
      
      localStorage.setItem(`pwa-install-points-${user.id}`, 'true');
      
      toast.success(
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span>+{APP_INSTALL_POINTS} Points!</span>
        </div>,
        {
          description: "Thanks for installing the app! You've earned bonus points.",
          duration: 5000,
        }
      );
    } catch (error) {
      console.error('Failed to award install points:', error);
    }
  };

  const showPostInstallMessage = () => {
    const description = isIOS
      ? "Look for 'AIinASIA' on your home screen. If you don't see it, open Safari, tap Share, then 'Add to Home Screen'."
      : isAndroid
      ? "Find 'AIinASIA' on your home screen or in your app drawer. Long-press the icon to add it to your home screen if needed."
      : "Find 'AIinASIA' in your apps. You can pin it to your taskbar or start menu for quick access.";

    toast(
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <span>App Installed!</span>
      </div>,
      {
        description: (
          <div className="flex items-start gap-2 mt-2">
            <Smartphone className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span>{description}</span>
          </div>
        ),
        duration: 10000,
      }
    );
  };

  useEffect(() => {
    // Increment visit count on mount
    const visitKey = 'aiinasia_visit_count';
    const currentVisits = parseInt(localStorage.getItem(visitKey) || '0', 10);
    localStorage.setItem(visitKey, String(currentVisits + 1));

    // Check if already dismissed this session
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      
      // Only show after second visit
      const visits = parseInt(localStorage.getItem(visitKey) || '0', 10);
      const permanentlyDismissed = localStorage.getItem('aiinasia_install_dismissed') === 'true';
      
      if (visits < 2 || permanentlyDismissed) {
        return;
      }
      
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      showPostInstallMessage();
      awardInstallPoints();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install prompt error:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('aiinasia_install_dismissed', 'true');
  };

  if (!isInstallable || isDismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-4 sm:right-auto sm:w-auto sm:max-w-[320px] z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Install AIinASIA</p>
          <p className="text-xs text-muted-foreground">Get quick access from your home screen</p>
        </div>
        <Button
          onClick={handleInstallClick}
          size="sm"
          className="shrink-0"
        >
          <Download className="h-4 w-4 mr-1" />
          Install
        </Button>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

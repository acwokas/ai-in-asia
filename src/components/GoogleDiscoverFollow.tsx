import { Card } from "@/components/ui/card";
import { Bell, Chrome } from "lucide-react";

export const GoogleDiscoverFollow = () => {
  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
      <div className="flex items-start gap-4">
        <div className="flex gap-2">
          <Chrome className="h-8 w-8 text-primary flex-shrink-0" />
          <Bell className="h-8 w-8 text-accent flex-shrink-0" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Follow AI in ASIA on Google Discover</h3>
          <p className="text-sm text-muted-foreground">
            Get our latest AI news and insights delivered directly to your Google Discover feed or Chrome New Tab page.
          </p>
          <div className="space-y-2 text-sm">
            <p className="font-medium">How to follow:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open the <strong>Google app</strong> or <strong>Chrome browser</strong> on your mobile device</li>
              <li>Search for "AI in ASIA" or visit <span className="text-primary font-medium">aiinasia.com</span></li>
              <li>When you see our content in Discover, tap the <strong>Follow</strong> button next to our logo</li>
              <li>You'll now see our latest articles prioritized in your personalized feed</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            You can also subscribe via our <a href="/rss" className="text-primary hover:underline">RSS feed</a> to stay updated across any RSS reader.
          </p>
        </div>
      </div>
    </Card>
  );
};

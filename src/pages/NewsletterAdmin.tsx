import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Users, BarChart3 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load tab content components
const NewsletterComposeTab = lazy(() => import("@/components/newsletter-admin/ComposeTab"));
const NewsletterSubscribersTab = lazy(() => import("@/components/newsletter-admin/SubscribersTab"));
const NewsletterAnalyticsTab = lazy(() => import("@/components/newsletter-admin/AnalyticsTab"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export default function NewsletterAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "compose";

  const handleTabChange = (value: string) => {
    setSearchParams(value === "compose" ? {} : { tab: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <p className="text-muted-foreground text-sm">Compose, manage subscribers, and track performance.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="compose" className="gap-2">
            <Mail className="h-4 w-4" />
            Compose & Manage
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-2">
            <Users className="h-4 w-4" />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <Suspense fallback={<TabFallback />}>
            <NewsletterComposeTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="subscribers">
          <Suspense fallback={<TabFallback />}>
            <NewsletterSubscribersTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics">
          <Suspense fallback={<TabFallback />}>
            <NewsletterAnalyticsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

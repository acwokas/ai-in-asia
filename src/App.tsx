// Performance pass completed: 2026-02-21 - lazy loading, code splitting, image optimization, font loading, animation cleanup

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from "@/lib/queryPersister";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";

// External redirect helper for 301-style redirects in SPA
const ExternalRedirect = ({ url }: { url: string }) => {
  useEffect(() => { window.location.replace(url); }, [url]);
  return null;
};

// Eager load critical components
import GoogleAnalytics from "./components/GoogleAnalytics";
import { useEngagementLoop } from "./hooks/useEngagementLoop";
import { useTrendingAutoRefresh } from "./hooks/useTrendingAutoRefresh";

import { DatabaseErrorBoundary } from "./components/DatabaseErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { Skeleton } from "./components/ui/skeleton";
import AnalyticsProvider from "./components/AnalyticsProvider";

// Safe reload guard to prevent infinite loops on stale chunks
const safeReloadOnce = () => {
  const key = 'chunk_reload_attempted';
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1');
    window.location.reload();
  }
};

// Lazy load Index page to reduce initial bundle
const Index = lazy(() => import("./pages/Index").catch(() => { safeReloadOnce(); return import("./pages/Index"); }));

// Lazy load non-critical components
const ConsentBanner = lazy(() => import("./components/ConsentBanner").catch(() => { safeReloadOnce(); return import("./components/ConsentBanner"); }));
const InstallAppButton = lazy(() => import("./components/InstallAppButton").then(m => ({ default: m.InstallAppButton })));
const ScoutChatbot = lazy(() => import("./components/ScoutChatbot").catch(() => { safeReloadOnce(); return import("./components/ScoutChatbot"); }));

// Lazy load all other pages for better performance
const Article = lazy(() => import("./pages/Article"));
const Category = lazy(() => import("./pages/Category"));
const LearningPathDetail = lazy(() => import("./pages/LearningPathDetail"));
const CategoryAll = lazy(() => import("./pages/CategoryAll"));
const Tag = lazy(() => import("./pages/Tag"));
const AuthorProfile = lazy(() => import("./pages/AuthorProfile"));
const SitemapRedirect = lazy(() => import("./pages/SitemapRedirect"));
const RssRedirect = lazy(() => import("./pages/RssRedirect"));
const FeedRedirect = lazy(() => import("./pages/RssRedirect")); // Same as RSS
const Search = lazy(() => import("./pages/Search"));

const Auth = lazy(() => import("./pages/Auth"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const Admin = lazy(() => import("./pages/Admin"));

const Articles = lazy(() => import("./pages/Articles"));
const ArticlesFeed = lazy(() => import("./pages/ArticlesFeed"));
const Editor = lazy(() => import("./pages/Editor"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PolicyAtlas = lazy(() => import("./pages/PolicyAtlas"));
const PolicyRegion = lazy(() => import("./pages/PolicyRegion"));
const PolicyComparison = lazy(() => import("./pages/PolicyComparison"));
const PolicyUpdates = lazy(() => import("./pages/PolicyUpdates"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Redirects = lazy(() => import("./pages/Redirects"));
const AIComments = lazy(() => import("./pages/AIComments"));
const CommentModeration = lazy(() => import("./pages/CommentModeration"));
const BulkOperations = lazy(() => import("./pages/BulkOperations"));
const ContentAnalytics = lazy(() => import("./pages/ContentAnalytics"));
const SEOTools = lazy(() => import("./pages/SEOTools"));
const SEODashboard = lazy(() => import("./pages/SEODashboard"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AuthorManagement = lazy(() => import("./pages/AuthorManagement"));
const EditorsPickManager = lazy(() => import("./pages/EditorsPickManager"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Events = lazy(() => import("./pages/Events"));
const SubmitEvent = lazy(() => import("./pages/SubmitEvent"));

const AskScout = lazy(() => import("./pages/AskScout"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const NewsletterManager = lazy(() => import("./pages/NewsletterManager"));
const NewsletterAdmin = lazy(() => import("./pages/NewsletterAdmin"));
const NewsletterArchive = lazy(() => import("./pages/NewsletterArchive"));
 const NewsletterView = lazy(() => import("./pages/NewsletterView"));
 const NewsletterEmailPreview = lazy(() => import("./pages/NewsletterEmailPreview"));

const ProcessPendingComments = lazy(() => import("./pages/ProcessPendingComments"));
const BulkSEOGeneration = lazy(() => import("./pages/BulkSEOGeneration"));
const CategorySponsorsManager = lazy(() => import("./pages/CategorySponsorsManager"));
const InternalLinksManager = lazy(() => import("./pages/InternalLinksManager"));
const LinkHealthMonitor = lazy(() => import("./pages/LinkHealthMonitor"));
const BulkLinksUndo = lazy(() => import("./pages/BulkLinksUndo"));
const ContentFreshness = lazy(() => import("./pages/ContentFreshness"));
const FixBrokenLinks = lazy(() => import("./pages/FixBrokenLinks"));
const KnowledgeEngine = lazy(() => import("./pages/KnowledgeEngine"));
const NotFoundAnalytics = lazy(() => import("./pages/NotFoundAnalytics"));
const LegacyArticleRedirect = lazy(() => import("./pages/LegacyArticleRedirect"));
const MyPrompts = lazy(() => import("./pages/MyPrompts"));
const AllPrompts = lazy(() => import("./pages/AllPrompts"));

const ContentCalendar = lazy(() => import("./pages/ContentCalendar"));
const Guides = lazy(() => import("./pages/Guides"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));

const GuideEditor = lazy(() => import("./pages/GuideEditor"));
const GuideCategoryIndex = lazy(() => import("./pages/GuideCategoryIndex"));
const AdminGuides = lazy(() => import("./pages/AdminGuides"));
const NewsletterAnalytics = lazy(() => import("./pages/NewsletterAnalytics"));
const NewsletterPerformance = lazy(() => import("./pages/NewsletterPerformance"));
const SiteAnalytics = lazy(() => import("./pages/SiteAnalytics"));
const ContentInsights = lazy(() => import("./pages/ContentInsights"));
const SavedArticles = lazy(() => import("./pages/SavedArticles"));
const EditorialStandards = lazy(() => import("./pages/EditorialStandards"));
const Contribute = lazy(() => import("./pages/Contribute"));
const MediaAndPartners = lazy(() => import("./pages/MediaAndPartners"));

const ThreeBeforeNineLatest = lazy(() => import("./pages/ThreeBeforeNineLatest"));
const NewsletterWeeklyLatest = lazy(() => import("./pages/NewsletterWeeklyLatest"));
const NewsletterForward = lazy(() => import("./pages/NewsletterForward"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const AdminUnsubscribes = lazy(() => import("./pages/AdminUnsubscribes"));
const AdminEventSubmissionsPage = lazy(() => import("./components/admin/AdminEventSubmissions"));

// Lightweight skeleton loader for instant display — matches homepage hero layout
const HomepageSkeleton = () => (
  <div className="min-h-screen flex flex-col">
    {/* Header bar */}
    <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="hidden md:flex items-center gap-6">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
    </div>
    {/* Ticker bar */}
    <div className="border-b border-border/30">
      <div className="container mx-auto px-4 py-2">
        <Skeleton className="h-4 w-full max-w-[600px]" />
      </div>
    </div>
    {/* Hero: 8-col lead + 4-col secondary grid */}
    <div className="container mx-auto px-4 pt-3 pb-3">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Primary hero story */}
        <div className="lg:col-span-8">
          <div className="relative h-[400px] md:h-[480px] rounded-lg overflow-hidden">
            <Skeleton className="absolute inset-0" />
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 md:h-10 w-full max-w-[500px]" />
              <Skeleton className="h-8 md:h-10 w-3/4 max-w-[380px]" />
              <Skeleton className="h-4 w-full max-w-[450px] hidden md:block" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>
        {/* Secondary story cards (2×2) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3 lg:h-[480px]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg overflow-hidden border border-border/50 flex flex-col" style={{ borderTop: '3px solid hsl(var(--muted))' }}>
              <Skeleton className="w-full h-[150px]" />
              <div className="p-2.5 flex flex-col flex-1 space-y-1.5">
                <Skeleton className="h-2.5 w-14 rounded-sm" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <Skeleton className="h-2.5 w-12" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// AdSense script is loaded once via loadGoogleAdsScript() in main.tsx
// (with duplicate-injection guard). Removed redundant unguarded loader that was here.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      gcTime: 24 * 60 * 60 * 1000, // Keep data in cache for 24 hours
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: false, // Don't refetch on reconnect
    },
  },
});

const persister = createIDBPersister();

const EngagementWrapper = () => {
  useEngagementLoop();
  useTrendingAutoRefresh();
  return null;
};

const RootLayout = () => (
  <>
    <a href="#main-content" className="skip-to-content">Skip to main content</a>
    <AnalyticsProvider>
      <ScrollToTop />
      <GoogleAnalytics />
      <EngagementWrapper />
      <Suspense fallback={null}>
        <ConsentBanner />
      </Suspense>
      <Suspense fallback={null}>
        <InstallAppButton />
      </Suspense>
      <Suspense fallback={null}>
        <ScoutChatbot />
      </Suspense>
      <Suspense fallback={<HomepageSkeleton />}>
        <Outlet />
      </Suspense>
    </AnalyticsProvider>
  </>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Index /> },
      { path: "/:category/:slug", element: <Article /> },
      { path: "/category/:slug/all", element: <CategoryAll /> },
      { path: "/category/:slug/learn/:pathSlug", element: <LearningPathDetail /> },
      { path: "/category/regulation", element: <Navigate to="/category/policy" replace /> },
      { path: "/category/:slug", element: <Category /> },
      { path: "/tag/:slug", element: <Tag /> },
      { path: "/author/:slug", element: <AuthorProfile /> },
      { path: "/sitemap.xml", element: <SitemapRedirect /> },
      { path: "/rss.xml", element: <RssRedirect /> },
      { path: "/rss", element: <RssRedirect /> },
      { path: "/feed", element: <FeedRedirect /> },
      { path: "/search", element: <Search /> },
      { path: "/auth", element: <Auth /> },
      { path: "/editor", element: <Editor /> },
      { path: "/editor/:id", element: <Editor /> },
      { path: "/profile", element: <Profile /> },
      { path: "/about", element: <About /> },
      { path: "/contact", element: <Contact /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/terms", element: <Terms /> },
      { path: "/cookie-policy", element: <CookiePolicy /> },
      { path: "/events", element: <Events /> },
      { path: "/events/submit", element: <SubmitEvent /> },
      { path: "/tools", element: <ExternalRedirect url="https://adrianwatkins.com/tools" /> },
      { path: "/ask-scout", element: <AskScout /> },
      { path: "/newsletter", element: <Newsletter /> },
      { path: "/newsletter/archive", element: <NewsletterArchive /> },
      { path: "/newsletter/weekly/latest", element: <NewsletterWeeklyLatest /> },
      { path: "/newsletter/forward/:id", element: <NewsletterForward /> },
      { path: "/newsletter/:id/email-preview", element: <NewsletterEmailPreview /> },
      { path: "/newsletter/:id", element: <NewsletterView /> },
      { path: "/articles", element: <ArticlesFeed /> },
      { path: "/saved", element: <SavedArticles /> },
      { path: "/editorial-standards", element: <EditorialStandards /> },
      { path: "/contribute", element: <Contribute /> },
      { path: "/media-and-partners", element: <MediaAndPartners /> },
      { path: "/prompts", element: <AllPrompts /> },
      { path: "/prompts/:category", element: <AllPrompts /> },
      { path: "/my-prompts", element: <MyPrompts /> },
      { path: "/ai-policy-atlas", element: <PolicyAtlas /> },
      { path: "/ai-policy-atlas/compare", element: <PolicyComparison /> },
      { path: "/ai-policy-atlas/updates", element: <PolicyUpdates /> },
      { path: "/ai-policy-atlas/:category/:slug", element: <Article /> },
      { path: "/ai-policy-atlas/:region", element: <PolicyRegion /> },
      { path: "/unsubscribe", element: <Unsubscribe /> },
      { path: "/redirects", element: <Redirects /> },
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <Admin /> },
          { path: "dashboard", element: <Admin /> },
          { path: "articles", element: <Articles /> },
          { path: "calendar", element: <ContentCalendar /> },
          { path: "internal-links", element: <InternalLinksManager /> },
          { path: "link-health", element: <LinkHealthMonitor /> },
          { path: "bulk-links-undo", element: <BulkLinksUndo /> },
          { path: "fix-broken-links", element: <FixBrokenLinks /> },
          { path: "content-freshness", element: <ContentFreshness /> },
          { path: "ai-comments", element: <AIComments /> },
          { path: "comments", element: <CommentModeration /> },
          { path: "knowledge-engine", element: <KnowledgeEngine /> },
          { path: "bulk-operations", element: <BulkOperations /> },
          { path: "analytics", element: <ContentAnalytics /> },
          { path: "seo", element: <SEODashboard /> },
          { path: "seo-tools", element: <Navigate to="/admin/seo" replace /> },
          { path: "bulk-seo", element: <Navigate to="/admin/seo?tab=bulk" replace /> },
          { path: "author-management", element: <AuthorManagement /> },
          { path: "editors-picks", element: <EditorsPickManager /> },
          { path: "process-comments", element: <ProcessPendingComments /> },
          { path: "category-sponsors", element: <CategorySponsorsManager /> },
          { path: "404-analytics", element: <NotFoundAnalytics /> },
          { path: "guides", element: <AdminGuides /> },
          { path: "newsletter", element: <NewsletterAdmin /> },
          { path: "newsletter-analytics", element: <Navigate to="/admin/newsletter?tab=subscribers" replace /> },
          { path: "newsletter-performance", element: <Navigate to="/admin/newsletter?tab=analytics" replace /> },
          { path: "newsletter-manager", element: <Navigate to="/admin/newsletter" replace /> },
          { path: "unsubscribes", element: <Navigate to="/admin/newsletter?tab=subscribers" replace /> },
          { path: "site-analytics", element: <SiteAnalytics /> },
          { path: "content-insights", element: <ContentInsights /> },
          { path: "guide-editor", element: <GuideEditor /> },
          { path: "guide-editor/:id", element: <GuideEditor /> },
          { path: "event-submissions", element: <AdminEventSubmissionsPage /> },
          { path: "settings", element: <AdminSettings /> },
        ],
      },
      { path: "/news/3-before-9", element: <ThreeBeforeNineLatest /> },
      { path: "/3-before-9", element: <ThreeBeforeNineLatest /> },
      { path: "/guides", element: <Guides /> },
      { path: "/guides/:category/:slug", element: <GuideDetail /> },
      { path: "/guides/:categorySlug", element: <GuideCategoryIndex /> },
      { path: "/guides/:slug", element: <GuideDetail /> },
      { path: "/:slug", element: <LegacyArticleRedirect /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
  >
    <AuthProvider>
      <TooltipProvider>
        <DatabaseErrorBoundary>
          <Sonner />
          <RouterProvider router={router} />
        </DatabaseErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;

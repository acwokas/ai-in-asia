// Performance pass completed: 2026-02-21 - lazy loading, code splitting, image optimization, font loading, animation cleanup

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from "@/lib/queryPersister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

import { DatabaseErrorBoundary } from "./components/DatabaseErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { Skeleton } from "./components/ui/skeleton";
import AnalyticsProvider from "./components/AnalyticsProvider";

// Lazy load Index page to reduce initial bundle
const Index = lazy(() => import("./pages/Index"));

// Lazy load non-critical components
const ConsentBanner = lazy(() => import("./components/ConsentBanner"));
const InstallAppButton = lazy(() => import("./components/InstallAppButton").then(m => ({ default: m.InstallAppButton })));

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

// Lightweight skeleton loader for instant display
const HomepageSkeleton = () => (
  <div className="min-h-screen flex flex-col">
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <Skeleton className="h-12 w-48" />
      </div>
    </div>
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <Skeleton className="h-6 w-24 mb-6" />
          <Skeleton className="aspect-video rounded-lg mb-4" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="aspect-[16/9] rounded-lg mb-4" />
          ))}
        </div>
        <div className="lg:col-span-6">
          <Skeleton className="h-[600px] rounded-lg" />
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-6 w-32 mb-6" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg mb-4" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Defer Google Ads script loading until after initial render
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4181437297386228";
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, 2000);
}

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

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
  >
    <AuthProvider>
      <TooltipProvider>
        <DatabaseErrorBoundary>
          
          <Sonner />
          <BrowserRouter>
            <AnalyticsProvider>
            <ScrollToTop />
            <GoogleAnalytics />
            <Suspense fallback={null}>
              <ConsentBanner />
            </Suspense>
            <Suspense fallback={null}>
              <InstallAppButton />
            </Suspense>
            <Suspense fallback={<HomepageSkeleton />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/:category/:slug" element={<Article />} />
              <Route path="/category/:slug/all" element={<CategoryAll />} />
              <Route path="/category/:slug/learn/:pathSlug" element={<LearningPathDetail />} />
              <Route path="/category/:slug" element={<Category />} />
              <Route path="/tag/:slug" element={<Tag />} />
              <Route path="/author/:slug" element={<AuthorProfile />} />
              <Route path="/sitemap.xml" element={<SitemapRedirect />} />
              <Route path="/rss.xml" element={<RssRedirect />} />
              <Route path="/rss" element={<RssRedirect />} />
              <Route path="/feed" element={<FeedRedirect />} />
              <Route path="/search" element={<Search />} />
              
              <Route path="/auth" element={<Auth />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/editor/:id" element={<Editor />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/submit" element={<SubmitEvent />} />
              <Route path="/tools" element={<ExternalRedirect url="https://adrianwatkins.com/tools" />} />
              <Route path="/ask-scout" element={<AskScout />} />
              <Route path="/newsletter" element={<Newsletter />} />
              <Route path="/newsletter/archive" element={<NewsletterArchive />} />
              <Route path="/newsletter/weekly/latest" element={<NewsletterWeeklyLatest />} />
              <Route path="/newsletter/forward/:id" element={<NewsletterForward />} />
              <Route path="/newsletter/:id/email-preview" element={<NewsletterEmailPreview />} />
              <Route path="/newsletter/:id" element={<NewsletterView />} />
              <Route path="/saved" element={<SavedArticles />} />
              <Route path="/editorial-standards" element={<EditorialStandards />} />
              <Route path="/contribute" element={<Contribute />} />
              <Route path="/media-and-partners" element={<MediaAndPartners />} />
              <Route path="/prompts" element={<AllPrompts />} />
              <Route path="/my-prompts" element={<MyPrompts />} />
              <Route path="/ai-policy-atlas" element={<PolicyAtlas />} />
              <Route path="/ai-policy-atlas/compare" element={<PolicyComparison />} />
              <Route path="/ai-policy-atlas/updates" element={<PolicyUpdates />} />
              <Route path="/ai-policy-atlas/:category/:slug" element={<Article />} />
              <Route path="/ai-policy-atlas/:region" element={<PolicyRegion />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/redirects" element={<Redirects />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Admin />} />
                <Route path="dashboard" element={<Admin />} />
                <Route path="articles" element={<Articles />} />
                <Route path="calendar" element={<ContentCalendar />} />
                <Route path="internal-links" element={<InternalLinksManager />} />
                <Route path="link-health" element={<LinkHealthMonitor />} />
                <Route path="bulk-links-undo" element={<BulkLinksUndo />} />
                <Route path="fix-broken-links" element={<FixBrokenLinks />} />
                <Route path="content-freshness" element={<ContentFreshness />} />
                <Route path="ai-comments" element={<AIComments />} />
                <Route path="comments" element={<CommentModeration />} />
                <Route path="knowledge-engine" element={<KnowledgeEngine />} />
                <Route path="bulk-operations" element={<BulkOperations />} />
                <Route path="analytics" element={<ContentAnalytics />} />
                <Route path="seo" element={<SEODashboard />} />
                <Route path="seo-tools" element={<Navigate to="/admin/seo" replace />} />
                <Route path="bulk-seo" element={<Navigate to="/admin/seo?tab=bulk" replace />} />
                <Route path="author-management" element={<AuthorManagement />} />
                <Route path="editors-picks" element={<EditorsPickManager />} />
                <Route path="process-comments" element={<ProcessPendingComments />} />
                <Route path="category-sponsors" element={<CategorySponsorsManager />} />
                <Route path="404-analytics" element={<NotFoundAnalytics />} />
                <Route path="guides" element={<AdminGuides />} />
                <Route path="newsletter" element={<NewsletterAdmin />} />
                <Route path="newsletter-analytics" element={<Navigate to="/admin/newsletter?tab=subscribers" replace />} />
                <Route path="newsletter-performance" element={<Navigate to="/admin/newsletter?tab=analytics" replace />} />
                <Route path="newsletter-manager" element={<Navigate to="/admin/newsletter" replace />} />
                <Route path="unsubscribes" element={<Navigate to="/admin/newsletter?tab=subscribers" replace />} />
                <Route path="site-analytics" element={<SiteAnalytics />} />
                <Route path="content-insights" element={<ContentInsights />} />
                <Route path="guide-editor" element={<GuideEditor />} />
                <Route path="guide-editor/:id" element={<GuideEditor />} />
                
                <Route path="event-submissions" element={<AdminEventSubmissionsPage />} />
              </Route>
              {/* 3-Before-9 rolling redirect - must be before /:category/:slug */}
              <Route path="/news/3-before-9" element={<ThreeBeforeNineLatest />} />
              <Route path="/3-before-9" element={<ThreeBeforeNineLatest />} />
              <Route path="/guides" element={<Guides />} />
              <Route path="/guides/:slug" element={<GuideDetail />} />
              {/* Legacy WordPress URL redirect - must be before catch-all */}
              <Route path="/:slug" element={<LegacyArticleRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            
          </Suspense>
          </AnalyticsProvider>
        </BrowserRouter>
        </DatabaseErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
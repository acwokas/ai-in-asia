import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from "@/lib/queryPersister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load critical components
import GoogleAnalytics from "./components/GoogleAnalytics";
import { CollectiveFooter } from "./components/CollectiveFooter";
import { DatabaseErrorBoundary } from "./components/DatabaseErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { Skeleton } from "./components/ui/skeleton";
import AnalyticsProvider from "./components/AnalyticsProvider";

// Lazy load Index page to reduce initial bundle
const Index = lazy(() => import("./pages/Index"));

// Lazy load non-critical components
const WelcomePopup = lazy(() => import("./components/WelcomePopup"));
const ConsentBanner = lazy(() => import("./components/ConsentBanner"));
const StickyNewsletterBar = lazy(() => import("./components/StickyNewsletterBar"));
const InstallAppButton = lazy(() => import("./components/InstallAppButton").then(m => ({ default: m.InstallAppButton })));

// Lazy load all other pages for better performance
const Article = lazy(() => import("./pages/Article"));
const Category = lazy(() => import("./pages/Category"));
const Tag = lazy(() => import("./pages/Tag"));
const AuthorProfile = lazy(() => import("./pages/AuthorProfile"));
const SitemapRedirect = lazy(() => import("./pages/SitemapRedirect"));
const RssRedirect = lazy(() => import("./pages/RssRedirect"));
const FeedRedirect = lazy(() => import("./pages/RssRedirect")); // Same as RSS
const Search = lazy(() => import("./pages/Search"));
const ConnectionTest = lazy(() => import("./pages/ConnectionTest"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Articles = lazy(() => import("./pages/Articles"));
const Editor = lazy(() => import("./pages/Editor"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PolicyAtlas = lazy(() => import("./pages/PolicyAtlas"));
const PolicyRegion = lazy(() => import("./pages/PolicyRegion"));
const PolicyComparison = lazy(() => import("./pages/PolicyComparison"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Redirects = lazy(() => import("./pages/Redirects"));
const BulkImport = lazy(() => import("./pages/BulkImport"));
const ImageMigration = lazy(() => import("./pages/ImageMigration"));
const ExtractImageUrls = lazy(() => import("./pages/ExtractImageUrls"));
const UpdateArticleImages = lazy(() => import("./pages/UpdateArticleImages"));
const MigrateTopListImages = lazy(() => import("./pages/MigrateTopListImages"));
const MigrationDashboard = lazy(() => import("./pages/MigrationDashboard"));
const BulkRedirects = lazy(() => import("./pages/BulkRedirects"));
const CsvUrlReplacer = lazy(() => import("./pages/CsvUrlReplacer"));
const MigrateCategoryUrls = lazy(() => import("./pages/MigrateCategoryUrls"));
const ContentProcessor = lazy(() => import("./pages/ContentProcessor"));
const CategoryMapper = lazy(() => import("./pages/CategoryMapper"));
const CleanArticles = lazy(() => import("./pages/CleanArticles"));
const FixMigratedContent = lazy(() => import("./pages/FixMigratedContent"));
const RemoveTweetLinks = lazy(() => import("./pages/RemoveTweetLinks"));
const PublishAllArticles = lazy(() => import("./pages/PublishAllArticles"));
const AIComments = lazy(() => import("./pages/AIComments"));
const GenerateTldrBulk = lazy(() => import("./pages/GenerateTldrBulk"));
const BulkTldrContext = lazy(() => import("./pages/BulkTldrContext"));
const AssignCategories = lazy(() => import("./pages/AssignCategories"));
const FixBrokenImage = lazy(() => import("./pages/FixBrokenImage"));
const FixExternalLinks = lazy(() => import("./pages/FixExternalLinks"));
const BulkOperations = lazy(() => import("./pages/BulkOperations"));
const ContentAnalytics = lazy(() => import("./pages/ContentAnalytics"));
const SEOTools = lazy(() => import("./pages/SEOTools"));
const AuthorManagement = lazy(() => import("./pages/AuthorManagement"));
const EditorsPickManager = lazy(() => import("./pages/EditorsPickManager"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Events = lazy(() => import("./pages/Events"));
const Tools = lazy(() => import("./pages/Tools"));
const AskScout = lazy(() => import("./pages/AskScout"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const NewsletterManager = lazy(() => import("./pages/NewsletterManager"));
const NewsletterArchive = lazy(() => import("./pages/NewsletterArchive"));
const NewsletterView = lazy(() => import("./pages/NewsletterView"));
const UploadAuthorAvatars = lazy(() => import("./pages/UploadAuthorAvatars"));
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
const OptimizeArticleImages = lazy(() => import("./pages/OptimizeArticleImages"));
const ContentCalendar = lazy(() => import("./pages/ContentCalendar"));
const Guides = lazy(() => import("./pages/Guides"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const GuidesImport = lazy(() => import("./pages/GuidesImport"));
const NewsletterAnalytics = lazy(() => import("./pages/NewsletterAnalytics"));
const SiteAnalytics = lazy(() => import("./pages/SiteAnalytics"));
const SavedArticles = lazy(() => import("./pages/SavedArticles"));
const EditorialStandards = lazy(() => import("./pages/EditorialStandards"));
const Contribute = lazy(() => import("./pages/Contribute"));
const MediaAndPartners = lazy(() => import("./pages/MediaAndPartners"));
const ImportNewsletterSubscribers = lazy(() => import("./pages/ImportNewsletterSubscribers"));
const ThreeBeforeNineLatest = lazy(() => import("./pages/ThreeBeforeNineLatest"));

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
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnalyticsProvider>
            <ScrollToTop />
            <GoogleAnalytics />
            <Suspense fallback={null}>
              <ConsentBanner />
            </Suspense>
            <Suspense fallback={null}>
              <WelcomePopup />
            </Suspense>
            <Suspense fallback={null}>
              <StickyNewsletterBar />
            </Suspense>
            <Suspense fallback={null}>
              <InstallAppButton />
            </Suspense>
            <Suspense fallback={<HomepageSkeleton />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/:category/:slug" element={<Article />} />
              <Route path="/category/:slug" element={<Category />} />
              <Route path="/tag/:slug" element={<Tag />} />
              <Route path="/author/:slug" element={<AuthorProfile />} />
              <Route path="/sitemap.xml" element={<SitemapRedirect />} />
              <Route path="/rss.xml" element={<RssRedirect />} />
              <Route path="/rss" element={<RssRedirect />} />
              <Route path="/feed" element={<FeedRedirect />} />
              <Route path="/search" element={<Search />} />
              <Route path="/connection-test" element={<ConnectionTest />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/articles" element={<Articles />} />
              <Route path="/admin/calendar" element={<ContentCalendar />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/editor/:id" element={<Editor />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/events" element={<Events />} />
              <Route path="/tools" element={<Navigate to="/guides?category=tools" replace />} />
              <Route path="/prompts" element={<Navigate to="/guides?category=prompts" replace />} />
              <Route path="/saved" element={<SavedArticles />} />
              <Route path="/my-prompts" element={<MyPrompts />} />
              <Route path="/ai-policy-atlas" element={<PolicyAtlas />} />
              <Route path="/ai-policy-atlas/compare" element={<PolicyComparison />} />
              <Route path="/ai-policy-atlas/:region" element={<PolicyRegion />} />
              <Route path="/ai-policy-atlas/:region/:slug" element={<Article />} />
              <Route path="/ask-scout" element={<AskScout />} />
              <Route path="/newsletter" element={<Newsletter />} />
              <Route path="/newsletter-manager" element={<NewsletterManager />} />
              <Route path="/newsletter/archive" element={<NewsletterArchive />} />
              <Route path="/newsletter/archive/:date" element={<NewsletterView />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/editorial-standards" element={<EditorialStandards />} />
              <Route path="/contribute" element={<Contribute />} />
              <Route path="/media-and-partners" element={<MediaAndPartners />} />
              <Route path="/redirects" element={<Redirects />} />
              <Route path="/admin/bulk-import" element={<BulkImport />} />
              <Route path="/admin/extract-image-urls" element={<ExtractImageUrls />} />
              <Route path="/admin/image-migration" element={<ImageMigration />} />
              <Route path="/admin/update-article-images" element={<UpdateArticleImages />} />
              <Route path="/admin/migrate-toplist-images" element={<MigrateTopListImages />} />
              <Route path="/admin/optimize-images" element={<OptimizeArticleImages />} />
              <Route path="/admin/migration-dashboard" element={<MigrationDashboard />} />
              <Route path="/admin/bulk-redirects" element={<BulkRedirects />} />
              <Route path="/admin/csv-url-replacer" element={<CsvUrlReplacer />} />
              <Route path="/admin/migrate-category-urls" element={<MigrateCategoryUrls />} />
              <Route path="/admin/content-processor" element={<ContentProcessor />} />
              <Route path="/admin/category-mapper" element={<CategoryMapper />} />
              <Route path="/admin/clean-articles" element={<CleanArticles />} />
              <Route path="/admin/fix-migrated-content" element={<FixMigratedContent />} />
              <Route path="/admin/internal-links" element={<InternalLinksManager />} />
            <Route path="/admin/link-health" element={<LinkHealthMonitor />} />
            <Route path="/admin/bulk-links-undo" element={<BulkLinksUndo />} />
            <Route path="/admin/fix-broken-links" element={<FixBrokenLinks />} />
            <Route path="/admin/content-freshness" element={<ContentFreshness />} />
              <Route path="/admin/remove-tweet-links" element={<RemoveTweetLinks />} />
              <Route path="/admin/publish-all" element={<PublishAllArticles />} />
              <Route path="/admin/ai-comments" element={<AIComments />} />
              <Route path="/admin/knowledge-engine" element={<KnowledgeEngine />} />
              <Route path="/admin/generate-tldr" element={<GenerateTldrBulk />} />
              <Route path="/admin/bulk-tldr-context" element={<BulkTldrContext />} />
              <Route path="/admin/assign-categories" element={<AssignCategories />} />
              <Route path="/admin/fix-broken-image" element={<FixBrokenImage />} />
              <Route path="/admin/fix-external-links" element={<FixExternalLinks />} />
              <Route path="/admin/bulk-operations" element={<BulkOperations />} />
              <Route path="/admin/analytics" element={<ContentAnalytics />} />
              <Route path="/admin/seo-tools" element={<SEOTools />} />
              <Route path="/admin/author-management" element={<AuthorManagement />} />
              <Route path="/admin/editors-picks" element={<EditorsPickManager />} />
              <Route path="/admin/upload-avatars" element={<UploadAuthorAvatars />} />
              <Route path="/admin/process-comments" element={<ProcessPendingComments />} />
              <Route path="/admin/bulk-seo" element={<BulkSEOGeneration />} />
              <Route path="/admin/category-sponsors" element={<CategorySponsorsManager />} />
              <Route path="/admin/404-analytics" element={<NotFoundAnalytics />} />
              <Route path="/admin/guides-import" element={<GuidesImport />} />
              <Route path="/admin/newsletter-analytics" element={<NewsletterAnalytics />} />
              <Route path="/admin/site-analytics" element={<SiteAnalytics />} />
              <Route path="/admin/import-subscribers" element={<ImportNewsletterSubscribers />} />
              {/* 3-Before-9 rolling redirect - must be before /:category/:slug */}
              <Route path="/news/3-before-9" element={<ThreeBeforeNineLatest />} />
              <Route path="/3-before-9" element={<ThreeBeforeNineLatest />} />
              <Route path="/guides" element={<Guides />} />
              <Route path="/guides/:slug" element={<GuideDetail />} />
              {/* Legacy WordPress URL redirect - must be before catch-all */}
              <Route path="/:slug" element={<LegacyArticleRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CollectiveFooter />
          </Suspense>
          </AnalyticsProvider>
        </BrowserRouter>
        </DatabaseErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
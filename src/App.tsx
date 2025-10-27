import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load critical components for first paint
import Index from "./pages/Index";
import WelcomePopup from "./components/WelcomePopup";
import ScoutChatbot from "./components/ScoutChatbot";
import GoogleAnalytics from "./components/GoogleAnalytics";
import { loadGoogleAdsScript } from "./components/GoogleAds";
import ConsentBanner from "./components/ConsentBanner";
import { CollectiveFooter } from "./components/CollectiveFooter";
import { DatabaseErrorBoundary } from "./components/DatabaseErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";

// Lazy load all other pages for better performance
const Article = lazy(() => import("./pages/Article"));
const Category = lazy(() => import("./pages/Category"));
const Tag = lazy(() => import("./pages/Tag"));
const AuthorProfile = lazy(() => import("./pages/AuthorProfile"));
const SitemapRedirect = lazy(() => import("./pages/SitemapRedirect"));
const RssRedirect = lazy(() => import("./pages/RssRedirect"));
const Search = lazy(() => import("./pages/Search"));
const ConnectionTest = lazy(() => import("./pages/ConnectionTest"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Articles = lazy(() => import("./pages/Articles"));
const Editor = lazy(() => import("./pages/Editor"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Redirects = lazy(() => import("./pages/Redirects"));
const BulkImport = lazy(() => import("./pages/BulkImport"));
const ImageMigration = lazy(() => import("./pages/ImageMigration"));
const ExtractImageUrls = lazy(() => import("./pages/ExtractImageUrls"));
const UpdateArticleImages = lazy(() => import("./pages/UpdateArticleImages"));
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
const BulkCommentGeneration = lazy(() => import("./pages/BulkCommentGeneration"));
const GenerateTldrBulk = lazy(() => import("./pages/GenerateTldrBulk"));
const AssignCategories = lazy(() => import("./pages/AssignCategories"));
const FixBrokenImage = lazy(() => import("./pages/FixBrokenImage"));
const BulkOperations = lazy(() => import("./pages/BulkOperations"));
const ContentAnalytics = lazy(() => import("./pages/ContentAnalytics"));
const SEOTools = lazy(() => import("./pages/SEOTools"));
const AuthorManagement = lazy(() => import("./pages/AuthorManagement"));
const EditorsPickManager = lazy(() => import("./pages/EditorsPickManager"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Events = lazy(() => import("./pages/Events"));
const Tools = lazy(() => import("./pages/Tools"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const NewsletterManager = lazy(() => import("./pages/NewsletterManager"));
const NewsletterArchive = lazy(() => import("./pages/NewsletterArchive"));
const NewsletterView = lazy(() => import("./pages/NewsletterView"));
const UploadAuthorAvatars = lazy(() => import("./pages/UploadAuthorAvatars"));
const ProcessPendingComments = lazy(() => import("./pages/ProcessPendingComments"));
const BulkSEOGeneration = lazy(() => import("./pages/BulkSEOGeneration"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

loadGoogleAdsScript();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <DatabaseErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <GoogleAnalytics />
            <ConsentBanner />
            <WelcomePopup />
            <ScoutChatbot />
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/:category/:slug" element={<Article />} />
              <Route path="/category/:slug" element={<Category />} />
              <Route path="/tag/:slug" element={<Tag />} />
              <Route path="/author/:slug" element={<AuthorProfile />} />
              <Route path="/sitemap.xml" element={<SitemapRedirect />} />
              <Route path="/rss.xml" element={<RssRedirect />} />
              <Route path="/search" element={<Search />} />
              <Route path="/connection-test" element={<ConnectionTest />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/articles" element={<Articles />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/editor/:id" element={<Editor />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/events" element={<Events />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/newsletter" element={<Newsletter />} />
              <Route path="/newsletter-manager" element={<NewsletterManager />} />
              <Route path="/newsletter/archive" element={<NewsletterArchive />} />
              <Route path="/newsletter/archive/:date" element={<NewsletterView />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/redirects" element={<Redirects />} />
              <Route path="/admin/bulk-import" element={<BulkImport />} />
              <Route path="/admin/extract-image-urls" element={<ExtractImageUrls />} />
              <Route path="/admin/image-migration" element={<ImageMigration />} />
              <Route path="/admin/update-article-images" element={<UpdateArticleImages />} />
              <Route path="/admin/migration-dashboard" element={<MigrationDashboard />} />
              <Route path="/admin/bulk-redirects" element={<BulkRedirects />} />
              <Route path="/admin/csv-url-replacer" element={<CsvUrlReplacer />} />
              <Route path="/admin/migrate-category-urls" element={<MigrateCategoryUrls />} />
              <Route path="/admin/content-processor" element={<ContentProcessor />} />
              <Route path="/admin/category-mapper" element={<CategoryMapper />} />
              <Route path="/admin/clean-articles" element={<CleanArticles />} />
              <Route path="/admin/fix-migrated-content" element={<FixMigratedContent />} />
              <Route path="/admin/remove-tweet-links" element={<RemoveTweetLinks />} />
              <Route path="/admin/publish-all" element={<PublishAllArticles />} />
              <Route path="/admin/bulk-comments" element={<BulkCommentGeneration />} />
              <Route path="/admin/generate-tldr" element={<GenerateTldrBulk />} />
              <Route path="/admin/assign-categories" element={<AssignCategories />} />
              <Route path="/admin/fix-broken-image" element={<FixBrokenImage />} />
              <Route path="/admin/bulk-operations" element={<BulkOperations />} />
              <Route path="/admin/analytics" element={<ContentAnalytics />} />
              <Route path="/admin/seo-tools" element={<SEOTools />} />
              <Route path="/admin/author-management" element={<AuthorManagement />} />
              <Route path="/admin/editors-picks" element={<EditorsPickManager />} />
              <Route path="/admin/upload-avatars" element={<UploadAuthorAvatars />} />
              <Route path="/admin/process-comments" element={<ProcessPendingComments />} />
              <Route path="/admin/bulk-seo" element={<BulkSEOGeneration />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CollectiveFooter />
        </BrowserRouter>
        </DatabaseErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
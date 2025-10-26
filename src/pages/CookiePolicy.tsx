import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Cookie Policy</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <h1 className="headline text-4xl md:text-5xl mb-4">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 16 October 2025</p>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <h2 className="headline text-3xl mt-8 mb-4">What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and improve your experience.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">How We Use Cookies</h2>
          <p>
            AI in ASIA uses cookies for the following purposes:
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Essential Cookies</h3>
          <p>
            These cookies are necessary for the website to function properly. They enable basic features like page navigation and access to secure areas.
          </p>
          <ul className="space-y-2">
            <li>Session management</li>
            <li>Security and authentication</li>
            <li>Load balancing</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Analytics Cookies</h3>
          <p>
            We use Google Analytics to understand how visitors interact with our website. These cookies help us improve our content and user experience.
          </p>
          <ul className="space-y-2">
            <li>Page views and visitor counts</li>
            <li>Traffic sources</li>
            <li>User behaviour patterns</li>
            <li>Device and browser information</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Advertising Cookies</h3>
          <p>
            We use Google Ads cookies to display relevant advertisements and measure their effectiveness.
          </p>
          <ul className="space-y-2">
            <li>Ad personalisation</li>
            <li>Ad frequency capping</li>
            <li>Conversion tracking</li>
            <li>Remarketing</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Preference Cookies</h3>
          <p>
            These cookies remember your choices to provide a more personalised experience.
          </p>
          <ul className="space-y-2">
            <li>Theme preference (light/dark mode)</li>
            <li>Newsletter popup dismissal</li>
            <li>Language preferences</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">Third-Party Cookies</h2>
          <p>
            Some cookies on our site are set by third-party services:
          </p>
          <ul className="space-y-2">
            <li><strong>Google Analytics:</strong> _ga, _gid, _gat</li>
            <li><strong>Google Ads:</strong> IDE, DSID, FLC</li>
            <li><strong>Social Media:</strong> Embedded content from YouTube, Twitter, LinkedIn</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">Managing Cookies</h2>
          <p>
            You can control and manage cookies in various ways:
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Browser Settings</h3>
          <p>
            Most browsers allow you to refuse cookies or delete cookies. The methods for doing so vary from browser to browser. Please consult your browser's help menu for instructions.
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Opt-Out Tools</h3>
          <ul className="space-y-2">
            <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Analytics Opt-out Browser Add-on</a></li>
            <li><a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Ads Settings</a></li>
            <li><a href="http://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Your Online Choices</a></li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Impact of Disabling Cookies</h3>
          <p>
            Please note that disabling cookies may affect the functionality of our website and limit your ability to use certain features.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Cookie Duration</h2>
          <p>
            Cookies may be session-based (deleted when you close your browser) or persistent (remain for a specified time or until manually deleted).
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. Please review this page periodically.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Contact Us</h2>
          <p>
            If you have questions about our use of cookies, please contact us at <a href="mailto:privacy@aiinasia.com" className="text-primary hover:underline">privacy@aiinasia.com</a>.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CookiePolicy;

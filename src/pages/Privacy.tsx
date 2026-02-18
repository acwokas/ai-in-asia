import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
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

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Privacy Policy"
        description="Read AI in ASIA's Privacy Policy. Learn how we collect, use, and protect your personal information."
        canonical="https://aiinasia.com/privacy"
      />
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
              <BreadcrumbPage>Privacy Policy</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <h1 className="headline text-4xl md:text-5xl mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 19 October 2025</p>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <h2 className="headline text-3xl mt-8 mb-4">Introduction</h2>
          <p>
            AI in ASIA ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Information We Collect</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3">Account Information</h3>
          <p>When you create an account with us, we collect:</p>
          <ul className="space-y-2">
            <li>Email address and username</li>
            <li>Profile information (first name, last name, job title, company)</li>
            <li>Avatar image (optional)</li>
            <li>Professional interests and preferences</li>
            <li>Country/location (optional)</li>
            <li>Newsletter subscription preferences</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Activity and Engagement Data</h3>
          <p>We collect data about your interactions with our platform to provide gamification features:</p>
          <ul className="space-y-2">
            <li>Articles read and reading history</li>
            <li>Bookmarked articles</li>
            <li>Comments and community contributions</li>
            <li>Reading streaks and engagement patterns</li>
            <li>Points earned and achievement progress</li>
            <li>User level and gamification statistics</li>
            <li>Social sharing activity</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Information You Provide</h3>
          <ul className="space-y-2">
            <li>Contact form submissions</li>
            <li>Newsletter subscription (email address)</li>
            <li>Comments and feedback on articles</li>
            <li>Scout AI assistant queries and interactions</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Automatically Collected Information</h3>
          <ul className="space-y-2">
            <li>Browser type and version</li>
            <li>IP address</li>
            <li>Pages visited and time spent on each page</li>
            <li>Referring website and navigation paths</li>
            <li>Device information and screen resolution</li>
            <li>Search queries within our site</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="space-y-2">
            <li>Provide and maintain your user account</li>
            <li>Personalize your reading experience and content recommendations</li>
            <li>Track and award points, achievements, and badges through our gamification system</li>
            <li>Calculate reading streaks and engagement statistics</li>
            <li>Enable community features like commenting and bookmarking</li>
            <li>Deliver newsletter content and updates</li>
            <li>Respond to your enquiries and comments</li>
            <li>Process and respond to Scout AI assistant queries</li>
            <li>Improve our website, services, and AI features</li>
            <li>Analyse usage patterns and trends</li>
            <li>Display your profile information to other users (as permitted by your settings)</li>
            <li>Send notifications about achievements and milestones</li>
            <li>Comply with legal obligations</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">Gamification Features</h2>
          <p>
            Our platform includes gamification features designed to enhance user engagement. When you interact with our content, we track:
          </p>
          <ul className="space-y-2">
            <li><strong>Points System:</strong> You earn points for reading articles, commenting, bookmarking content, and subscribing to our newsletter</li>
            <li><strong>User Levels:</strong> Your account progresses through levels (Explorer, Enthusiast, Expert, Thought Leader) based on accumulated points</li>
            <li><strong>Achievements:</strong> We track your progress toward various achievements and badges based on your activity</li>
            <li><strong>Reading Streaks:</strong> We monitor consecutive days of article reading to calculate and maintain your streak</li>
            <li><strong>Statistics:</strong> We maintain comprehensive statistics about your engagement, including articles read, comments made, and shares</li>
          </ul>
          <p className="mt-4">
            All gamification data is associated with your account and used solely to provide these features. You can view your statistics and achievements on your profile page.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies to enhance your experience. You can control cookie preferences through your browser settings. For more details, see our <a href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</a>.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">AI Features and Data Processing</h2>
          <p>
            Our Scout AI assistant uses artificial intelligence to help you discover content and answer questions about AI topics. When you interact with Scout:
          </p>
          <ul className="space-y-2">
            <li>Your queries are processed to provide relevant responses</li>
            <li>We track query usage to prevent abuse and maintain service quality</li>
            <li>Conversations may be analysed to improve AI performance</li>
            <li>Query data is stored securely and not shared with third parties for marketing purposes</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">Third-Party Services</h2>
          <p>We use the following third-party services that may collect and process your information:</p>
          <ul className="space-y-2">
            <li><strong>Google Analytics:</strong> For website analytics and user behaviour tracking</li>
            <li><strong>Google Ads:</strong> For advertising and remarketing</li>
            <li><strong>Email Service Providers:</strong> For newsletter delivery and transactional emails</li>
            <li><strong>Cloud Infrastructure:</strong> For secure data storage and processing</li>
            <li><strong>AI Service Providers:</strong> For powering our Scout AI assistant features</li>
            <li><strong>Content Delivery Networks:</strong> For faster content delivery and image hosting</li>
          </ul>
          <p className="mt-4">
            These third-party services have their own privacy policies. We recommend reviewing their policies to understand how they handle your data.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Data Retention</h2>
          <p>We retain your information for as long as necessary to provide our services and as required by law:</p>
          <ul className="space-y-2">
            <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after closure</li>
            <li><strong>Reading History:</strong> Stored as long as your account is active; can be deleted upon request</li>
            <li><strong>Gamification Data:</strong> Stored with your account to maintain achievements and progress</li>
            <li><strong>Comments:</strong> May be retained indefinitely as part of public discussion threads</li>
            <li><strong>Analytics Data:</strong> Typically retained for 26 months as per standard analytics practices</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">Data Security</h2>
          <p>
            We implement appropriate technical and organisational measures to protect your personal information, including:
          </p>
          <ul className="space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Secure password hashing and storage</li>
            <li>Regular backups and disaster recovery procedures</li>
          </ul>
          <p className="mt-4">
            However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Your Rights and Choices</h2>
          <p>You have the following rights regarding your personal information:</p>
          <ul className="space-y-2">
            <li><strong>Access:</strong> Request a copy of your personal information and data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information through your profile settings</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong>Export:</strong> Download your data including reading history, comments, and statistics</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
            <li><strong>Restrict Processing:</strong> Limit how we use certain information</li>
            <li><strong>Object:</strong> Object to processing of your information for certain purposes</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us at <a href="mailto:privacy@aiinasia.com" className="text-primary hover:underline">privacy@aiinasia.com</a> or manage your settings through your account profile.
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Account Deletion</h3>
          <p>
            When you delete your account, we will remove your profile information, reading history, and gamification data. However, comments you've made on articles may remain visible (with your username removed) to preserve the integrity of public discussions.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Children's Privacy</h2>
          <p>
            Our services are not directed to individuals under 16. We do not knowingly collect personal information from children.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at <a href="mailto:privacy@aiinasia.com" className="text-primary hover:underline">privacy@aiinasia.com</a>.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Privacy;

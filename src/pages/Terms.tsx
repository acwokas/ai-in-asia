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

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Terms of Service"
        description="Read AI in ASIA's Terms of Service. Understand the terms and conditions that govern your use of our platform."
        canonical="https://aiinasia.com/terms"
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
              <BreadcrumbPage>Terms of Service</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <h1 className="headline text-4xl md:text-5xl mb-4">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 19 October 2025</p>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <h2 className="headline text-3xl mt-8 mb-4">Agreement to Terms</h2>
          <p>
            By accessing or using AI in ASIA, including creating an account and participating in our gamification features, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our services.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">User Accounts</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3">Account Creation</h3>
          <p>To access certain features, you must create an account. When creating an account:</p>
          <ul className="space-y-2">
            <li>You must provide accurate and complete information</li>
            <li>You must be at least 16 years old</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You may not share your account with others</li>
            <li>You are responsible for all activities that occur under your account</li>
            <li>You must notify us immediately of any unauthorized access</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Account Termination</h3>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms, engage in abusive behavior, or misuse our gamification system. You may delete your account at any time through your profile settings.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Intellectual Property</h2>
          <p>
            All content on AI in ASIA, including text, graphics, logos, images, and software, is the property of AI in ASIA or its content suppliers and is protected by international copyright laws.
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Permitted Use</h3>
          <p>You may:</p>
          <ul className="space-y-2">
            <li>View and read content for personal, non-commercial use</li>
            <li>Share links to our articles on social media</li>
            <li>Quote brief excerpts with proper attribution</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Prohibited Use</h3>
          <p>You may not:</p>
          <ul className="space-y-2">
            <li>Reproduce, distribute, or republish our content without permission</li>
            <li>Use our content for commercial purposes without authorisation</li>
            <li>Remove copyright or attribution notices</li>
            <li>Use automated systems to scrape or harvest content</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">User Content and Community Guidelines</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3">Content You Submit</h3>
          <p>
            When you submit comments, feedback, or other content to AI in ASIA, you grant us a non-exclusive, worldwide, royalty-free licence to use, reproduce, modify, and publish such content. You represent that:
          </p>
          <ul className="space-y-2">
            <li>You own or have the rights to the content you submit</li>
            <li>Your content does not infringe on any third-party rights</li>
            <li>Your content complies with all applicable laws</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Prohibited Content</h3>
          <p>You may not post content that:</p>
          <ul className="space-y-2">
            <li>Is illegal, harmful, threatening, abusive, or harassing</li>
            <li>Contains hate speech or discriminatory language</li>
            <li>Infringes on intellectual property rights</li>
            <li>Contains spam, advertising, or promotional material (unless authorized)</li>
            <li>Includes malware, viruses, or malicious code</li>
            <li>Violates the privacy of others</li>
            <li>Is false, misleading, or defamatory</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Content Moderation</h3>
          <p>
            We reserve the right to review, moderate, edit, or remove any user-generated content at our discretion. Comments may require approval before appearing publicly.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Gamification System</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3">Points, Levels, and Achievements</h3>
          <p>
            Our platform includes a gamification system that awards points, levels, and achievements based on your engagement. By participating:
          </p>
          <ul className="space-y-2">
            <li>Points and achievements have no monetary value and cannot be exchanged for cash</li>
            <li>We reserve the right to adjust point values, achievement criteria, and levels at any time</li>
            <li>Manipulation or gaming of the system (including automation or fake activity) is prohibited</li>
            <li>We may reset or adjust points/achievements if we detect abuse or violations</li>
            <li>Gamification features are provided for entertainment and engagement purposes only</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">Fair Use</h3>
          <p>You agree not to:</p>
          <ul className="space-y-2">
            <li>Use bots, scripts, or automation to artificially inflate points or achievements</li>
            <li>Create multiple accounts to gain unfair advantages</li>
            <li>Manipulate reading streaks or engagement metrics</li>
            <li>Exploit bugs or vulnerabilities in the gamification system</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">Scout AI Assistant</h2>
          <p>
            Our Scout AI assistant is provided to enhance your experience. When using Scout:
          </p>
          <ul className="space-y-2">
            <li>AI responses are generated automatically and may not always be accurate</li>
            <li>You should not rely solely on AI-generated information for critical decisions</li>
            <li>Usage may be subject to rate limits to ensure service availability</li>
            <li>Abusive or inappropriate queries are prohibited</li>
            <li>We reserve the right to restrict or terminate access for misuse</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">Disclaimer of Warranties</h2>
          <p>
            AI in ASIA, including all gamification features and AI services, is provided "as is" without warranties of any kind, either express or implied. We do not warrant that:
          </p>
          <ul className="space-y-2">
            <li>The service will be uninterrupted, secure, or error-free</li>
            <li>Points, achievements, or user data will be preserved indefinitely</li>
            <li>AI-generated content will be accurate or reliable</li>
            <li>The service will be free from viruses or other harmful components</li>
            <li>Any content on the platform is accurate, current, or complete</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">Limitation of Liability</h2>
          <p>
            In no event shall AI in ASIA be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the service, including but not limited to:
          </p>
          <ul className="space-y-2">
            <li>Loss of data, points, achievements, or account information</li>
            <li>Decisions made based on AI-generated content</li>
            <li>Unauthorized access to your account</li>
            <li>Service interruptions or technical failures</li>
            <li>Content posted by other users</li>
          </ul>
          
          <h2 className="headline text-3xl mt-8 mb-4">External Links</h2>
          <p>
            Our website may contain links to third-party websites. We are not responsible for the content, privacy practices, or terms of service of any linked sites.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Advertising</h2>
          <p>
            We display advertisements through Google Ads and may feature sponsored content. Sponsored content will be clearly labelled. We are not responsible for the accuracy or claims made in advertisements.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Modification of Terms</h2>
          <p>
            We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to the website. Your continued use of the service constitutes acceptance of the modified terms.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of Singapore, without regard to its conflict of law provisions.
          </p>
          
          <h2 className="headline text-3xl mt-8 mb-4">Contact Information</h2>
          <p>
            For questions about these Terms of Service, please contact us at <a href="mailto:legal@aiinasia.com" className="text-primary hover:underline">legal@aiinasia.com</a>.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Terms;

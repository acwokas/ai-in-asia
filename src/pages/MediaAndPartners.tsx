import { useRef } from "react";
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
import PartnerHero from "@/components/partners/PartnerHero";
import ContentScaleStats from "@/components/partners/ContentScaleStats";
import AudienceProfile from "@/components/partners/AudienceProfile";
import PartnershipOpportunities from "@/components/partners/PartnershipOpportunities";
import FeaturedPartners from "@/components/partners/FeaturedPartners";
import MediaKitDownload from "@/components/partners/MediaKitDownload";
import PartnershipInquiryForm from "@/components/partners/PartnershipInquiryForm";
import FooterCTA from "@/components/partners/FooterCTA";

const SITE_URL = "https://aiinasia.com";

const schemaJson = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Partner With AI in Asia",
    description:
      "Reach Asia-Pacific's AI decision-makers through editorial sponsorship, event partnership, research collaboration, and brand integration.",
    url: `${SITE_URL}/media-and-partners`,
    publisher: {
      "@type": "Organization",
      name: "AI in Asia",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icons/aiinasia-og-default.png`,
      },
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AI in Asia",
    url: SITE_URL,
    description:
      "Asia-Pacific's leading independent editorial platform covering artificial intelligence policy, platforms, and enterprise adoption.",
    contactPoint: {
      "@type": "ContactPoint",
      email: "partnerships@aiinasia.com",
      contactType: "partnerships",
    },
  },
];

const MediaAndPartners = () => {
  const contactRef = useRef<HTMLDivElement>(null);

  const scrollToContact = () => {
    contactRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Partner With AI in Asia | Reach Asia-Pacific's AI Community"
        description="Partner with Asia-Pacific's leading AI publication. Editorial sponsorship, event partnerships, research collaboration, and brand integration opportunities for organizations reaching AI decision-makers."
        canonical="https://aiinasia.com/media-and-partners"
        ogType="website"
        schemaJson={schemaJson}
      />

      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Partner With Us</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <PartnerHero onScrollToContact={scrollToContact} />
        <ContentScaleStats />
        <AudienceProfile />
        <PartnershipOpportunities onScrollToContact={scrollToContact} />
        <FeaturedPartners />
        <MediaKitDownload />
        <PartnershipInquiryForm ref={contactRef} />
        <FooterCTA />
      </main>

      <Footer />
    </div>
  );
};

export default MediaAndPartners;

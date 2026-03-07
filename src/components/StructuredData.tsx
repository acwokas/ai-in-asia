import { Helmet } from "react-helmet-async";

interface ArticleStructuredDataProps {
  title: string;
  description: string;
  imageUrl?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  categoryName?: string;
  categorySlug?: string;
  wordCount?: number;
  keywords?: string;
  thumbnailUrl?: string;
  canonicalUrl?: string;
  authorSlug?: string;
}


export const ArticleStructuredData = ({
  title,
  description,
  imageUrl,
  datePublished,
  dateModified,
  authorName,
  categoryName,
  categorySlug,
  wordCount,
  keywords,
  thumbnailUrl,
  canonicalUrl,
  authorSlug,
}: ArticleStructuredDataProps) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": categorySlug === "news" ? "NewsArticle" : "Article",
    headline: title,
    description: description,
    image: {
      "@type": "ImageObject",
      url: imageUrl || "https://aiinasia.com/icons/aiinasia-512.png?v=3",
      width: 1200,
      height: 675,
    },
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: authorName,
      ...(authorSlug && { url: `https://aiinasia.com/author/${authorSlug}` }),
    },
    publisher: {
      "@type": "Organization",
      name: "AI in Asia",
      logo: {
        "@type": "ImageObject",
        url: "https://aiinasia.com/icons/aiinasia-512.png",
      },
    },
    isAccessibleForFree: true,
    inLanguage: "en-GB",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".article-content h2", ".article-content p"],
    },
    ...(categoryName && { articleSection: categoryName }),
    ...(wordCount && { wordCount }),
    ...(keywords && { keywords }),
    ...(thumbnailUrl && { thumbnailUrl }),
    ...(canonicalUrl && {
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
    }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export const WebSiteStructuredData = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AI in Asia",
    url: "https://aiinasia.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://aiinasia.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

interface BreadcrumbItem {
  name: string;
  url: string;
}

export const BreadcrumbStructuredData = ({ items }: { items: BreadcrumbItem[] }) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://aiinasia.com${item.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export const OrganizationStructuredData = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AI in ASIA",
    url: "https://aiinasia.com",
    logo: "https://aiinasia.com/icons/aiinasia-512.png",
    description: "Leading platform for AI news, insights, and innovation across Asia",
    sameAs: [
      "https://twitter.com/AI_in_Asia",
      "https://x.com/AI_in_Asia",
      "https://linkedin.com/company/aiinasia",
      "https://www.youtube.com/@aiinasia",
      "https://aiinasia.com",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Editorial",
      email: "contact@aiinasia.com",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export const PersonStructuredData = ({
  name,
  bio,
  imageUrl,
  url,
  twitterHandle,
  linkedinUrl,
  websiteUrl,
}: {
  name: string;
  bio?: string;
  imageUrl?: string;
  url: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
}) => {
  const sameAs = [
    twitterHandle && `https://twitter.com/${twitterHandle}`,
    linkedinUrl,
    websiteUrl,
  ].filter(Boolean);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: name,
    ...(bio && { description: bio }),
    ...(imageUrl && { image: imageUrl }),
    url: `https://aiinasia.com${url}`,
    ...(sameAs.length > 0 && { sameAs }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export const EventStructuredData = ({
  name,
  description,
  startDate,
  endDate,
  location,
  city,
  country,
  organizer,
  url,
  eventType,
  imageUrl,
}: {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location: string;
  city: string;
  country: string;
  organizer?: string;
  url?: string;
  eventType?: string;
  imageUrl?: string;
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: name,
    ...(description && { description: description }),
    startDate: startDate,
    ...(endDate && { endDate: endDate }),
    location: {
      "@type": "Place",
      name: location,
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressCountry: country,
      },
    },
    ...(organizer && {
      organizer: {
        "@type": "Organization",
        name: organizer,
      },
    }),
    ...(url && { url: url }),
    eventAttendanceMode: (() => {
      const loc = (location || '').toLowerCase();
      if (loc.includes('virtual') || loc.includes('online')) return 'https://schema.org/OnlineEventAttendanceMode';
      if (loc.includes('hybrid')) return 'https://schema.org/MixedEventAttendanceMode';
      return 'https://schema.org/OfflineEventAttendanceMode';
    })(),
    eventStatus: "https://schema.org/EventScheduled",
    ...(imageUrl && {
      image: {
        "@type": "ImageObject",
        url: imageUrl,
      },
    }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export const FAQPageStructuredData = ({
  questions,
}: {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

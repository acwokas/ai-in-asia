import { Helmet } from "react-helmet";

interface ArticleStructuredDataProps {
  title: string;
  description: string;
  imageUrl?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  categoryName?: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export const ArticleStructuredData = ({
  title,
  description,
  imageUrl,
  datePublished,
  dateModified,
  authorName,
  categoryName,
}: ArticleStructuredDataProps) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: imageUrl || "https://aiinasia.com/default-og-image.jpg",
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "AI in Asia",
      logo: {
        "@type": "ImageObject",
        url: "https://aiinasia.com/logo.png",
      },
    },
    ...(categoryName && {
      articleSection: categoryName,
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
    logo: "https://aiinasia.com/logo.png",
    description: "Leading platform for AI news, insights, and innovation across Asia",
    sameAs: [
      "https://twitter.com/aiinasia",
      "https://linkedin.com/company/aiinasia",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Editorial",
      email: "editorial@aiinasia.com",
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
}: {
  name: string;
  bio?: string;
  imageUrl?: string;
  url: string;
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: name,
    ...(bio && { description: bio }),
    ...(imageUrl && { image: imageUrl }),
    url: `https://aiinasia.com${url}`,
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

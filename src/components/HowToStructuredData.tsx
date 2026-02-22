import { Helmet } from "react-helmet-async";

interface HowToStructuredDataProps {
  title: string;
  description: string;
  imageUrl?: string;
  steps: { name: string; text: string }[];
}

/**
 * Renders HowTo JSON-LD structured data for articles tagged as how-to/tutorial/guide.
 * Steps are parsed from h2/h3 headings in the article content.
 */
export const HowToStructuredData = ({
  title,
  description,
  imageUrl,
  steps,
}: HowToStructuredDataProps) => {
  if (steps.length === 0) return null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    ...(imageUrl && { image: imageUrl }),
    step: steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
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

/**
 * Parses h2/h3 headings from article HTML content to generate HowTo steps.
 */
export function parseHowToSteps(content: unknown): { name: string; text: string }[] {
  if (!content || typeof content !== "string") return [];

  const steps: { name: string; text: string }[] = [];
  // Match h2 or h3 headings and capture subsequent text
  const regex = /<h[23][^>]*>(.*?)<\/h[23]>([\s\S]*?)(?=<h[23]|$)/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const name = match[1].replace(/<[^>]+>/g, "").trim();
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (name) {
      steps.push({ name, text: text || name });
    }
  }

  return steps;
}

/**
 * Checks if an article should have HowTo structured data based on its tags.
 */
export function isHowToArticle(aiTags?: string[] | null): boolean {
  if (!aiTags || aiTags.length === 0) return false;
  const howToKeywords = ["how-to", "how to", "tutorial", "guide", "step-by-step"];
  return aiTags.some((tag) =>
    howToKeywords.some((kw) => tag.toLowerCase().includes(kw))
  );
}

export default HowToStructuredData;

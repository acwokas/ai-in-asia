import { Link } from "react-router-dom";
import { getCategoryColor } from "@/lib/categoryColors";
import { fixEncoding } from "@/lib/textUtils";

interface ContextualArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  featured_image_url?: string | null;
  categories?: { name: string; slug: string } | null;
}

export function ContextualReadingCard({ article }: { article: ContextualArticle }) {
  const cat = article.categories;
  const color = getCategoryColor(cat?.slug);

  return (
    <Link
      to={`/${cat?.slug || "news"}/${article.slug}`}
      className="block my-8 no-underline"
      style={{
        background: "rgba(48,62,83,0.15)",
        borderRadius: "8px",
        padding: "1rem",
        borderLeft: `4px solid ${color}`,
        textDecoration: "none",
      }}
    >
      <div className="flex gap-3">
        {article.featured_image_url && (
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-[100px] h-[70px] rounded object-cover flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-2 mb-1"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, fontSize: "1rem", color: "hsl(var(--foreground))", margin: 0, lineHeight: 1.4 }}
          >
            {fixEncoding(article.title)}
          </p>
          {article.excerpt && (
            <p className="line-clamp-1 mb-1" style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.875rem", color: "#BFC0C0", margin: "0.25rem 0" }}>
              {fixEncoding(article.excerpt)}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span
              className="inline-block px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider rounded-full"
              style={{ backgroundColor: color, color: "#fff" }}
            >
              {cat?.name || "Article"}
            </span>
            <span style={{ fontSize: "0.875rem", color: "#5F72FF" }}>Read more →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

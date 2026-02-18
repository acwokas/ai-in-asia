import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { BreadcrumbStructuredData } from "@/components/StructuredData";
import { Loader2, Tag as TagIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const Tag = () => {
  const { slug } = useParams();

  const { data: tag, isLoading: tagLoading } = useQuery({
    queryKey: ["tag", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ["tag-articles", slug],
    queryFn: async () => {
      const { data: tagData } = await supabase
        .from("tags")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!tagData) return [];

      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          authors (name, slug),
          article_tags!inner (tag_id),
          categories:primary_category_id (name, slug)
        `)
        .eq("article_tags.tag_id", tagData.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  if (tagLoading || articlesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={`${tag?.name || 'Tag'} - Tagged Articles`}
        description={tag?.description || `Explore articles tagged with ${tag?.name}. ${articles?.length || 0} articles covering AI news, insights, and developments.`}
        canonical={`https://aiinasia.com/tag/${tag?.slug}`}
      />

      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: '/' },
          { name: tag?.name || '', url: `/tag/${tag?.slug}` }
        ]}
      />

      <Header />
      
      <main className="flex-1">
        <section className="bg-muted/30 py-12">
          <div className="container mx-auto px-4">
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{tag?.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <div className="flex items-center gap-3 mb-4">
              <TagIcon className="h-8 w-8 text-primary" />
              <h1 className="headline text-4xl md:text-5xl">
                {tag?.name}
              </h1>
            </div>
            {tag?.description && (
              <p className="text-lg text-muted-foreground max-w-2xl">
                {tag.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {articles?.length || 0} articles tagged
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles?.map((article: any) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                excerpt={article.excerpt || ""}
                category={article.categories?.name || ""}
                categorySlug={article.categories?.slug || "uncategorized"}
                author={article.authors?.name || ""}
                readTime={`${article.reading_time_minutes || 5} min read`}
                image={article.featured_image_url || ""}
                slug={article.slug}
                isTrending={article.is_trending || false}
                commentCount={article.comment_count || 0}
              />
            ))}
          </div>

          {!articles || articles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No articles found with this tag.</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Tag;

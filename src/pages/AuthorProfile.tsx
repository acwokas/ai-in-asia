import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { PersonStructuredData } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Loader2, Twitter, Linkedin, Globe, ChevronDown, ChevronUp } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const AuthorProfile = () => {
  const { slug } = useParams();
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const { data: author, isLoading: authorLoading } = useQuery({
    queryKey: ["author", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ["author-articles", author?.id],
    enabled: !!author?.id, // Only run when we have author data
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    queryFn: async () => {
      if (!author?.id) return [];

      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          categories:primary_category_id (name, slug)
        `)
        .eq("author_id", author.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  if (authorLoading || articlesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{author?.name || 'Author'} - Author Profile | AI in ASIA</title>
        <meta name="description" content={author?.bio || `Read articles by ${author?.name}. ${articles?.length || 0} articles published.`} />
        <link rel="canonical" href={`https://aiinasia.com/author/${author?.slug}`} />
        <meta property="og:title" content={`${author?.name} - Author Profile`} />
        <meta property="og:description" content={author?.bio || `Read articles by ${author?.name}`} />
        <meta property="og:url" content={`https://aiinasia.com/author/${author?.slug}`} />
        {author?.avatar_url && <meta property="og:image" content={author.avatar_url} />}
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${author?.name} - Author Profile`} />
        <meta name="twitter:description" content={author?.bio || `Read articles by ${author?.name}`} />
      </Helmet>

      <PersonStructuredData
        name={author?.name || ''}
        bio={author?.bio}
        imageUrl={author?.avatar_url}
        url={`/author/${author?.slug}`}
      />
      <Header />
      
      <main className="flex-1">
        <section className="bg-muted/30 py-16">
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
                  <BreadcrumbLink asChild>
                    <Link to="/category/voices">Voices</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{author?.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {author?.avatar_url ? (
                <img 
                  src={author.avatar_url} 
                  alt={author.name}
                  className="w-32 h-32 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0" />
              )}
              
              <div className="flex-1">
                <h1 className="headline text-4xl md:text-5xl mb-3">
                  {author?.name}
                </h1>
                {author?.job_title && (
                  <p className="text-xl text-muted-foreground mb-4">
                    {author.job_title}
                  </p>
                )}
                
                {author?.bio && (
                  <div className="mb-4">
                    <div className={`text-lg text-muted-foreground max-w-2xl ${!isBioExpanded && 'line-clamp-2'}`}>
                      {author.bio}
                    </div>
                    {author.bio.length > 150 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                        className="mt-2 text-primary hover:text-primary/80"
                      >
                        {isBioExpanded ? (
                          <>
                            Show less <ChevronUp className="ml-1 h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Read more <ChevronDown className="ml-1 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground mb-4">
                  {articles?.length || 0} articles published
                </p>
                
                <div className="flex gap-3">
                  {author?.twitter_handle && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://twitter.com/${author.twitter_handle}`} target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-4 w-4 mr-2" />
                        Twitter
                      </a>
                    </Button>
                  )}
                  {author?.linkedin_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={author.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  {author?.website_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={author.website_url} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <h2 className="headline text-3xl mb-8">Articles by {author?.name}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles?.map((article: any) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                excerpt={article.excerpt || ""}
                category={article.categories?.name || ""}
                categorySlug={article.categories?.slug || "uncategorized"}
                author={author?.name || ""}
                readTime={`${article.reading_time_minutes || 5} min read`}
                image={article.featured_image_url || ""}
                slug={article.slug}
              />
            ))}
          </div>

          {!articles || articles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No published articles yet.</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AuthorProfile;

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { PersonStructuredData } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Twitter, Linkedin, Globe, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [displayLimit, setDisplayLimit] = useState(10);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  const { data: author, isLoading: authorLoading } = useQuery({
    queryKey: ["author", slug],
    queryFn: async () => {
      // Use public view to avoid exposing sensitive fields like email
      const { data, error } = await supabase
        .from("authors_public")
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all articles for this author (we'll filter/limit client-side)
  const { data: allArticles, isLoading: articlesLoading } = useQuery({
    queryKey: ["author-articles-all", author?.id],
    enabled: !!author?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!author?.id) return [];

      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          reading_time_minutes,
          is_trending,
          comment_count,
          published_at,
          categories:primary_category_id (id, name, slug)
        `)
        .eq("author_id", author.id)
        .eq("status", "published")
        .order("published_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Extract unique categories from articles
  const categories = useMemo(() => {
    if (!allArticles) return [];
    const categoryMap = new Map<string, { id: string; name: string; slug: string }>();
    allArticles.forEach((article: any) => {
      if (article.categories?.id) {
        categoryMap.set(article.categories.id, {
          id: article.categories.id,
          name: article.categories.name,
          slug: article.categories.slug,
        });
      }
    });
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allArticles]);

  // Filter and limit articles
  const filteredArticles = useMemo(() => {
    if (!allArticles) return [];
    
    let filtered = allArticles;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((article: any) =>
        article.title.toLowerCase().includes(query) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((article: any) => article.categories?.id === selectedCategory);
    }
    
    return filtered;
  }, [allArticles, searchQuery, selectedCategory]);

  // Apply display limit
  const displayedArticles = useMemo(() => {
    if (displayLimit === -1) return filteredArticles; // -1 means show all
    return filteredArticles.slice(0, displayLimit);
  }, [filteredArticles, displayLimit]);

  const handleLoadMore = (amount: number) => {
    if (amount === -1) {
      setIsLoadingAll(true);
      // Simulate slight delay to show loading state for "all"
      setTimeout(() => {
        setDisplayLimit(-1);
        setIsLoadingAll(false);
      }, 100);
    } else {
      setDisplayLimit(prev => prev + amount);
    }
  };

  const totalArticles = allArticles?.length || 0;
  const filteredCount = filteredArticles.length;
  const hasMoreToShow = displayLimit !== -1 && displayedArticles.length < filteredCount;

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{author?.name || 'Author'} - Author Profile | AI in ASIA</title>
        <meta name="description" content={author?.bio || `Read articles by ${author?.name}. ${totalArticles} articles published.`} />
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

      {author && (
        <PersonStructuredData
          name={author.name}
          bio={author.bio}
          imageUrl={author.avatar_url}
          url={`/author/${author.slug}`}
        />
      )}
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
            
            {authorLoading ? (
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <Skeleton className="w-32 h-32 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-12 w-64 mb-3" />
                  <Skeleton className="h-6 w-48 mb-4" />
                  <Skeleton className="h-4 w-full max-w-2xl mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                </div>
              </div>
            ) : (
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
                  {totalArticles} articles published
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
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <h2 className="headline text-3xl">Articles by {author?.name}</h2>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDisplayLimit(10); // Reset to initial limit when searching
                  }}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              
              {categories.length > 0 && (
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setDisplayLimit(10); // Reset to initial limit when filtering
                  }}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Results count */}
          {(searchQuery || selectedCategory !== "all") && (
            <p className="text-sm text-muted-foreground mb-4">
              Showing {displayedArticles.length} of {filteredCount} results
              {searchQuery && ` for "${searchQuery}"`}
              {selectedCategory !== "all" && categories.find(c => c.id === selectedCategory) && 
                ` in ${categories.find(c => c.id === selectedCategory)?.name}`
              }
            </p>
          )}
          
          {articlesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-video rounded-lg mb-3" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedArticles.map((article: any) => (
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
                    isTrending={article.is_trending || false}
                    commentCount={article.comment_count || 0}
                  />
                ))}
              </div>

              {/* Load More Options */}
              {hasMoreToShow && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-8 pt-8 border-t border-border">
                  <span className="text-sm text-muted-foreground">Load more:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadMore(10)}
                  >
                    +10
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadMore(50)}
                  >
                    +50
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadMore(-1)}
                    disabled={isLoadingAll}
                  >
                    {isLoadingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `All (${filteredCount - displayedArticles.length} more)`
                    )}
                  </Button>
                </div>
              )}

              {displayLimit === -1 && filteredCount > 10 && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDisplayLimit(10);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Show less
                  </Button>
                </div>
              )}
            </>
          )}

          {!articlesLoading && filteredArticles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== "all" 
                  ? "No articles match your filters."
                  : "No published articles yet."
                }
              </p>
              {(searchQuery || selectedCategory !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AuthorProfile;

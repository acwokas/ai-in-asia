import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Loader2, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  const [authorFilter, setAuthorFilter] = useState(searchParams.get("author") || "all");
  const [tagFilter, setTagFilter] = useState(searchParams.get("tag") || "all");
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "recent");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("display_order");
      return data || [];
    },
  });

  const { data: authors } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      // Use public view to avoid exposing sensitive fields like email
      const { data } = await supabase
        .from("authors_public")
        .select("id, name, slug")
        .order("name");
      return data || [];
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tags")
        .select("id, name, slug")
        .order("name")
        .limit(50);
      return data || [];
    },
  });

  const { data: results, isFetching } = useQuery({
    queryKey: ["search", searchQuery, categoryFilter, authorFilter, tagFilter, dateFilter, sortBy],
    enabled: searchQuery.length > 0,
    queryFn: async () => {
      const searchPattern = `%${searchQuery}%`;
      
      // Search by title and excerpt
      let titleExcerptQuery = supabase
        .from("articles")
        .select(`
          id,
          title,
          excerpt,
          slug,
          featured_image_url,
          reading_time_minutes,
          primary_category_id,
          author_id,
          published_at,
          view_count,
          is_trending,
          comment_count
        `)
        .eq("status", "published")
        .or(`title.ilike.${searchPattern},excerpt.ilike.${searchPattern}`);

      if (categoryFilter !== "all") {
        titleExcerptQuery = titleExcerptQuery.eq("primary_category_id", categoryFilter);
      }

      if (authorFilter !== "all") {
        titleExcerptQuery = titleExcerptQuery.eq("author_id", authorFilter);
      }

      if (dateFilter !== "all") {
        const now = new Date();
        let startDate = new Date();
        
        switch (dateFilter) {
          case "today":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(now.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(now.getMonth() - 1);
            break;
          case "year":
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        titleExcerptQuery = titleExcerptQuery.gte("published_at", startDate.toISOString());
      }

      titleExcerptQuery = titleExcerptQuery.limit(50);

      // Search tags in parallel
      const [titleExcerptResult, matchingTagsResult] = await Promise.all([
        titleExcerptQuery,
        supabase
          .from("tags")
          .select("id")
          .ilike("name", searchPattern)
      ]);

      if (titleExcerptResult.error) throw titleExcerptResult.error;

      let allArticles = titleExcerptResult.data || [];
      const articleIds = new Set(allArticles.map(a => a.id));

      // If we found matching tags, get articles with those tags
      if (matchingTagsResult.data && matchingTagsResult.data.length > 0) {
        const tagIds = matchingTagsResult.data.map(t => t.id);
        
        const { data: articleTags } = await supabase
          .from("article_tags")
          .select("article_id")
          .in("tag_id", tagIds);

        if (articleTags && articleTags.length > 0) {
          const tagArticleIds = articleTags.map(at => at.article_id).filter(id => !articleIds.has(id));
          
          if (tagArticleIds.length > 0) {
            let tagArticlesQuery = supabase
              .from("articles")
              .select(`
                id,
                title,
                excerpt,
                slug,
                featured_image_url,
                reading_time_minutes,
                primary_category_id,
                author_id,
                published_at,
                view_count,
                is_trending,
                comment_count
              `)
              .eq("status", "published")
              .in("id", tagArticleIds);

            if (categoryFilter !== "all") {
              tagArticlesQuery = tagArticlesQuery.eq("primary_category_id", categoryFilter);
            }

            if (authorFilter !== "all") {
              tagArticlesQuery = tagArticlesQuery.eq("author_id", authorFilter);
            }

            if (dateFilter !== "all") {
              const now = new Date();
              let startDate = new Date();
              
              switch (dateFilter) {
                case "today":
                  startDate.setHours(0, 0, 0, 0);
                  break;
                case "week":
                  startDate.setDate(now.getDate() - 7);
                  break;
                case "month":
                  startDate.setMonth(now.getMonth() - 1);
                  break;
                case "year":
                  startDate.setFullYear(now.getFullYear() - 1);
                  break;
              }
              
              tagArticlesQuery = tagArticlesQuery.gte("published_at", startDate.toISOString());
            }

            const { data: tagArticles } = await tagArticlesQuery;
            if (tagArticles) {
              allArticles = [...allArticles, ...tagArticles];
            }
          }
        }
      }

      // Apply sorting
      switch (sortBy) {
        case "recent":
          allArticles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
          break;
        case "oldest":
          allArticles.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
          break;
        case "popular":
          allArticles.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
          break;
        case "trending":
          allArticles = allArticles.filter(a => a.is_trending);
          allArticles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
          break;
      }

      allArticles = allArticles.slice(0, 50);
      
      if (!allArticles || allArticles.length === 0) return [];
      
      // Fetch all related data in parallel
      const categoryIds = [...new Set(allArticles.map(a => a.primary_category_id).filter(Boolean))];
      const authorIds = [...new Set(allArticles.map(a => a.author_id).filter(Boolean))];
      
      const [categoriesResult, authorsResult] = await Promise.all([
        categoryIds.length > 0 
          ? supabase.from("categories").select("id, name, slug").in("id", categoryIds)
          : Promise.resolve({ data: [] }),
        authorIds.length > 0
          ? supabase.from("authors").select("id, name, slug").in("id", authorIds)
          : Promise.resolve({ data: [] })
      ]);
      
      const categoriesMap = new Map((categoriesResult.data || []).map(c => [c.id, c] as const));
      const authorsMap = new Map((authorsResult.data || []).map(a => [a.id, a] as const));
      
      return allArticles.map(article => {
        const category = article.primary_category_id 
          ? categoriesMap.get(article.primary_category_id) 
          : null;
        const author = article.author_id 
          ? authorsMap.get(article.author_id) 
          : null;
          
        return {
          ...article,
          category: category || { id: 'uncategorized', name: "Uncategorized", slug: "uncategorized" },
          author: author || { id: 'unknown', name: "Unknown", slug: "" }
        };
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: any = { q: searchQuery };
    if (categoryFilter !== "all") params.category = categoryFilter;
    if (authorFilter !== "all") params.author = authorFilter;
    if (tagFilter !== "all") params.tag = tagFilter;
    if (dateFilter !== "all") params.date = dateFilter;
    if (sortBy !== "recent") params.sort = sortBy;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setCategoryFilter("all");
    setAuthorFilter("all");
    setTagFilter("all");
    setDateFilter("all");
    setSortBy("recent");
  };

  const activeFiltersCount = [categoryFilter, authorFilter, tagFilter, dateFilter].filter(f => f !== "all").length;

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Search AI Articles"
        description="Search for AI news, insights, and articles on AI in ASIA. Find the latest coverage on artificial intelligence across Asia with advanced filtering."
        canonical="https://aiinasia.com/search"
        noIndex={true}
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
                  <BreadcrumbPage>Search Results</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <h1 className="headline text-4xl md:text-5xl mb-8">Search Articles</h1>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search for articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Category</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Author</Label>
                        <Select value={authorFilter} onValueChange={setAuthorFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All authors" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All authors</SelectItem>
                            {authors?.map((author) => (
                              <SelectItem key={author.id} value={author.id}>
                                {author.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Tag</Label>
                        <Select value={tagFilter} onValueChange={setTagFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All tags" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All tags</SelectItem>
                            {tags?.map((tag) => (
                              <SelectItem key={tag.id} value={tag.id}>
                                {tag.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Past Week</SelectItem>
                            <SelectItem value="month">Past Month</SelectItem>
                            <SelectItem value="year">Past Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger>
                            <SelectValue placeholder="Most Recent" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recent">Most Recent</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="popular">Most Popular</SelectItem>
                            <SelectItem value="trending">Trending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="w-full"
                        type="button"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button type="submit">
                  <SearchIcon className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          {isFetching && searchQuery && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!isFetching && searchQuery && (
            <div className="mb-6">
              <p className="text-muted-foreground">
                Found {results?.length || 0} results for "{searchQuery}"
              </p>
            </div>
          )}

          {!searchQuery && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Enter a search term and click Search to find articles.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results?.map((article: any) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                excerpt={article.excerpt || ""}
                category={article.category.name}
                categorySlug={article.category.slug}
                author={article.author.name}
                readTime={`${article.reading_time_minutes || 5} min read`}
                image={article.featured_image_url || ""}
                slug={article.slug}
                isTrending={article.is_trending || false}
                commentCount={article.comment_count || 0}
              />
            ))}
          </div>

          {!isFetching && searchQuery && results?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No articles found matching your search.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Search;

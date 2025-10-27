import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
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
      const { data } = await supabase
        .from("authors")
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

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", searchQuery, categoryFilter, authorFilter, tagFilter, dateFilter, sortBy],
    enabled: searchQuery.length > 0,
    queryFn: async () => {
      // Build search pattern - simpler approach without content search initially
      const searchPattern = `%${searchQuery}%`;
      
      let query = supabase
        .from("articles")
        .select(`
          *,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .or(`title.ilike.${searchPattern},excerpt.ilike.${searchPattern}`)
        .limit(50);

      if (categoryFilter !== "all") {
        query = query.eq("primary_category_id", categoryFilter);
      }

      if (authorFilter !== "all") {
        query = query.eq("author_id", authorFilter);
      }

      if (tagFilter !== "all") {
        query = query.eq("article_tags.tag_id", tagFilter);
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
        
        if (dateFilter !== "all") {
          query = query.gte("published_at", startDate.toISOString());
        }
      }

      // Apply sorting
      switch (sortBy) {
        case "recent":
          query = query.order("published_at", { ascending: false });
          break;
        case "oldest":
          query = query.order("published_at", { ascending: true });
          break;
        case "popular":
          query = query.order("view_count", { ascending: false });
          break;
        case "trending":
          query = query.eq("is_trending", true).order("published_at", { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
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
      <Helmet>
        <title>Search AI Articles | AI in ASIA</title>
        <meta name="description" content="Search for AI news, insights, and articles on AI in ASIA. Find the latest coverage on artificial intelligence across Asia with advanced filtering." />
        <link rel="canonical" href="https://aiinasia.com/search" />
        <meta property="og:title" content="Search AI Articles | AI in ASIA" />
        <meta property="og:description" content="Search for AI news, insights, and articles on AI in ASIA." />
        <meta property="og:url" content="https://aiinasia.com/search" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Search AI Articles | AI in ASIA" />
        <meta name="twitter:description" content="Search for AI news and articles on AI in ASIA." />
      </Helmet>

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
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && searchQuery && (
            <div className="mb-6">
              <p className="text-muted-foreground">
                Found {results?.length || 0} results for "{searchQuery}"
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results?.map((article: any) => (
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
              />
            ))}
          </div>

          {!isLoading && searchQuery && results?.length === 0 && (
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

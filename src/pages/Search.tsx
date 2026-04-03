import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Loader2, Filter, Bot, X, SearchX, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { addToSearchHistory, findDidYouMean } from "@/lib/searchUtils";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  const [authorFilter, setAuthorFilter] = useState(searchParams.get("author") || "all");
  const [tagFilter, setTagFilter] = useState(searchParams.get("tag") || "all");
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "recent");
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("display_order");
      return data || [];
    },
  });

  const { data: authors } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      const { data } = await supabase.from("authors_public").select("id, name, slug").order("name");
      return data || [];
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("id, name, slug").order("name").limit(50);
      return data || [];
    },
  });

  // Fetch trending articles for empty/no-results fallback
  const { data: trendingArticles } = useQuery({
    queryKey: ["trending-fallback"],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, excerpt, slug, featured_image_url, reading_time_minutes, primary_category_id, author_id, published_at, view_count, is_trending, comment_count")
        .eq("status", "published")
        .eq("is_trending", true)
        .order("published_at", { ascending: false })
        .limit(6);
      if (!data?.length) return [];
      const catIds = [...new Set(data.map(a => a.primary_category_id).filter(Boolean))];
      const authIds = [...new Set(data.map(a => a.author_id).filter(Boolean))];
      const [cRes, aRes] = await Promise.all([
        catIds.length ? supabase.from("categories").select("id, name, slug").in("id", catIds) : { data: [] },
        authIds.length ? supabase.from("authors").select("id, name, slug").in("id", authIds) : { data: [] },
      ]);
      const cMap = new Map((cRes.data || []).map(c => [c.id, c]));
      const aMap = new Map((aRes.data || []).map(a => [a.id, a]));
      return data.map(a => ({
        ...a,
        category: cMap.get(a.primary_category_id!) || { id: "u", name: "Uncategorized", slug: "uncategorized" },
        author: aMap.get(a.author_id!) || { id: "u", name: "Unknown", slug: "" },
      }));
    },
  });

  const { data: results, isFetching } = useQuery({
    queryKey: ["search", searchQuery, categoryFilter, authorFilter, tagFilter, dateFilter, sortBy],
    enabled: searchQuery.length > 0,
    queryFn: async () => {
      const searchPattern = `%${searchQuery}%`;
      
      let titleExcerptQuery = supabase
        .from("articles")
        .select("id, title, excerpt, slug, featured_image_url, reading_time_minutes, primary_category_id, author_id, published_at, view_count, is_trending, comment_count")
        .eq("status", "published")
        .or(`title.ilike.${searchPattern},excerpt.ilike.${searchPattern}`);

      if (categoryFilter !== "all") titleExcerptQuery = titleExcerptQuery.eq("primary_category_id", categoryFilter);
      if (authorFilter !== "all") titleExcerptQuery = titleExcerptQuery.eq("author_id", authorFilter);

      if (dateFilter !== "all") {
        const startDate = new Date();
        switch (dateFilter) {
          case "today": startDate.setHours(0, 0, 0, 0); break;
          case "week": startDate.setDate(startDate.getDate() - 7); break;
          case "month": startDate.setMonth(startDate.getMonth() - 1); break;
          case "year": startDate.setFullYear(startDate.getFullYear() - 1); break;
        }
        titleExcerptQuery = titleExcerptQuery.gte("published_at", startDate.toISOString());
      }

      titleExcerptQuery = titleExcerptQuery.limit(50);

      const [titleExcerptResult, matchingTagsResult] = await Promise.all([
        titleExcerptQuery,
        supabase.from("tags").select("id").ilike("name", searchPattern),
      ]);

      if (titleExcerptResult.error) throw titleExcerptResult.error;

      let allArticles = titleExcerptResult.data || [];
      const articleIds = new Set(allArticles.map(a => a.id));

      if (matchingTagsResult.data?.length) {
        const tagIds = matchingTagsResult.data.map(t => t.id);
        const { data: articleTags } = await supabase.from("article_tags").select("article_id").in("tag_id", tagIds);
        if (articleTags?.length) {
          const tagArticleIds = articleTags.map(at => at.article_id).filter(id => !articleIds.has(id));
          if (tagArticleIds.length) {
            let tq = supabase.from("articles")
              .select("id, title, excerpt, slug, featured_image_url, reading_time_minutes, primary_category_id, author_id, published_at, view_count, is_trending, comment_count")
              .eq("status", "published").in("id", tagArticleIds);
            if (categoryFilter !== "all") tq = tq.eq("primary_category_id", categoryFilter);
            if (authorFilter !== "all") tq = tq.eq("author_id", authorFilter);
            const { data: tagArticles } = await tq;
            if (tagArticles) allArticles = [...allArticles, ...tagArticles];
          }
        }
      }

      switch (sortBy) {
        case "recent": allArticles.sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime()); break;
        case "oldest": allArticles.sort((a, b) => new Date(a.published_at!).getTime() - new Date(b.published_at!).getTime()); break;
        case "popular": allArticles.sort((a, b) => (b.view_count || 0) - (a.view_count || 0)); break;
        case "trending":
          allArticles = allArticles.filter(a => a.is_trending);
          allArticles.sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime());
          break;
      }

      allArticles = allArticles.slice(0, 50);
      if (!allArticles.length) return [];

      const categoryIds = [...new Set(allArticles.map(a => a.primary_category_id).filter(Boolean))];
      const authorIds = [...new Set(allArticles.map(a => a.author_id).filter(Boolean))];

      const [categoriesResult, authorsResult] = await Promise.all([
        categoryIds.length ? supabase.from("categories").select("id, name, slug").in("id", categoryIds) : Promise.resolve({ data: [] }),
        authorIds.length ? supabase.from("authors").select("id, name, slug").in("id", authorIds) : Promise.resolve({ data: [] }),
      ]);

      const cMap = new Map((categoriesResult.data || []).map(c => [c.id, c] as const));
      const aMap = new Map((authorsResult.data || []).map(a => [a.id, a] as const));

      return allArticles.map(article => ({
        ...article,
        category: article.primary_category_id ? cMap.get(article.primary_category_id) || { id: "u", name: "Uncategorized", slug: "uncategorized" } : { id: "u", name: "Uncategorized", slug: "uncategorized" },
        author: article.author_id ? aMap.get(article.author_id) || { id: "u", name: "Unknown", slug: "" } : { id: "u", name: "Unknown", slug: "" },
      }));
    },
  });

  // Faceted counts from unfiltered results
  const facetCounts = useMemo(() => {
    if (!results) return { categories: new Map<string, number>(), authors: new Map<string, number>() };
    const cats = new Map<string, number>();
    const auths = new Map<string, number>();
    for (const r of results) {
      const cid = (r as any).primary_category_id;
      const aid = (r as any).author_id;
      if (cid) cats.set(cid, (cats.get(cid) || 0) + 1);
      if (aid) auths.set(aid, (auths.get(aid) || 0) + 1);
    }
    return { categories: cats, authors: auths };
  }, [results]);

  // Did you mean
  const didYouMean = useMemo(() => {
    if (!searchQuery || (results && results.length > 2)) return null;
    const extraTerms = [
      ...(categories?.map(c => c.name) || []),
      ...(tags?.map(t => t.name) || []),
    ];
    return findDidYouMean(searchQuery, extraTerms);
  }, [searchQuery, results, categories, tags]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    addToSearchHistory(searchQuery);
    const params: Record<string, string> = { q: searchQuery };
    if (categoryFilter !== "all") params.category = categoryFilter;
    if (authorFilter !== "all") params.author = authorFilter;
    if (tagFilter !== "all") params.tag = tagFilter;
    if (dateFilter !== "all") params.date = dateFilter;
    if (sortBy !== "recent") params.sort = sortBy;
    setSearchParams(params);
  };

  const handleDidYouMean = (term: string) => {
    setSearchQuery(term);
    setSearchParams({ q: term });
  };

  const clearFilters = () => {
    setCategoryFilter("all");
    setAuthorFilter("all");
    setTagFilter("all");
    setDateFilter("all");
    setSortBy("recent");
  };

  const activeFiltersCount = [categoryFilter, authorFilter, tagFilter, dateFilter].filter(f => f !== "all").length;

  const FilterControls = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Category</Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((cat) => {
              const count = facetCounts.categories.get(cat.id) || 0;
              return (
                <SelectItem key={cat.id} value={cat.id} disabled={count === 0 && searchQuery.length > 0}>
                  {cat.name}{searchQuery ? ` (${count})` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Author</Label>
        <Select value={authorFilter} onValueChange={setAuthorFilter}>
          <SelectTrigger><SelectValue placeholder="All authors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All authors</SelectItem>
            {authors?.map((author) => {
              const count = facetCounts.authors.get(author.id) || 0;
              return (
                <SelectItem key={author.id} value={author.id} disabled={count === 0 && searchQuery.length > 0}>
                  {author.name}{searchQuery ? ` (${count})` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Tag</Label>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger><SelectValue placeholder="All tags" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags?.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Date Range</Label>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger><SelectValue placeholder="All time" /></SelectTrigger>
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
          <SelectTrigger><SelectValue placeholder="Most Recent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="sm" onClick={clearFilters} className="w-full" type="button">
        Clear Filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Search AI Articles"
        description="Search for AI news, insights, and articles on AI in ASIA."
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
                  <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Search Results</BreadcrumbPage></BreadcrumbItem>
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

                {/* Mobile: Sheet for filters */}
                <div className="md:hidden">
                  <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" type="button" className="w-full">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        <FilterControls />
                        <Button className="w-full mt-4" onClick={() => setFilterOpen(false)}>
                          Apply Filters
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Desktop: Popover for filters */}
                <div className="hidden md:block">
                  <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" type="button">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        <FilterControls />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

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

          {!isFetching && searchQuery && results && results.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
              <Link
                to={`/ask-scout?q=${encodeURIComponent(searchQuery)}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <Bot className="h-3.5 w-3.5" />
                Can't find what you need? Ask Scout →
              </Link>
            </div>
          )}

          {/* Did you mean */}
          {!isFetching && didYouMean && searchQuery && (
            <div className="mb-6 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                Did you mean:{" "}
                <button
                  onClick={() => handleDidYouMean(didYouMean)}
                  className="text-primary font-medium hover:underline"
                >
                  {didYouMean}
                </button>
                ?
              </p>
            </div>
          )}

          {/* No query state */}
          {!searchQuery && (
            <div className="text-center py-12">
              <SearchIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                Enter a search term and click Search to find articles.
              </p>
              <Link
                to="/ask-scout"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Bot className="h-4 w-4" />
                Or ask Scout AI a question
              </Link>
            </div>
          )}

          {/* Results grid */}
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

          {/* No results + better empty state */}
          {!isFetching && searchQuery && results?.length === 0 && (
            <div className="text-center py-12 max-w-lg mx-auto">
              <SearchX className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-foreground font-medium text-lg mb-2">
                No articles found for "{searchQuery}"
              </p>

              {didYouMean && (
                <p className="text-sm text-muted-foreground mb-4">
                  Did you mean{" "}
                  <button onClick={() => handleDidYouMean(didYouMean)} className="text-primary font-medium hover:underline">
                    {didYouMean}
                  </button>
                  ?
                </p>
              )}

              <p className="text-sm text-muted-foreground mb-6">
                Try different keywords, remove filters, or ask Scout AI.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { setSearchQuery(""); setSearchParams({}); }}
                  className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
                >
                  Clear search
                </button>
                <Link
                  to={`/ask-scout?q=${encodeURIComponent(searchQuery)}`}
                  className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  Ask Scout about "{searchQuery}"
                </Link>
              </div>

              {/* Trending fallback */}
              {trendingArticles && trendingArticles.length > 0 && (
                <div className="mt-12 text-left">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Trending right now
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {trendingArticles.slice(0, 4).map((article: any) => (
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
                        isTrending={true}
                        commentCount={article.comment_count || 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Search;

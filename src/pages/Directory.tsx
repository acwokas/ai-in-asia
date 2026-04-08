import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Building2, Globe, MapPin, ArrowRight, Filter, ChevronRight,
  Star, Users, Briefcase, X, ArrowUpDown,
} from "lucide-react";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "AI Infrastructure", "Computer Vision", "NLP/LLM", "Robotics",
  "Healthcare AI", "Fintech AI", "EdTech AI", "AgriTech AI", "Creative AI",
  "Autonomous Vehicles", "AI Chips/Hardware", "AI Consulting", "Enterprise AI",
  "AI Research Labs", "Foundation Models",
];

const COUNTRIES = [
  "Australia", "Bangladesh", "China", "India", "Indonesia", "Japan",
  "Malaysia", "Philippines", "Singapore", "South Korea", "Taiwan",
  "Thailand", "Vietnam",
];

const FUNDING_STAGES = [
  "Seed", "Series A", "Series B", "Series C", "Series D+",
  "Public", "Subsidiary", "Government",
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured First" },
  { value: "name-asc", label: "Name (A to Z)" },
  { value: "name-desc", label: "Name (Z to A)" },
  { value: "founded-desc", label: "Newest Founded" },
  { value: "founded-asc", label: "Oldest Founded" },
];

const ITEMS_PER_PAGE = 24;

const Directory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFunding, setSelectedFunding] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [page, setPage] = useState(1);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["directory-companies"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_companies")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!companies) return [];
    let result = companies;

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q))
      );
    }

    if (selectedCountry !== "all") {
      result = result.filter((c) => c.country === selectedCountry);
    }

    if (selectedCategory !== "all") {
      result = result.filter((c) => c.category?.includes(selectedCategory));
    }

    if (selectedFunding !== "all") {
      result = result.filter((c) => c.funding_stage === selectedFunding);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "founded-desc":
          return (b.founded_year || 0) - (a.founded_year || 0);
        case "founded-asc":
          return (a.founded_year || 9999) - (b.founded_year || 9999);
        case "featured":
        default:
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [companies, searchQuery, selectedCountry, selectedCategory, selectedFunding, sortBy]);

  const paginated = filtered.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = paginated.length < filtered.length;

  const uniqueCountries = useMemo(() => {
    if (!companies) return 0;
    return new Set(companies.map((c) => c.country)).size;
  }, [companies]);

  const uniqueCategories = useMemo(() => {
    if (!companies) return 0;
    const cats = new Set<string>();
    companies.forEach((c) => c.category?.forEach((cat: string) => cats.add(cat)));
    return cats.size;
  }, [companies]);

  const activeFilters = [selectedCountry, selectedCategory, selectedFunding].filter((f) => f !== "all").length;

  const clearFilters = () => {
    setSelectedCountry("all");
    setSelectedCategory("all");
    setSelectedFunding("all");
    setSearchQuery("");
    setSortBy("featured");
    setPage(1);
  };

  return (
    <>
      <SEOHead
        title="Asia's AI Company Directory | AI in Asia"
        description="The most comprehensive database of AI companies operating across Asia-Pacific. Search and filter by country, category, and funding stage."
        canonical="https://aiinasia.com/directory"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
      />

      <div className="min-h-screen flex flex-col">
        <Header />

        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, hsl(220 20% 6%) 0%, hsl(220 30% 10%) 60%, hsl(220 20% 8%) 100%)",
          }}
        >
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
          <div className="container mx-auto px-4 pt-12 pb-16 md:pt-16 md:pb-20 relative z-10">
            <Breadcrumb className="mb-8">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Directory</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full">
                <Building2 className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold tracking-wide uppercase">AI Company Directory</span>
              </div>
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4 max-w-3xl"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: "linear-gradient(135deg, #FFFFFF 30%, #60A5FA 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Asia's AI Company Directory
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl">
              The most comprehensive database of AI companies operating across Asia-Pacific. Discover innovators, track funding, and explore the ecosystem.
            </p>

            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-8">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-primary font-semibold">{companies?.length ?? "..."}</span> companies
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-primary font-semibold">{uniqueCountries}</span> countries
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" />
                <span className="text-primary font-semibold">{uniqueCategories}</span> categories
              </span>
            </div>

            {/* Search */}
            <div className="max-w-xl">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search companies by name, country, or category..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-10 h-12 bg-card/60 border-border/50 text-foreground placeholder:text-muted-foreground/60 rounded-lg backdrop-blur-sm"
                />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </section>

        {/* Filters + Grid */}
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Filter className="w-4 h-4 text-muted-foreground" />

            <Select value={selectedCountry} onValueChange={(v) => { setSelectedCountry(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedFunding} onValueChange={(v) => { setSelectedFunding(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Funding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {FUNDING_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-[170px] h-9 text-sm">
                <ArrowUpDown className="w-3 h-3 mr-1.5 shrink-0" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}

            <div className="ml-auto">
              <Link to="/directory/submit">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Submit a Company
                </Button>
              </Link>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-6">
            Showing {paginated.length} of {filtered.length} companies
          </p>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : paginated.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map((company) => (
                  <Link
                    key={company.id}
                    to={`/directory/${company.slug}`}
                    className="group block"
                  >
                    <Card className="h-full transition-all hover:border-primary/30 hover:bg-card/80">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          {/* Logo placeholder */}
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {company.logo_url ? (
                              <img
                                src={company.logo_url}
                                alt={company.name}
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                  (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-bold text-primary">${company.name[0]}</span>`;
                                }}
                              />
                            ) : (
                              <span className="text-lg font-bold text-primary">{company.name[0]}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-base group-hover:text-primary transition-colors leading-snug truncate">
                              {company.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {company.city ? `${company.city}, ` : ""}{company.country}
                            </div>
                          </div>
                          {company.is_featured && (
                            <Star className="w-4 h-4 text-amber-400 shrink-0 ml-auto" />
                          )}
                        </div>

                        {company.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{company.description}</p>
                        )}

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {company.category?.slice(0, 3).map((cat: string) => (
                            <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0">{cat}</Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            {company.founded_year && <span>Founded {company.founded_year}</span>}
                            {company.funding_total && (
                              <span className="font-medium text-foreground/70">{company.funding_total}</span>
                            )}
                          </div>
                          {company.funding_stage && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">{company.funding_stage}</Badge>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs text-primary mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          View Profile <ChevronRight className="w-3 h-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-8">
                  <Button variant="outline" size="lg" onClick={() => setPage((p) => p + 1)}>
                    Load More Companies
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({paginated.length} of {filtered.length})
                    </span>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No companies found matching your filters.</p>
                <button onClick={clearFilters} className="text-sm text-primary hover:underline">Clear all filters</button>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <div className="text-center mt-16 py-12 border-t border-border/30">
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Is your company missing?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Submit your AI company for inclusion in our directory.
            </p>
            <Link to="/directory/submit">
              <Button className="gap-2">
                Submit Your Company <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Directory;

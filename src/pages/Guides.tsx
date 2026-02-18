import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { 
  Search, BookOpen, Cpu, Sparkles, ArrowRight, 
  Zap, Target, Wrench, BookMarked, Code, UserCog,
  Package, ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromptsGrid from "@/components/PromptsGrid";
import ToolsGrid from "@/components/ToolsGrid";

const GUIDE_CATEGORIES = [
  { value: "Guide", label: "Guides", icon: Target, color: "from-orange-500 to-amber-500" },
  { value: "Tutorial", label: "Tutorials", icon: BookMarked, color: "from-blue-500 to-cyan-500" },
  { value: "Tools", label: "Tools", icon: Wrench, color: "from-green-500 to-emerald-500", isTools: true },
  { value: "Prompt List", label: "Prompt Lists", icon: Sparkles, color: "from-purple-500 to-pink-500", isPrompts: true },
  { value: "Platform Guide", label: "Platform Guides", icon: Code, color: "from-indigo-500 to-violet-500" },
  { value: "Role Guide", label: "Role Guides", icon: UserCog, color: "from-rose-500 to-red-500" },
  { value: "Prompt Pack", label: "Prompt Packs", icon: Package, color: "from-teal-500 to-cyan-500" },
];

const PLATFORMS = [
  { value: "Generic", label: "All Platforms", accent: "bg-muted" },
  { value: "ChatGPT", label: "ChatGPT", accent: "bg-emerald-500" },
  { value: "Claude", label: "Claude", accent: "bg-orange-500" },
  { value: "Gemini", label: "Gemini", accent: "bg-blue-500" },
  { value: "Midjourney", label: "Midjourney", accent: "bg-purple-500" },
  { value: "Runway", label: "Runway", accent: "bg-pink-500" },
  { value: "ElevenLabs", label: "ElevenLabs", accent: "bg-yellow-500" },
  { value: "Other", label: "Other", accent: "bg-muted" },
];

const LEVELS = [
  { value: "Beginner", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
  { value: "Intermediate", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
  { value: "Advanced", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  { value: "Mixed", color: "text-muted-foreground", bg: "bg-muted" },
];

const Guides = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Read category from URL on mount
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam === "prompts") {
      setSelectedCategory("Prompt List");
    } else if (categoryParam === "tools") {
      setSelectedCategory("Tools");
    }
  }, [searchParams]);

  const isPromptsView = selectedCategory === "Prompt List";
  const isToolsView = selectedCategory === "Tools";

  const { data: guides, isLoading } = useQuery({
    queryKey: ["ai-guides-list"],
    staleTime: 0, // Always fetch fresh data
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, guide_category, primary_platform, level, excerpt, tags, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch tools count for the Tools category card
  const { data: toolsCount } = useQuery({
    queryKey: ["ai-tools-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ai_tools")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch prompts count from top_list articles
  const { data: promptsCount } = useQuery({
    queryKey: ["prompts-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("top_list_items")
        .eq("article_type", "top_lists")
        .eq("status", "published");

      if (error) throw error;
      
      // Count total prompts across all top_list articles
      let total = 0;
      data?.forEach(article => {
        if (Array.isArray(article.top_list_items)) {
          total += article.top_list_items.length;
        }
      });
      return total;
    },
  });

  // Count guides per category
  const categoryCounts = useMemo(() => {
    if (!guides) return {};
    const counts = guides.reduce((acc, guide) => {
      acc[guide.guide_category] = (acc[guide.guide_category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    // Add tools count
    counts["Tools"] = toolsCount || 0;
    return counts;
  }, [guides, toolsCount]);

  const filteredGuides = guides?.filter((guide) => {
    const matchesSearch =
      !searchQuery ||
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || selectedCategory === "Prompt List" || selectedCategory === "Tools" || guide.guide_category === selectedCategory;
    const matchesPlatform = !selectedPlatform || guide.primary_platform === selectedPlatform;
    const matchesLevel = !selectedLevel || guide.level === selectedLevel;

    return matchesSearch && matchesCategory && matchesPlatform && matchesLevel;
  });

  const getLevelStyle = (level: string) => {
    const levelConfig = LEVELS.find(l => l.value === level);
    return levelConfig || LEVELS[3];
  };

  const getPlatformAccent = (platform: string) => {
    const platformConfig = PLATFORMS.find(p => p.value === platform);
    return platformConfig?.accent || "bg-muted";
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedPlatform(null);
    setSelectedLevel(null);
    setSearchQuery("");
  };

  const hasActiveFilters = selectedCategory || selectedPlatform || selectedLevel || searchQuery;
  const visibleCategories = showAllCategories ? GUIDE_CATEGORIES : GUIDE_CATEGORIES.slice(0, 4);

  return (
    <>
      <SEOHead
        title="AI Guides & Prompts - Master AI Tools with Practical Tutorials"
        description="Explore our collection of AI guides, tutorials, prompt packs, and frameworks. Learn to master ChatGPT, Claude, Gemini, Midjourney and more."
        canonical="https://aiinasia.com/guides"
      />

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section - Bold gradient with animated elements */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          
          <div className="container relative mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                <span>{guides?.length || 0} guides and counting</span>
              </div>
              
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                Master AI with
                <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  {isPromptsView ? "Ready-to-Use Prompts" : isToolsView ? "AI Tools" : "Practical Guides"}
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground md:text-2xl leading-relaxed max-w-2xl">
                {isPromptsView 
                  ? "Browse our complete collection of AI prompts for ChatGPT, Claude, Gemini, and more."
                  : isToolsView 
                  ? "Discover powerful AI tools and platforms that are transforming how we work, create, and innovate."
                  : "From beginner tutorials to advanced frameworks. Real techniques, actual examples, no fluff."
                }
              </p>

              {/* Quick Search in Hero */}
              <div className="mt-10 relative max-w-xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={isPromptsView ? "Search prompts..." : "Search for prompts, tutorials, frameworks..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg rounded-xl border-2 border-border bg-background/80 backdrop-blur-sm focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Category Cards - Visual navigation */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Browse by Category</h2>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                  Clear all filters
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visibleCategories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.value;
                const count = categoryCounts[category.value] || 0;
                
                return (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(isSelected ? null : category.value)}
                    className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${category.color} mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    
                    <h3 className="font-semibold text-foreground mb-1">{category.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {category.isPrompts ? `${promptsCount || 0} prompt${promptsCount !== 1 ? "s" : ""}` : category.isTools ? `${categoryCounts["Tools"] || 0} tool${categoryCounts["Tools"] !== 1 ? "s" : ""}` : `${count} guide${count !== 1 ? "s" : ""}`}
                    </p>
                    
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {!showAllCategories && GUIDE_CATEGORIES.length > 4 && (
              <button
                onClick={() => setShowAllCategories(true)}
                className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <span>Show all categories</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        {/* Conditional content based on category */}
        {isPromptsView ? (
          /* Prompts Grid */
          <section className="py-8">
            <div className="container mx-auto px-4">
              <PromptsGrid searchQuery={searchQuery} />
            </div>
          </section>
        ) : isToolsView ? (
          /* Tools Grid */
          <section className="py-8">
            <div className="container mx-auto px-4">
              <ToolsGrid searchQuery={searchQuery} />
            </div>
          </section>
        ) : (
          <>
            {/* Platform & Level Filters - Pill buttons */}
            <section className="py-6 border-b border-border bg-background sticky top-0 z-40">
              <div className="container mx-auto px-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground mr-2">Platform:</span>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.slice(1, 5).map((platform) => (
                      <button
                        key={platform.value}
                        onClick={() => setSelectedPlatform(selectedPlatform === platform.value ? null : platform.value)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedPlatform === platform.value
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${platform.accent}`} />
                        {platform.label}
                      </button>
                    ))}
                  </div>
                  
                  <span className="text-border mx-4 hidden md:block">|</span>
                  
                  <span className="text-sm font-medium text-muted-foreground mr-2">Level:</span>
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.slice(0, 3).map((level) => (
                      <button
                        key={level.value}
                        onClick={() => setSelectedLevel(selectedLevel === level.value ? null : level.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedLevel === level.value
                            ? "bg-primary text-primary-foreground shadow-md"
                            : `${level.bg} ${level.color} hover:opacity-80`
                        }`}
                      >
                        {level.value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Results Header */}
            <section className="pt-8 pb-4">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{filteredGuides?.length ?? 0}</span>
                    {" "}guide{filteredGuides?.length !== 1 ? "s" : ""} 
                    {hasActiveFilters && " matching your filters"}
                  </p>
                </div>
              </div>
            </section>

            {/* Guides Grid - Mixed layout for visual interest */}
            <section className="pb-16">
              <div className="container mx-auto px-4">
                {isLoading ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse rounded-2xl bg-muted h-64" />
                    ))}
                  </div>
                ) : filteredGuides?.length === 0 ? (
                  <div className="py-24 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                      <BookOpen className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold">No guides found</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                      Try adjusting your search or filters to find what you are looking for.
                    </p>
                    <Button onClick={clearFilters} variant="outline">
                      Clear all filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredGuides?.map((guide, index) => {
                      const levelStyle = getLevelStyle(guide.level);
                      const platformAccent = getPlatformAccent(guide.primary_platform);
                      const categoryConfig = GUIDE_CATEGORIES.find(c => c.value === guide.guide_category);
                      const isFeature = index === 0 && !hasActiveFilters;
                      
                      return (
                        <Link 
                          key={guide.id} 
                          to={`/guides/${guide.slug}`}
                          className={`group relative ${isFeature ? "md:col-span-2 lg:col-span-2" : ""}`}
                        >
                          <div className={`relative h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden ${
                            isFeature ? "md:flex md:items-center md:gap-8" : ""
                          }`}>
                            {/* Gradient overlay on hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${categoryConfig?.color || "from-primary to-accent"} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
                            
                            {/* Platform accent bar */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${platformAccent} opacity-60`} />
                            
                            <div className={`relative ${isFeature ? "md:flex-1" : ""}`}>
                              {/* Meta badges */}
                              <div className="flex flex-wrap items-center gap-2 mb-4">
                                <Badge variant="secondary" className="text-xs font-medium">
                                  {guide.guide_category}
                                </Badge>
                                <Badge variant="outline" className={`text-xs ${levelStyle.color}`}>
                                  {guide.level}
                                </Badge>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Cpu className="h-3 w-3" />
                                  {guide.primary_platform}
                                </span>
                              </div>
                              
                              {/* Title */}
                              <h3 className={`font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2 ${
                                isFeature ? "text-2xl md:text-3xl" : "text-lg"
                              }`}>
                                {guide.title}
                              </h3>
                              
                              {/* Excerpt */}
                              {guide.excerpt && (
                                <p className={`text-muted-foreground mb-4 ${isFeature ? "text-base line-clamp-3" : "text-sm line-clamp-2"}`}>
                                  {guide.excerpt}
                                </p>
                              )}
                              
                              {/* Tags */}
                              {guide.tags && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {guide.tags
                                    .split(",")
                                    .slice(0, isFeature ? 5 : 3)
                                    .map((tag, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground"
                                      >
                                        {tag.trim()}
                                      </span>
                                    ))}
                                </div>
                              )}
                              
                              {/* CTA */}
                              <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                                <span>Read guide</span>
                                <ArrowRight className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </>
  );
};

export default Guides;

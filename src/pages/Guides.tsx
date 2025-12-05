import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Search, Filter, BookOpen, Cpu, BarChart3, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const GUIDE_CATEGORIES = [
  "Prompt List",
  "Tutorial",
  "Framework",
  "Use Case",
  "Platform Guide",
  "Role Guide",
  "Prompt Pack",
];

const PLATFORMS = [
  "Generic",
  "ChatGPT",
  "Claude",
  "Gemini",
  "Midjourney",
  "Runway",
  "ElevenLabs",
  "Other",
];

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Mixed"];

const Guides = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const { data: guides, isLoading } = useQuery({
    queryKey: ["ai-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, guide_category, primary_platform, level, excerpt, tags, created_at")
        .order("title", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const filteredGuides = guides?.filter((guide) => {
    const matchesSearch =
      !searchQuery ||
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || guide.guide_category === categoryFilter;

    const matchesPlatform =
      platformFilter === "all" || guide.primary_platform === platformFilter;

    const matchesLevel =
      levelFilter === "all" || guide.level === levelFilter;

    return matchesSearch && matchesCategory && matchesPlatform && matchesLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "ChatGPT":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case "Claude":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "Gemini":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Midjourney":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Helmet>
        <title>AI Guides | AIinASIA</title>
        <meta
          name="description"
          content="Browse our collection of AI guides, tutorials, prompt packs, and frameworks to help you master AI tools."
        />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="border-b border-border bg-muted/30 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                AI Guides
              </h1>
              <p className="text-lg text-muted-foreground">
                Explore our library of AI guides, tutorials, and prompt packs. From beginner
                frameworks to advanced techniques, find the resources you need to work
                smarter with AI.
              </p>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="border-b border-border bg-background py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              {/* Search */}
              <div className="relative flex-1 lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search guides..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="flex flex-wrap gap-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {GUIDE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Cpu className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {PLATFORMS.map((plat) => (
                      <SelectItem key={plat} value={plat}>
                        {plat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-[140px]">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {LEVELS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-muted-foreground">
              {filteredGuides?.length ?? 0} guide{filteredGuides?.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </section>

        {/* Guides Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 w-3/4 rounded bg-muted" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-4 w-full rounded bg-muted" />
                        <div className="h-4 w-2/3 rounded bg-muted" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredGuides?.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No guides found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters to find what you're looking for.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredGuides?.map((guide) => (
                  <Link key={guide.id} to={`/guides/${guide.slug}`}>
                    <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {guide.guide_category}
                          </Badge>
                          <Badge className={`text-xs ${getPlatformColor(guide.primary_platform)}`}>
                            {guide.primary_platform}
                          </Badge>
                          <Badge className={`text-xs ${getLevelColor(guide.level)}`}>
                            {guide.level}
                          </Badge>
                        </div>
                        <CardTitle className="line-clamp-2 text-lg leading-snug">
                          {guide.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {guide.excerpt && (
                          <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                            {guide.excerpt}
                          </p>
                        )}
                        {guide.tags && (
                          <div className="flex flex-wrap gap-1">
                            {guide.tags
                              .split(",")
                              .slice(0, 3)
                              .map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center text-xs text-muted-foreground"
                                >
                                  <Tag className="mr-1 h-3 w-3" />
                                  {tag.trim()}
                                </span>
                              ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Guides;

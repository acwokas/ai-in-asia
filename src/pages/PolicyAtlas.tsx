import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, Globe, FileText, GitCompare } from "lucide-react";
import PolicyMap from "@/components/PolicyMap";

const PolicyAtlas = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: regions, isLoading: regionsLoading, error: regionsError } = useQuery({
    queryKey: ['policy-regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .in('slug', [
          'north-asia', 'asean', 'oceania', 'greater-china', 'anglosphere',
          'europe', 'mena', 'africa', 'latin-america', 'south-asia',
          'pan-pacific', 'pan-asia', 'global-comparison'
        ])
        .order('display_order');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent updates to determine which regions should pulse
  const { data: recentUpdates } = useQuery({
    queryKey: ['recent-policy-updates'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('articles')
        .select('categories!primary_category_id(slug)')
        .eq('article_type', 'policy_article')
        .eq('status', 'published')
        .gte('updated_at', thirtyDaysAgo.toISOString());
      
      if (error) throw error;
      
      // Extract unique region slugs
      const recentRegions = new Set(
        data
          .map(article => article.categories?.slug)
          .filter(Boolean)
      );
      
      return Array.from(recentRegions);
    }
  });

  const { data: latestUpdates } = useQuery({
    queryKey: ['policy-latest-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          authors!inner (
            name,
            slug
          ),
          categories!primary_category_id (
            name,
            slug
          )
        `)
        .eq('article_type', 'policy_article')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">AI Policy Atlas</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Mapping digital governance across the world
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-8">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by keyword, region, or country..."
                className="pl-10 h-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button asChild size="lg">
              <Link to="/ai-policy-atlas/compare" className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Compare
              </Link>
            </Button>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Interactive Map</h2>
          {regions && <PolicyMap regions={regions} recentlyUpdatedRegions={recentUpdates || []} />}
        </div>

        {/* Region Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Explore by Region</h2>
          {regionsError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load regions. Please try again later.
            </div>
          ) : regionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <Card key={i} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-muted animate-pulse rounded" />
                      <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-4 w-full bg-muted animate-pulse rounded mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regions?.map((region) => (
                <Link key={region.id} to={`/ai-policy-atlas/${region.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        {region.name}
                      </CardTitle>
                      <CardDescription>{region.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Latest Updates */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Latest Updates</h2>
          <div className="space-y-4">
            {latestUpdates?.map((article) => (
              <Link key={article.id} to={`/ai-policy-atlas/${article.categories?.slug}/${article.slug}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{article.excerpt}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <Badge variant="secondary">{article.categories?.name}</Badge>
                          <span className="text-muted-foreground">
                            Updated {new Date(article.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* About Section */}
        <div className="mt-16 max-w-3xl mx-auto text-center">
          <p className="text-muted-foreground">
            The AI Policy Atlas tracks artificial intelligence governance frameworks, regulations, 
            and policy developments across regions. Stay informed about how different countries 
            approach AI safety, ethics, and innovation.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PolicyAtlas;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, Globe, FileText, GitCompare, ArrowRight } from "lucide-react";
import PolicyMap from "@/components/PolicyMap";

const PolicyAtlas = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: regions, isLoading: regionsLoading, error: regionsError } = useQuery({
    queryKey: ['policy-regions'],
    queryFn: async () => {
      console.log('Fetching policy regions...');
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .in('slug', [
          'north-asia', 'asean', 'oceania', 'greater-china', 'anglosphere',
          'europe', 'mena', 'africa', 'latin-america', 'south-asia',
          'pan-pacific', 'pan-asia', 'global-comparison'
        ])
        .order('display_order');
      
      if (error) {
        console.error('Error fetching regions:', error);
        throw error;
      }
      console.log('Regions fetched:', data?.length, data);
      return data || [];
    },
    retry: 3,
    staleTime: 300000, // 5 minutes
    refetchOnMount: true,
  });

  // Fetch recent updates to determine which regions should pulse
  const { data: recentUpdates } = useQuery({
    queryKey: ['recent-policy-updates'],
    queryFn: async () => {
      console.log('Fetching recent policy updates...');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('articles')
        .select(`
          primary_category_id,
          categories:primary_category_id(slug)
        `)
        .eq('article_type', 'policy_article')
        .eq('status', 'published')
        .gte('updated_at', thirtyDaysAgo.toISOString());
      
      if (error) {
        console.error('Error fetching recent updates:', error);
        return [];
      }
      
      // Extract unique region slugs
      const recentRegions = new Set<string>();
      data?.forEach(article => {
        if (article.categories && typeof article.categories === 'object' && 'slug' in article.categories) {
          const slug = (article.categories as { slug: string }).slug;
          if (slug) recentRegions.add(slug);
        }
      });
      
      console.log('Recent regions:', Array.from(recentRegions));
      return Array.from(recentRegions);
    },
    retry: 3,
    staleTime: 300000, // 5 minutes
    refetchOnMount: true,
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
        .limit(8);
      
      if (error) throw error;
      return data;
    },
    staleTime: 300000, // 5 minutes
  });

  const { data: regionArticleCounts } = useQuery({
    queryKey: ['policy-region-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('article_categories')
        .select(`
          category_id,
          articles!inner(id, article_type, status)
        `)
        .eq('articles.article_type', 'policy_article')
        .eq('articles.status', 'published');

      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(item => {
        counts[item.category_id] = (counts[item.category_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 300000,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="AI Policy Atlas - Mapping Digital Governance"
        description="Explore AI policy, regulation, and governance frameworks across Asia and the world. Compare approaches by region."
        canonical="https://aiinasia.com/ai-policy-atlas"
      />
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
          <h2 className="text-2xl font-bold mb-6">Explore by Region</h2>
          {regionsError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load map: {regionsError.message}
            </div>
          ) : regionsLoading ? (
            <div className="w-full h-[500px] bg-muted animate-pulse rounded-lg" />
          ) : regions && regions.length > 0 ? (
            <PolicyMap regions={regions} recentlyUpdatedRegions={recentUpdates || []} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No regions available. Please check your database connection.
            </div>
          )}
        </div>

        {/* Region Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">All Regions</h2>
          {regionsError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load regions: {regionsError.message}
            </div>
          ) : regionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(12)].map((_, i) => (
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
          ) : regions && regions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regions.map((region) => (
                <Link key={region.id} to={`/ai-policy-atlas/${region.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        {region.name}
                      </CardTitle>
                      <CardDescription>
                        {region.description}
                        {regionArticleCounts?.[region.id] && (
                          <span className="block mt-1 text-xs text-primary font-medium">
                            {regionArticleCounts[region.id]} {regionArticleCounts[region.id] === 1 ? 'entry' : 'entries'}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No regions found. Please check your database.
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
          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link to="/ai-policy-atlas/updates" className="flex items-center gap-2">
                View all policy updates
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* About Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">About the AI Policy Atlas</h2>
          <div className="text-muted-foreground space-y-4 text-center">
            <p>
              The AI Policy Atlas is an editorially curated reference tracking artificial intelligence governance frameworks, regulations, and policy developments across regions. With a particular focus on Asia-Pacific, it covers binding legislation, legislative drafts, voluntary frameworks, and emerging governance approaches.
            </p>
            <p>
              Each country entry follows a consistent structure covering what is changing, who is affected, core principles, business implications, and comparative context. Entries are reviewed and updated as policy landscapes evolve.
            </p>
            <p className="text-sm">
              This resource is maintained by the editorial team at{' '}
              <Link to="/" className="text-primary hover:underline">AI in ASIA</Link>.
              It does not constitute legal advice. For methodology questions or to suggest coverage, please{' '}
              <Link to="/contact" className="text-primary hover:underline">get in touch</Link>.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PolicyAtlas;

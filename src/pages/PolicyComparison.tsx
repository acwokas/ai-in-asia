import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, X, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PolicyComparison = () => {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const { data: regions } = useQuery({
    queryKey: ['policy-regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .in('slug', [
          'north-asia', 'asean', 'oceania', 'greater-china', 'anglosphere',
          'europe', 'mena', 'africa', 'latin-america', 'south-asia'
        ])
        .order('display_order');
      
      if (error) throw error;
      return data;
    }
  });

  // Fixed query: resolve slugs to category IDs first, then fetch articles
  const { data: comparisonData } = useQuery({
    queryKey: ['policy-comparison', selectedRegions],
    queryFn: async () => {
      if (selectedRegions.length === 0) return [];

      // Step 1: Get category IDs for selected region slugs
      const { data: selectedCategories, error: catError } = await supabase
        .from('categories')
        .select('id, slug')
        .in('slug', selectedRegions);

      if (catError) throw catError;
      if (!selectedCategories || selectedCategories.length === 0) return [];

      const categoryIds = selectedCategories.map(c => c.id);
      const slugToId = Object.fromEntries(selectedCategories.map(c => [c.slug, c.id]));

      // Step 2: Get article IDs linked to these categories via junction table
      const { data: articleCategories, error: acError } = await supabase
        .from('article_categories')
        .select('article_id, category_id')
        .in('category_id', categoryIds);

      if (acError) throw acError;
      if (!articleCategories || articleCategories.length === 0) return [];

      const articleIds = Array.from(new Set(articleCategories.map(ac => ac.article_id)));

      // Step 3: Fetch the actual articles
      const { data: articles, error } = await supabase
        .from('articles')
        .select(`
          *,
          categories:primary_category_id (
            name,
            slug
          )
        `)
        .eq('article_type', 'policy_article')
        .eq('status', 'published')
        .in('id', articleIds)
        .order('country', { ascending: true });

      if (error) throw error;

      // Step 4: Group articles by region slug using the junction table mapping
      const idToSlug = Object.fromEntries(selectedCategories.map(c => [c.id, c.slug]));
      const articleToRegions: Record<string, string[]> = {};
      articleCategories.forEach(ac => {
        const slug = idToSlug[ac.category_id];
        if (slug) {
          if (!articleToRegions[ac.article_id]) articleToRegions[ac.article_id] = [];
          articleToRegions[ac.article_id].push(slug);
        }
      });

      // Attach region info to articles
      return (articles || []).map(article => ({
        ...article,
        _regionSlugs: articleToRegions[article.id] || [],
      }));
    },
    enabled: selectedRegions.length > 0
  });

  const addRegion = (regionSlug: string) => {
    if (!selectedRegions.includes(regionSlug) && selectedRegions.length < 4) {
      setSelectedRegions([...selectedRegions, regionSlug]);
    }
  };

  const removeRegion = (regionSlug: string) => {
    setSelectedRegions(selectedRegions.filter(r => r !== regionSlug));
  };

  /** Get all articles for a given region slug */
  const getRegionArticles = (regionSlug: string) => {
    return comparisonData?.filter(article => article._regionSlugs?.includes(regionSlug)) || [];
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Compare Policy Frameworks - AI Policy Atlas"
        description="Compare AI governance approaches across regions. Side-by-side analysis of policy frameworks, regulations, and governance maturity."
        canonical="https://aiinasia.com/ai-policy-atlas/compare"
      />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link to="/ai-policy-atlas" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to AI Policy Atlas
            </Link>
          </Button>
        </div>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Compare Policy Frameworks
          </h1>
          <p className="text-xl text-muted-foreground">
            Select up to 4 regions to compare their AI governance approaches
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Regions to Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              {selectedRegions.map(slug => {
                const region = regions?.find(r => r.slug === slug);
                return (
                  <Badge key={slug} variant="secondary" className="text-sm py-2 px-4">
                    {region?.name}
                    <button
                      onClick={() => removeRegion(slug)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              
              {selectedRegions.length < 4 && (
                <Select onValueChange={addRegion}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions
                      ?.filter(r => !selectedRegions.includes(r.slug))
                      .map(region => (
                        <SelectItem key={region.id} value={region.slug}>
                          {region.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedRegions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {selectedRegions.map(slug => {
              const region = regions?.find(r => r.slug === slug);
              const articles = getRegionArticles(slug);
              
              return (
                <Card key={slug}>
                  <CardHeader>
                    <CardTitle>{region?.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {articles.length > 0 ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {articles.length} {articles.length === 1 ? 'entry' : 'entries'}
                        </p>
                        <div className="space-y-3">
                          {articles.slice(0, 6).map(article => (
                            <div key={article.id} className="space-y-1.5">
                              <Link
                                to={`/ai-policy-atlas/${slug}/${article.slug}`}
                                className="text-sm font-medium hover:text-primary hover:underline transition-colors block leading-snug"
                              >
                                {article.title}
                              </Link>
                              <div className="flex flex-wrap gap-1.5">
                                {article.governance_maturity && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {article.governance_maturity.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {article.country && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {article.country}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {articles.length > 6 && (
                            <p className="text-xs text-muted-foreground">
                              +{articles.length - 6} more
                            </p>
                          )}
                        </div>
                        <Button asChild variant="outline" className="w-full" size="sm">
                          <Link to={`/ai-policy-atlas/${slug}`}>
                            View all entries
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No entries available yet</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedRegions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Start Comparing</h3>
              <p className="text-muted-foreground">
                Select regions above to begin comparing their AI policy frameworks
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PolicyComparison;

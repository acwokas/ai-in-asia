import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, X } from "lucide-react";
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

  const { data: comparisonData } = useQuery({
    queryKey: ['policy-comparison', selectedRegions],
    queryFn: async () => {
      if (selectedRegions.length === 0) return [];
      
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          categories!primary_category_id (
            name,
            slug
          )
        `)
        .eq('article_type', 'policy_article')
        .eq('status', 'published')
        .in('categories.slug', selectedRegions);
      
      if (error) throw error;
      return data;
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

  const getRegionData = (regionSlug: string) => {
    return comparisonData?.find(article => article.categories?.slug === regionSlug);
  };

  return (
    <div className="min-h-screen flex flex-col">
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
              const data = getRegionData(slug);
              
              return (
                <Card key={slug}>
                  <CardHeader>
                    <CardTitle>{region?.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data ? (
                      <>
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Governance Maturity</h4>
                          <Badge variant="outline">
                            {data.governance_maturity?.replace(/_/g, ' ') || 'N/A'}
                          </Badge>
                        </div>
                        
                        {Array.isArray(data.comparison_tables) && data.comparison_tables.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Key Approach</h4>
                            <p className="text-sm text-muted-foreground">
                              {typeof data.comparison_tables[0] === 'object' &&
                               data.comparison_tables[0] !== null &&
                               'rows' in data.comparison_tables[0] &&
                               Array.isArray((data.comparison_tables[0] as any).rows)
                                ? ((data.comparison_tables[0] as any).rows.find((r: any) => r.aspect === 'Approach Type')?.country1 || 'N/A')
                                : 'N/A'}
                            </p>
                          </div>
                        )}
                        
                        <Button asChild variant="outline" className="w-full">
                          <Link to={`/ai-policy-atlas/${slug}/${data.slug}`}>
                            View Details
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No data available</p>
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

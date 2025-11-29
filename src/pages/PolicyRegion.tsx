import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import PolicyBreadcrumbs from "@/components/PolicyBreadcrumbs";

const PolicyRegion = () => {
  const { region } = useParams();

  const { data: regionData } = useQuery({
    queryKey: ['policy-region', region],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', region)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: articles } = useQuery({
    queryKey: ['policy-articles', region],
    queryFn: async () => {
      // First get the category ID for this region
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', region)
        .single();
      
      if (categoryError) throw categoryError;
      if (!categoryData) return [];
      
      // Get articles via the junction table to support multi-category assignments
      const { data: articleCategories, error: acError } = await supabase
        .from('article_categories')
        .select('article_id')
        .eq('category_id', categoryData.id);
      
      if (acError) throw acError;
      if (!articleCategories || articleCategories.length === 0) return [];
      
      const articleIds = articleCategories.map(ac => ac.article_id);
      
      // Then get the full article data
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          authors:author_id (
            name,
            slug
          ),
          categories:primary_category_id (
            name,
            slug
          )
        `)
        .eq('article_type', 'policy_article')
        .eq('status', 'published')
        .in('id', articleIds)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!region
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        {/* Breadcrumbs */}
        <PolicyBreadcrumbs 
          regionName={regionData?.name}
          regionSlug={region}
        />

        {/* Region Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {regionData?.name}
          </h1>
          {regionData?.description && (
            <p className="text-xl text-muted-foreground">
              {regionData.description}
            </p>
          )}
        </div>

        {/* Articles List */}
        <div className="space-y-6">
          {articles && articles.length > 0 ? (
            articles.map((article) => (
              <Link 
                key={article.id} 
                to={`/ai-policy-atlas/${region}/${article.slug}`}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-semibold mb-3">
                          {article.title}
                        </h2>
                        <p className="text-muted-foreground mb-4">
                          {article.excerpt}
                        </p>
                        <div className="flex items-center gap-3 text-sm">
                          {article.governance_maturity && (
                            <Badge variant="secondary">
                              {article.governance_maturity.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {article.country && (
                            <Badge variant="outline">{article.country}</Badge>
                          )}
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
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Articles Yet</h3>
                <p className="text-muted-foreground">
                  Policy articles for this region are coming soon.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PolicyRegion;

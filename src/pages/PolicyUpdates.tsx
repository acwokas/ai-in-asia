import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PolicyBreadcrumbs from "@/components/PolicyBreadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

const PAGE_SIZE = 25;

const PolicyUpdates = () => {
  const [page, setPage] = useState(0);
  const [allArticles, setAllArticles] = useState<any[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['policy-all-updates', page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('articles')
        .select(`
          *,
          authors:author_id (name, slug),
          categories:primary_category_id (name, slug)
        `, { count: 'exact' })
        .eq('article_type', 'policy_article')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      return { articles: data || [], totalCount: count || 0 };
    },
    staleTime: 300000,
  });

  useEffect(() => {
    if (data?.articles) {
      setAllArticles(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newArticles = data.articles.filter(a => !existingIds.has(a.id));
        return [...prev, ...newArticles];
      });
    }
  }, [data]);

  const hasMore = data ? allArticles.length < data.totalCount : false;

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="All Policy Updates - AI Policy Atlas"
        description="Complete timeline of AI governance developments tracked by the AI Policy Atlas."
        canonical="https://aiinasia.com/ai-policy-atlas/updates"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        <PolicyBreadcrumbs regionName="All Updates" regionSlug="updates" />

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">All Policy Updates</h1>
          <p className="text-xl text-muted-foreground">
            Complete timeline of AI governance developments tracked by the Policy Atlas
          </p>
          {data?.totalCount && (
            <p className="text-sm text-muted-foreground mt-2">
              {data.totalCount} {data.totalCount === 1 ? 'entry' : 'entries'} tracked
            </p>
          )}
        </div>

        <div className="space-y-6">
          {allArticles.map((article) => (
            <Link
              key={article.id}
              to={`/ai-policy-atlas/${article.categories?.slug}/${article.slug}`}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold mb-3">{article.title}</h2>
                      <p className="text-muted-foreground mb-4">{article.excerpt}</p>
                      <div className="flex items-center gap-3 text-sm flex-wrap">
                        {article.governance_maturity && (
                          <Badge variant="secondary">
                            {article.governance_maturity.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {article.country && (
                          <Badge variant="outline">{article.country}</Badge>
                        )}
                        {article.categories?.name && (
                          <Badge variant="outline">{article.categories.name}</Badge>
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
          ))}

          {allArticles.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Articles Yet</h3>
                <p className="text-muted-foreground">Policy articles are coming soon.</p>
              </CardContent>
            </Card>
          )}

          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PolicyUpdates;

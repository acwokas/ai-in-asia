import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";

const MigrateCategoryUrls = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading: checkingAdmin } = useAdminRole();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    articlesProcessed: 0,
    redirectsCreated: 0,
    urlMappingsUpdated: 0,
    errors: [] as string[],
  });
  const [isComplete, setIsComplete] = useState(false);

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  const migrateUrls = async () => {
    setIsProcessing(true);
    setStats({
      articlesProcessed: 0,
      redirectsCreated: 0,
      urlMappingsUpdated: 0,
      errors: [],
    });

    try {
      // Fetch all published articles with their category slugs
      const { data: articles, error: fetchError } = await supabase
        .from("articles")
        .select("id, slug, categories:primary_category_id(slug)")
        .eq("status", "published");

      if (fetchError) throw fetchError;
      if (!articles || articles.length === 0) {
        toast({
          title: "No articles found",
          description: "No published articles to migrate.",
        });
        setIsProcessing(false);
        return;
      }

      const redirectsToCreate = [];
      const errors = [];

      for (const article of articles) {
        const categorySlug = (article.categories as any)?.slug || "uncategorized";
        const oldPath = `/article/${article.slug}`;
        const newPath = `/${categorySlug}/${article.slug}`;

        // Check if redirect already exists
        const { data: existingRedirect } = await supabase
          .from("redirects")
          .select("id")
          .eq("from_path", oldPath)
          .maybeSingle();

        if (!existingRedirect) {
          redirectsToCreate.push({
            from_path: oldPath,
            to_path: newPath,
            status_code: 301,
          });
        }

        setStats((prev) => ({
          ...prev,
          articlesProcessed: prev.articlesProcessed + 1,
        }));
      }

      // Bulk insert redirects
      if (redirectsToCreate.length > 0) {
        const { error: redirectError } = await supabase
          .from("redirects")
          .insert(redirectsToCreate);

        if (redirectError) {
          errors.push(`Redirect creation error: ${redirectError.message}`);
        } else {
          setStats((prev) => ({
            ...prev,
            redirectsCreated: redirectsToCreate.length,
          }));
        }
      }

      // Update url_mappings table and old WordPress redirects
      const { data: urlMappings } = await supabase
        .from("url_mappings")
        .select("id, article_id, old_slug, new_slug, old_url");

      if (urlMappings && urlMappings.length > 0) {
        for (const mapping of urlMappings) {
          if (mapping.article_id) {
            const article = articles.find((a) => a.id === mapping.article_id);
            if (article) {
              const categorySlug = (article.categories as any)?.slug || "uncategorized";
              const newUrl = `/${categorySlug}/${mapping.new_slug}`;

              // Update url_mapping
              await supabase
                .from("url_mappings")
                .update({ 
                  new_url: newUrl,
                  redirect_created: true 
                })
                .eq("id", mapping.id);

              // Update existing redirect from old WordPress URL to point to new category URL
              if (mapping.old_slug) {
                const { data: existingRedirect } = await supabase
                  .from("redirects")
                  .select("id")
                  .eq("from_path", `/${mapping.old_slug}`)
                  .maybeSingle();

                if (existingRedirect) {
                  // Update existing redirect to new category URL
                  await supabase
                    .from("redirects")
                    .update({ to_path: newUrl })
                    .eq("id", existingRedirect.id);
                } else {
                  // Create new redirect from old WordPress URL if it doesn't exist
                  await supabase
                    .from("redirects")
                    .insert({
                      from_path: `/${mapping.old_slug}`,
                      to_path: newUrl,
                      status_code: 301,
                    });
                }
              }

              setStats((prev) => ({
                ...prev,
                urlMappingsUpdated: prev.urlMappingsUpdated + 1,
              }));
            }
          }
        }
      }

      setStats((prev) => ({ ...prev, errors }));
      setIsComplete(true);

      toast({
        title: "Migration Complete!",
        description: `Created ${redirectsToCreate.length} redirects and updated ${urlMappings?.length || 0} URL mappings.`,
      });
    } catch (error: any) {
      toast({
        title: "Migration Error",
        description: error.message,
        variant: "destructive",
      });
      setStats((prev) => ({
        ...prev,
        errors: [...prev.errors, error.message],
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="headline text-4xl mb-4">Migrate to Category URLs</h1>
          <p className="text-muted-foreground text-lg">
            This tool will create 301 redirects from old <code className="bg-muted px-2 py-1 rounded">/article/slug</code> URLs to new <code className="bg-muted px-2 py-1 rounded">/category/slug</code> URLs for all published articles, and update existing WordPress URL mappings to point to the new structure.
          </p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">What this will do:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <span>Create 301 redirects from <code>/article/slug</code> to <code>/category/slug</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <span>Update old WordPress URL redirects to point to new category URLs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <span>Update existing URL mappings to use new structure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <span>Preserve SEO value with proper 301 redirects</span>
                  </li>
                </ul>
              </div>
            </div>

            {!isProcessing && !isComplete && (
              <Button 
                onClick={migrateUrls}
                size="lg"
                className="w-full"
              >
                Start URL Migration
              </Button>
            )}

            {isProcessing && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-lg">Processing articles...</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary">{stats.articlesProcessed}</div>
                    <div className="text-xs text-muted-foreground mt-1">Articles Processed</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary">{stats.redirectsCreated}</div>
                    <div className="text-xs text-muted-foreground mt-1">Redirects Created</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-primary">{stats.urlMappingsUpdated}</div>
                    <div className="text-xs text-muted-foreground mt-1">Mappings Updated</div>
                  </div>
                </div>
              </div>
            )}

            {isComplete && (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-3 py-6 text-green-600">
                  <CheckCircle className="h-8 w-8" />
                  <span className="text-xl font-semibold">Migration Complete!</span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.articlesProcessed}</div>
                    <div className="text-xs text-muted-foreground mt-1">Articles Processed</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.redirectsCreated}</div>
                    <div className="text-xs text-muted-foreground mt-1">Redirects Created</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.urlMappingsUpdated}</div>
                    <div className="text-xs text-muted-foreground mt-1">Mappings Updated</div>
                  </div>
                </div>

                {stats.errors.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-start gap-2 text-destructive mb-2">
                      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <span className="font-semibold">Errors Encountered:</span>
                    </div>
                    <ul className="space-y-1 text-sm ml-7">
                      {stats.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/redirects")}
                    className="flex-1"
                  >
                    View Redirects
                  </Button>
                  <Button 
                    onClick={() => navigate("/admin")}
                    className="flex-1"
                  >
                    Back to Admin
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="mt-8 p-6 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Important Notes
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• This operation is safe to run multiple times - it won't create duplicate redirects</li>
            <li>• All redirects use 301 status code (permanent redirect) for SEO preservation</li>
            <li>• Both new <code>/article/slug</code> and old WordPress URLs will redirect to new structure</li>
            <li>• External links to old URLs will automatically redirect to new structure</li>
            <li>• You can manage redirects manually at <a href="/redirects" className="text-primary hover:underline">/redirects</a></li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default MigrateCategoryUrls;

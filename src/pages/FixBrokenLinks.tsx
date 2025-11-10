import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon, AlertTriangle, CheckCircle2, Home } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import Header from "@/components/Header";

const FixBrokenLinks = () => {
  const [scanResults, setScanResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check admin status
  const { data: isAdmin } = useQuery({
    queryKey: ['admin-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      return data;
    },
  });

  // Scan for broken links
  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fix-broken-internal-links', {
        body: { dryRun: true }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setScanResults(data);
      toast({
        title: "Scan Complete",
        description: `Found ${data.articlesWithBrokenLinks} articles with broken links`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fix broken links
  const fixMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fix-broken-internal-links', {
        body: { dryRun: false }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setScanResults(data);
      toast({
        title: "Links Fixed",
        description: `Fixed broken links in ${data.articlesWithBrokenLinks} articles`,
      });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin">Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Fix Broken Links</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Fix Broken Internal Links</h1>
          <p className="text-muted-foreground">
            Scan and repair internal links that are missing category slugs
          </p>
        </div>

        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>What This Tool Does</AlertTitle>
          <AlertDescription>
            This tool finds internal links with incorrect format (e.g., <code>/article-slug</code>) 
            and fixes them to include the category (e.g., <code>/category/article-slug</code>). 
            This prevents 404 errors when users click on internal links.
          </AlertDescription>
        </Alert>

        {/* Scan & Fix Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Scan & Fix</CardTitle>
            <CardDescription>
              First scan to see what needs fixing, then apply the fixes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending || fixMutation.isPending}
                className="flex-1"
              >
                {scanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <LinkIcon className="mr-2 h-4 w-4" />
                Scan for Broken Links
              </Button>
              
              {scanResults && scanResults.articlesWithBrokenLinks > 0 && (
                <Button
                  onClick={() => fixMutation.mutate()}
                  disabled={fixMutation.isPending || scanMutation.isPending}
                  variant="default"
                  className="flex-1"
                >
                  {fixMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Fix All Broken Links
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {scanResults && (
          <Card>
            <CardHeader>
              <CardTitle>
                {scanResults.dryRun ? 'Scan Results' : 'Fix Results'}
              </CardTitle>
              <CardDescription>
                {scanResults.dryRun 
                  ? `Found ${scanResults.articlesWithBrokenLinks} articles with broken links out of ${scanResults.articlesChecked} checked`
                  : `Fixed broken links in ${scanResults.articlesWithBrokenLinks} articles`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scanResults.articlesWithBrokenLinks === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>All Good!</AlertTitle>
                  <AlertDescription>
                    No broken internal links found. All links are properly formatted.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {scanResults.results?.map((result: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{result.title}</CardTitle>
                              <CardDescription className="text-sm">
                                Article ID: {result.id}
                              </CardDescription>
                            </div>
                            <Badge variant={result.status === 'fixed' ? 'default' : 'secondary'}>
                              {result.linksFixed} {result.linksFixed === 1 ? 'link' : 'links'} {result.status === 'fixed' ? 'fixed' : 'to fix'}
                            </Badge>
                          </div>
                        </CardHeader>
                        {result.examples && result.examples.length > 0 && (
                          <CardContent className="pt-0">
                            <div className="text-sm space-y-2">
                              <div className="font-medium">Example fixes:</div>
                              {result.examples.map((example: any, exIdx: number) => (
                                <div key={exIdx} className="pl-4 border-l-2 border-muted space-y-1">
                                  <div className="text-destructive">
                                    ❌ <code className="text-xs">{example.broken}</code>
                                  </div>
                                  <div className="text-green-600">
                                    ✅ <code className="text-xs">{example.fixed}</code>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FixBrokenLinks;
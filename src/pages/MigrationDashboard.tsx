import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Upload, Image as ImageIcon, FileText, CheckCircle2, XCircle, Clock, Settings, Home } from "lucide-react";
import MigrationGuide from "@/components/MigrationGuide";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function MigrationDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    setLoading(false);
  };

  const { data: migrationLogs } = useQuery({
    queryKey: ["migration-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("migration_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !loading,
  });

  const { data: urlMappings } = useQuery({
    queryKey: ["url-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("url_mappings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !loading,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Badge>;
      case "completed_with_errors":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Errors</Badge>;
      case "in_progress":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />In Progress</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6 max-w-6xl mx-auto">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="inline-flex items-center gap-1">
                  <Home className="h-3 w-3" />
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
              <BreadcrumbPage>Migration Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Migration Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor and manage the article migration process
            </p>
          </div>

          <div className="mb-6">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Migration Workflow:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Import articles using Bulk Import</li>
                  <li>Migrate images using Image Migration</li>
                  <li>Create redirects using Bulk Redirects</li>
                  <li>Update internal links using Content Processor</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>

          <div className="mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>📚 Getting Started</CardTitle>
                <CardDescription>
                  View the comprehensive guide for CSV format, WordPress export instructions, and migration best practices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MigrationGuide />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 1: Map Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/admin/category-mapper">
                  <Button className="w-full" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Category Mapper
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 2: Articles</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/admin/bulk-import">
                  <Button className="w-full" variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Import
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 3: Images</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/admin/image-migration">
                  <Button className="w-full" variant="outline">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Image Migration
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 4: Redirects</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/admin/bulk-redirects">
                  <Button className="w-full" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Bulk Redirects
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 5: Links</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/admin/content-processor">
                  <Button className="w-full" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Process Content
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 6: Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/admin/bulk-comments">
                  <Button className="w-full" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Comments
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 7: TL;DR</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/admin/generate-tldr">
                  <Button className="w-full" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Generate TL;DR
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Step 8: Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/admin/assign-categories">
                  <Button className="w-full" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Assign Categories
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Migration Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Logs:</span>
                    <span className="font-semibold">{migrationLogs?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">URL Mappings:</span>
                    <span className="font-semibold">{urlMappings?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Imported:</span>
                    <span className="font-semibold">
                      {migrationLogs?.reduce((sum, log) => sum + (log.successful_records || 0), 0) || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {migrationLogs?.slice(0, 3).map((log) => (
                    <div key={log.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="capitalize">{log.operation_type}</span>
                        {getStatusBadge(log.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Migration Logs</CardTitle>
              <CardDescription>Recent migration operations and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {migrationLogs?.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold capitalize">{log.operation_type}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total:</span>{" "}
                        <span className="font-semibold">{log.total_records}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Success:</span>{" "}
                        <span className="font-semibold text-green-600">{log.successful_records}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span>{" "}
                        <span className="font-semibold text-red-600">{log.failed_records}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>URL Mappings</CardTitle>
              <CardDescription>
                Recent URL mappings for migrated content (showing last 20)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {urlMappings?.slice(0, 20).map((mapping) => (
                  <div key={mapping.id} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1">
                      <p className="text-sm font-mono text-muted-foreground">{mapping.old_slug}</p>
                      <p className="text-sm font-mono">{mapping.new_slug}</p>
                    </div>
                    <Badge variant={mapping.redirect_created ? "default" : "secondary"}>
                      {mapping.redirect_created ? "Redirect Created" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
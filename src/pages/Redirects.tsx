import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, ExternalLink, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  created_at: string;
}

const Redirects = () => {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState(301);
  
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchRedirects();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchRedirects = async () => {
    try {
      const { data, error } = await supabase
        .from('redirects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRedirects(data || []);
    } catch (error) {
      console.error("Error fetching redirects:", error);
      toast.error("Error", { description: "Failed to load redirects" });
    } finally {
      setLoading(false);
    }
  };

  const addRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromPath || !toPath) {
      toast.error("Error", { description: "Please fill in all required fields" });
      return;
    }

    try {
      const { error } = await supabase
        .from('redirects')
        .insert({
          from_path: fromPath,
          to_path: toPath,
          status_code: statusCode,
        });

      if (error) throw error;

      toast.success("Success", { description: "Redirect added successfully" });

      setFromPath("");
      setToPath("");
      setStatusCode(301);
      fetchRedirects();
    } catch (error) {
      console.error("Error adding redirect:", error);
      toast.error("Error", { description: error instanceof Error ? error.message : "Failed to add redirect" });
    }
  };

  const deleteRedirect = async (id: string) => {
    try {
      const { error } = await supabase
        .from('redirects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Success", { description: "Redirect deleted successfully" });

      fetchRedirects();
    } catch (error) {
      console.error("Error deleting redirect:", error);
      toast.error("Error", { description: "Failed to delete redirect" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <Breadcrumb className="mb-6">
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
              <BreadcrumbPage>Redirects</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="mb-8">
          <h1 className="headline text-4xl mb-2">Redirect Manager</h1>
          <p className="text-muted-foreground">
            Manage URL redirects for SEO and site migrations
          </p>
        </div>

        {/* Add Redirect Form */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">Add New Redirect</h2>
          <form onSubmit={addRedirect} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  From Path *
                </label>
                <Input
                  value={fromPath}
                  onChange={(e) => setFromPath(e.target.value)}
                  placeholder="/old-url"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  To Path *
                </label>
                <Input
                  value={toPath}
                  onChange={(e) => setToPath(e.target.value)}
                  placeholder="/new-url"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Status Code
              </label>
              <select
                value={statusCode}
                onChange={(e) => setStatusCode(Number(e.target.value))}
                className="w-full border border-border rounded-md p-2 bg-background"
              >
                <option value={301}>301 - Permanent Redirect</option>
                <option value={302}>302 - Temporary Redirect</option>
              </select>
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Add Redirect
            </Button>
          </form>
        </div>

        {/* Redirects List */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-6 border-b border-border">
            <h2 className="font-semibold text-lg">Active Redirects</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading redirects...
            </div>
          ) : redirects.length === 0 ? (
            <div className="p-8 text-center">
              <ExternalLink className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No redirects configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first redirect above
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {redirects.map((redirect) => (
                <div key={redirect.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {redirect.from_path}
                      </code>
                      <span className="text-muted-foreground">→</span>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {redirect.to_path}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        ({redirect.status_code})
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRedirect(redirect.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">About Redirects</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Use 301 redirects for permanent URL changes</li>
            <li>• Use 302 redirects for temporary changes</li>
            <li>• Redirects preserve SEO value when migrating content</li>
            <li>• Test redirects before deploying to production</li>
          </ul>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Redirects;

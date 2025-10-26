import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Home, Star, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EditorsPickManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .or("role.eq.admin,role.eq.editor");

    if (!data || data.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: editorsPicks } = useQuery({
    queryKey: ["editors-picks-all"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editors_picks")
        .select(`
          *,
          articles (
            id,
            title,
            slug,
            featured_image_url,
            categories:primary_category_id (name, slug)
          )
        `);
      if (error) throw error;
      return data;
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ["article-search", searchQuery],
    enabled: isAdmin === true && dialogOpen && searchQuery.length > 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          featured_image_url,
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .ilike("title", `%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const handleSetEditorsPick = async (articleId: string) => {
    if (!selectedLocation) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("editors_picks")
        .upsert({
          location: selectedLocation,
          article_id: articleId,
          created_by: user?.id,
        }, {
          onConflict: 'location'
        });

      if (error) throw error;

      toast({
        title: "Editor's Pick Updated",
        description: "The editor's pick has been set successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["editors-picks-all"] });
      queryClient.invalidateQueries({ queryKey: ["editors-pick-homepage"] });
      queryClient.invalidateQueries({ queryKey: ["editors-pick"] });
      setDialogOpen(false);
      setSearchQuery("");
      setSelectedLocation(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set editor's pick",
        variant: "destructive",
      });
    }
  };

  const handleRemoveEditorsPick = async (location: string) => {
    if (!confirm("Are you sure you want to remove this editor's pick?")) return;

    try {
      const { error } = await supabase
        .from("editors_picks")
        .delete()
        .eq("location", location);

      if (error) throw error;

      toast({
        title: "Editor's Pick Removed",
        description: "The editor's pick has been removed successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["editors-picks-all"] });
      queryClient.invalidateQueries({ queryKey: ["editors-pick-homepage"] });
      queryClient.invalidateQueries({ queryKey: ["editors-pick"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove editor's pick",
        variant: "destructive",
      });
    }
  };

  const openDialog = (location: string) => {
    setSelectedLocation(location);
    setDialogOpen(true);
    setSearchQuery("");
  };

  const getEditorsPick = (location: string) => {
    return editorsPicks?.find(pick => pick.location === location);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const locations = [
    { key: "homepage", label: "Homepage" },
    ...(categories?.map(cat => ({ key: cat.slug, label: cat.name })) || [])
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary inline-flex items-center gap-1">
            <Home className="h-3 w-3" />
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link to="/admin" className="hover:text-primary">Admin</Link>
          <span className="mx-2">›</span>
          <span>Editor's Picks</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-8 w-8 text-primary fill-primary" />
            <h1 className="headline text-4xl">Editor's Picks Manager</h1>
          </div>
          <p className="text-muted-foreground">
            Select featured articles for the homepage and each category
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(location => {
            const pick = getEditorsPick(location.key);
            const article = pick?.articles as any;
            
            return (
              <Card key={location.key} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {location.label}
                    {pick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEditorsPick(location.key)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {pick ? "Current selection" : "No editor's pick set"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {article ? (
                    <div className="space-y-3">
                      <div className="aspect-video overflow-hidden rounded-lg">
                        <img 
                          src={article.featured_image_url || "/placeholder.svg"}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="font-semibold text-sm line-clamp-2">
                        {article.title}
                      </h3>
                      <Button
                        onClick={() => openDialog(location.key)}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        Change Selection
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => openDialog(location.key)}
                      variant="outline"
                      className="w-full"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Set Editor's Pick
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Editor's Pick</DialogTitle>
            <DialogDescription>
              Search for an article to feature in {locations.find(l => l.key === selectedLocation)?.label}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {searchQuery.length > 2 && (
              <div className="space-y-2">
                {searchResults?.map((article: any) => (
                  <Card
                    key={article.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSetEditorsPick(article.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded">
                          <img
                            src={article.featured_image_url || "/placeholder.svg"}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold line-clamp-2 mb-1">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {article.categories?.name || "Uncategorized"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {searchResults?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No articles found
                  </p>
                )}
              </div>
            )}

            {searchQuery.length <= 2 && (
              <p className="text-center text-muted-foreground py-4">
                Type at least 3 characters to search
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditorsPickManager;

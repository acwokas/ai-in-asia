import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Home, Search, Filter, Edit, Trash2, Eye, Plus, Pin, Globe, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Articles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteArticle, setDeleteArticle] = useState<{ id: string; title: string } | null>(null);

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

  const { data: articles, isLoading, refetch } = useQuery({
    queryKey: ["articles-list", searchQuery, statusFilter, typeFilter, categoryFilter, authorFilter, sortBy, sortOrder],
    enabled: isAdmin === true,
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          status,
          created_at,
          updated_at,
          published_at,
          scheduled_for,
          view_count,
          article_type,
          author_id,
          primary_category_id,
          sticky,
          featured_on_homepage,
          preview_code,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `);

      // Apply filters
      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      if (typeFilter !== "all") {
        query = query.eq("article_type", typeFilter as any);
      }

      if (categoryFilter === "no-category") {
        query = query.is("primary_category_id", null);
      } else if (categoryFilter !== "all") {
        query = query.eq("primary_category_id", categoryFilter);
      }

      if (authorFilter !== "all") {
        query = query.eq("author_id", authorFilter);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-filter"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  const { data: authors } = useQuery({
    queryKey: ["authors-filter"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("authors")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  const handleUpdate = async (articleId: string, field: string, value: any) => {
    try {
      const updateData: any = { [field]: value };
      
      const { error } = await supabase
        .from("articles")
        .update(updateData)
        .eq("id", articleId);

      if (error) throw error;

      toast({
        title: "Article updated",
        description: "The article has been successfully updated.",
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update article",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteArticle) return;

    try {
      const { error } = await supabase
        .from("articles")
        .delete()
        .eq("id", deleteArticle.id);

      if (error) throw error;

      toast({
        title: "Article deleted",
        description: "The article has been successfully deleted.",
      });

      setDeleteArticle(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete article",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      published: "default",
      draft: "secondary",
      review: "outline",
      archived: "destructive",
    };
    return (
      <Badge variant={variants[status] as any}>
        {status}
      </Badge>
    );
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary inline-flex items-center gap-1">
            <Home className="h-3 w-3" />
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link to="/admin" className="hover:text-primary">
            Admin
          </Link>
          <span className="mx-2">›</span>
          <span>All Articles</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="headline text-4xl mb-2">All Articles</h1>
            <p className="text-muted-foreground">
              Manage and organize all your content
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (!confirm("⚠️ WARNING: This will delete ALL articles and related data. This cannot be undone. Are you absolutely sure?")) {
                  return;
                }
                
                try {
                  const { data, error } = await supabase.functions.invoke('delete-all-articles');
                  
                  if (error) throw error;
                  
                  toast({
                    title: "All Articles Deleted",
                    description: data.message || "Successfully deleted all articles.",
                  });
                  
                  refetch();
                } catch (error: any) {
                  toast({
                    title: "Delete Failed",
                    description: error.message,
                    variant: "destructive",
                  });
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Articles
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/publish-all")}>
              <Globe className="h-4 w-4 mr-2" />
              Publish All Drafts
            </Button>
            <Button onClick={() => navigate("/editor")}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Article
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filters & Search
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="unpublished">Unpublished</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Article Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
                <SelectItem value="guide">Guide</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="explainer">Explainer</SelectItem>
                <SelectItem value="podcast">Podcast</SelectItem>
                <SelectItem value="site_furniture">Site Furniture</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="no-category">No Category</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={authorFilter} onValueChange={setAuthorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Author" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Authors</SelectItem>
                {authors?.map((author) => (
                  <SelectItem key={author.id} value={author.id}>
                    {author.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setTypeFilter("all");
                setCategoryFilter("all");
                setAuthorFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Articles Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !articles || articles.length === 0 ? (
            <div className="text-center p-12">
              <p className="text-muted-foreground mb-4">No articles found</p>
              <Button onClick={() => navigate("/editor")}>
                Create your first article
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("title")}
                  >
                    Title {sortBy === "title" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Author</TableHead>
                   <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("status")}
                  >
                    Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead>Published Date</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("view_count")}
                  >
                    Views {sortBy === "view_count" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-center">View</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Pin className="h-3 w-3" />
                      Sticky
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Globe className="h-3 w-3" />
                      Homepage
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article: any) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium max-w-md">
                      <Input
                        value={article.title}
                        onChange={(e) => handleUpdate(article.id, "title", e.target.value)}
                        className="font-medium"
                      />
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        /{article.slug}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={article.author_id || ""}
                        onValueChange={(value) => handleUpdate(article.id, "author_id", value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select author" />
                        </SelectTrigger>
                        <SelectContent>
                          {authors?.map((author) => (
                            <SelectItem key={author.id} value={author.id}>
                              {author.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={article.primary_category_id || ""}
                        onValueChange={(value) => handleUpdate(article.id, "primary_category_id", value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="capitalize">
                      {article.article_type}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={article.status}
                        onValueChange={(value) => handleUpdate(article.id, "status", value)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="unpublished">Unpublished</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={article.published_at ? new Date(article.published_at).toISOString().split('T')[0] : ""}
                        onChange={(e) => handleUpdate(article.id, "published_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="w-[140px]"
                      />
                    </TableCell>
                    <TableCell>
                      {article.view_count || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {article.status === "published" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View published article"
                          asChild
                        >
                          <Link to={`/${(article.categories as any)?.slug || 'news'}/${article.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : article.preview_code ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Preview draft/scheduled article"
                          asChild
                        >
                          <Link to={`/${(article.categories as any)?.slug || 'news'}/${article.slug}?preview=${article.preview_code}`} target="_blank">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Save first</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={article.sticky || false}
                        onCheckedChange={(checked) => handleUpdate(article.id, "sticky", checked)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={article.featured_on_homepage || false}
                        onCheckedChange={(checked) => handleUpdate(article.id, "featured_on_homepage", checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Full Article"
                          onClick={() => navigate(`/editor?id=${article.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => setDeleteArticle({ id: article.id, title: article.title })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Results count */}
        {articles && articles.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Showing {articles.length} article{articles.length !== 1 ? "s" : ""}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteArticle} onOpenChange={() => setDeleteArticle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteArticle?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Articles;
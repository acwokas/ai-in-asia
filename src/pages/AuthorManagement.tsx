import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, Edit, Trash2, Mail, Globe, Twitter, Linkedin, Home } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

interface AuthorFormData {
  id?: string;
  name: string;
  slug: string;
  bio: string;
  job_title: string;
  email: string;
  avatar_url: string;
  twitter_handle: string;
  linkedin_url: string;
  website_url: string;
}

const AuthorManagement = () => {
  const navigate = useNavigate();
  
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AuthorFormData | null>(null);
  
  const [formData, setFormData] = useState<AuthorFormData>({
    name: "",
    slug: "",
    bio: "",
    job_title: "",
    email: "",
    avatar_url: "",
    twitter_handle: "",
    linkedin_url: "",
    website_url: "",
  });

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
      .eq("role", "admin");

    if (!data || data.length === 0) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    setIsAdmin(true);
  };

  const { data: authors, isLoading } = useQuery({
    queryKey: ["authors-management"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("authors")
        .select("*")
        .order("name");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AuthorFormData) => {
      const { error } = await supabase
        .from("authors")
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Author created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["authors-management"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create author",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AuthorFormData) => {
      const { error } = await supabase
        .from("authors")
        .update(data)
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Author updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["authors-management"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update author",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("authors")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Author deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["authors-management"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Cannot delete author with existing articles",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAuthor) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (author: any) => {
    setEditingAuthor(author);
    setFormData(author);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      bio: "",
      job_title: "",
      email: "",
      avatar_url: "",
      twitter_handle: "",
      linkedin_url: "",
      website_url: "",
    });
    setEditingAuthor(null);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (isAdmin === null || isLoading) {
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
              <BreadcrumbPage>Author Management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="headline text-4xl mb-2">Author Management</h1>
            <p className="text-muted-foreground">
              Manage your content authors and contributors
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Author
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAuthor ? "Edit Author" : "Add New Author"}</DialogTitle>
                <DialogDescription>
                  {editingAuthor ? "Update author information" : "Create a new author profile"}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (!editingAuthor) {
                          setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitter_handle">Twitter Handle</Label>
                    <Input
                      id="twitter_handle"
                      placeholder="@username"
                      value={formData.twitter_handle}
                      onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      type="url"
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAuthor ? "Update Author" : "Create Author"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authors ({authors?.length || 0})</CardTitle>
            <CardDescription>Manage all content authors and their profiles</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authors?.map((author) => (
                  <TableRow key={author.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={author.avatar_url} />
                          <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{author.name}</p>
                          <p className="text-sm text-muted-foreground">@{author.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{author.job_title || "-"}</TableCell>
                    <TableCell>{author.article_count || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {author.email && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`mailto:${author.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {author.twitter_handle && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`https://twitter.com/${author.twitter_handle}`} target="_blank" rel="noopener">
                              <Twitter className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {author.linkedin_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={author.linkedin_url} target="_blank" rel="noopener">
                              <Linkedin className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {author.website_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={author.website_url} target="_blank" rel="noopener">
                              <Globe className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(author)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(author.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AuthorManagement;

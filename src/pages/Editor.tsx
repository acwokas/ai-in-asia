import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import CMSEditor from "@/components/CMSEditor";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home } from "lucide-react";

const Editor = () => {
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get("id");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .or("role.eq.admin,role.eq.editor,role.eq.contributor");

    if (!data || data.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create or edit articles.",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  // Article edit query - already optimized (only runs when editing)
  const { data: article, isLoading } = useQuery({
    queryKey: ["article-edit", articleId],
    enabled: !!articleId && !!user,
    staleTime: 60 * 1000, // 1 minute cache - article data while editing
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) {
        toast({
          title: "Article Not Found",
          description: "This article doesn't exist or you don't have permission to view it.",
          variant: "destructive",
        });
        navigate("/admin");
        return null;
      }
      return data;
    },
  });

  const handleSave = async (data: any) => {
    try {
      if (articleId) {
        // Check if status is changing to published
        const wasPublished = article?.status === 'published';
        const isNowPublished = data.status === 'published';

        const { error } = await supabase
          .from("articles")
          .update({
            ...data,
            updated_by: user.id,
          })
          .eq("id", articleId);

        if (error) throw error;

        // Generate comments if newly published
        if (!wasPublished && isNowPublished) {
          supabase.functions.invoke("generate-article-comments", {
            body: { articleId, batchMode: false }
          }).catch(err => console.error('Comment generation error:', err));
        }

        // Refetch article data to get updated preview_code
        await queryClient.invalidateQueries({ queryKey: ["article-edit", articleId] });

        // Get the article slug and preview code for the preview link
        const { data: savedArticle } = await supabase
          .from("articles")
          .select("slug, status, preview_code, primary_category_id")
          .eq("id", articleId)
          .single();

        // Fetch category separately to avoid relation issues
        let categorySlug = 'uncategorized';
        if (savedArticle?.primary_category_id) {
          const { data: category } = await supabase
            .from("categories")
            .select("slug")
            .eq("id", savedArticle.primary_category_id)
            .single();
          
          if (category) {
            categorySlug = category.slug;
          }
        }
        
        // Build the article URL with preview code if not published
        const articleUrl = savedArticle?.status === 'published' 
          ? `/${categorySlug}/${savedArticle.slug}`
          : `/${categorySlug}/${savedArticle.slug}?preview=${savedArticle.preview_code}`;

        toast({
          title: "Success!",
          description: isNowPublished && !wasPublished 
            ? "Article published! AI comments are being generated." 
            : "Article updated successfully.",
          action: savedArticle ? (
            <button
              onClick={() => window.open(articleUrl, '_blank')}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              {savedArticle.status === 'published' ? 'View Live' : 'Preview'}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
              </svg>
            </button>
          ) : undefined,
        });
      } else {
        const { data: newArticle, error } = await supabase
          .from("articles")
          .insert({
            ...data,
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Generate comments if published
        if (data.status === 'published') {
          supabase.functions.invoke("generate-article-comments", {
            body: { articleId: newArticle.id, batchMode: false }
          }).catch(err => console.error('Comment generation error:', err));
        }

        toast({
          title: "Success!",
          description: data.status === 'published' 
            ? "Article published! AI comments are being generated. Redirecting..." 
            : "Article created successfully. Redirecting to editor...",
        });
        
        // Navigate to edit the newly created article so preview code is available
        setTimeout(() => {
          navigate(`/editor?id=${newArticle.id}`);
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
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
          <span>{articleId ? "Edit Article" : "Create Article"}</span>
        </nav>

        <div className="mb-8">
          <h1 className="headline text-4xl mb-2">
            {articleId ? "Edit Article" : "Create New Article"}
          </h1>
          <p className="text-muted-foreground">
            {articleId ? "Update your article content and settings" : "Write and publish a new article"}
          </p>
        </div>

        <CMSEditor initialData={article} onSave={handleSave} />
      </main>
    </div>
  );
};

export default Editor;

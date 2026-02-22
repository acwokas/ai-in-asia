import { useNavigate, useSearchParams, Link, useParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import CMSEditor from "@/components/CMSEditor";
import { toast } from "sonner";
import { Home } from "lucide-react";
import { calculateReadingTime } from "@/lib/readingTime";

const Editor = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const articleId = params.id || searchParams.get("id");
  const navigate = useNavigate();
  
  const location = useLocation();
  const isInsideAdmin = location.pathname.startsWith('/admin');
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
      toast.error("Access Denied", { description: "You don't have permission to create or edit articles." });
      navigate("/");
    }
  };

  // Article edit query
  const { data: article, isLoading } = useQuery({
    queryKey: ["article-edit", articleId],
    enabled: !!articleId && !!user,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Article Not Found", { description: "This article doesn't exist or you don't have permission to view it." });
        navigate("/admin");
        return null;
      }
      return data;
    },
  });

  const handleSave = useCallback(async (data: any) => {
    try {
      const readingTime = calculateReadingTime(data.content || [], data.title || '');
      
      if (articleId) {
        const wasPublished = article?.status === 'published';
        const isNowPublished = data.status === 'published';

        const { error } = await supabase
          .from("articles")
          .update({
            ...data,
            reading_time_minutes: readingTime,
            updated_by: user.id,
          })
          .eq("id", articleId);

        if (error) throw error;

        if (!wasPublished && isNowPublished) {
          supabase.functions.invoke("generate-article-comments", {
            body: { articleId, batchMode: false }
          }).catch(err => console.error('Comment generation error:', err));
        }

        await queryClient.invalidateQueries({ queryKey: ["article-edit", articleId] });
        await queryClient.invalidateQueries({ queryKey: ["homepage-articles"] });
        await queryClient.invalidateQueries({ queryKey: ["you-may-also-like"] });
        await queryClient.invalidateQueries({ queryKey: ["popular-articles"] });
        await queryClient.invalidateQueries({ queryKey: ["recommendations"] });

        const { data: savedArticle } = await supabase
          .from("articles")
          .select("slug, status, preview_code, primary_category_id")
          .eq("id", articleId)
          .single();

        let categorySlug = 'news';
        if (savedArticle?.primary_category_id) {
          const { data: category } = await supabase
            .from("categories")
            .select("slug")
            .eq("id", savedArticle.primary_category_id)
            .single();
          if (category) categorySlug = category.slug;
        }
        
        const articleUrl = savedArticle?.status === 'published' 
          ? `/${categorySlug}/${savedArticle.slug}`
          : `/${categorySlug}/${savedArticle.slug}?preview=${savedArticle.preview_code}`;

        // Clear localStorage backup on successful save
        if (articleId) {
          localStorage.removeItem(`editor-backup-${articleId}`);
        }

        toast.success("Success!", {
          description: isNowPublished && !wasPublished 
            ? "Article published! AI comments are being generated." 
            : "Article updated successfully.",
          action: savedArticle ? {
            label: savedArticle.status === 'published' ? 'View Live' : 'Preview',
            onClick: () => window.open(articleUrl, '_blank'),
          } : undefined,
        });
      } else {
        const { data: newArticle, error } = await supabase
          .from("articles")
          .insert({
            ...data,
            reading_time_minutes: readingTime,
            created_by: user.id,
            updated_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        if (data.status === 'published') {
          supabase.functions.invoke("generate-article-comments", {
            body: { articleId: newArticle.id, batchMode: false }
          }).catch(err => console.error('Comment generation error:', err));
        }

        await queryClient.invalidateQueries({ queryKey: ["homepage-articles"] });
        await queryClient.invalidateQueries({ queryKey: ["you-may-also-like"] });
        await queryClient.invalidateQueries({ queryKey: ["popular-articles"] });
        await queryClient.invalidateQueries({ queryKey: ["recommendations"] });

        toast.success("Success!", {
          description: data.status === 'published' 
            ? "Article published! AI comments are being generated. Redirecting..." 
            : "Article created successfully. Redirecting to editor...",
        });
        
        setTimeout(() => {
          navigate(`/editor?id=${newArticle.id}`);
        }, 1000);
      }
    } catch (error: any) {
      // Show error with retry button
      toast.error("Save failed", {
        description: error.message,
        action: {
          label: "Retry",
          onClick: () => handleSave(data),
        },
        duration: 10_000,
      });
    }
  }, [articleId, article, user, queryClient, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Ctrl+S → Save — click the Save Article button
      if (e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        const saveBtn = document.querySelector('[data-editor-save]') as HTMLButtonElement | null;
        saveBtn?.click();
      }
      // Ctrl+Shift+P → Toggle Content/Preview
      if (e.key === "P" || (e.key === "p" && e.shiftKey)) {
        e.preventDefault();
        // Click the preview or content tab trigger
        const previewTab = document.querySelector('[data-state][value="preview"]') as HTMLElement | null;
        const contentTab = document.querySelector('[data-state][value="content"]') as HTMLElement | null;
        if (previewTab?.getAttribute("data-state") === "active") {
          contentTab?.click();
        } else {
          previewTab?.click();
        }
      }
      // Ctrl+K → Focus slug field
      if (e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        const slugInput = document.getElementById("slug") as HTMLInputElement | null;
        slugInput?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <div className={isInsideAdmin ? "" : "min-h-screen flex flex-col"}>
      {!isInsideAdmin && <Header />}
      
      <main className={isInsideAdmin ? "container mx-auto px-4 py-8" : "flex-1 container mx-auto px-4 py-8"}>
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

        {isLoading ? (
          <div className="space-y-6">
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
            <div className="h-64 w-full bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ) : (
          <CMSEditor
            initialData={article}
            onSave={handleSave}
          />
        )}
      </main>
    </div>
  );
};

export default Editor;

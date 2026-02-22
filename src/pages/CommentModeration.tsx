import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2, Search, Trash2, CheckCircle, X, Edit, ChevronLeft, ChevronRight,
  Bot, User, MessageSquare, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 25;

interface UnifiedComment {
  id: string;
  content: string;
  date: string;
  authorName: string;
  authorType: "ai" | "user";
  status: "approved" | "pending" | "ai";
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  categorySlug?: string;
}

const CommentModeration = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingComment, setEditingComment] = useState<{ id: string; content: string; type: "ai" | "user" } | null>(null);
  const [editContent, setEditContent] = useState("");
  const queryClient = useQueryClient();

  // ── Fetch AI comments ──
  const { data: aiComments = [], isLoading: loadingAi } = useQuery({
    queryKey: ["moderation-ai-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_generated_comments")
        .select("id, content, comment_date, ai_comment_authors(name), articles(id, title, slug, categories:primary_category_id(slug))")
        .order("comment_date", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any): UnifiedComment => ({
        id: c.id,
        content: c.content,
        date: c.comment_date,
        authorName: c.ai_comment_authors?.name || "AI Author",
        authorType: "ai",
        status: "ai",
        articleId: c.articles?.id || "",
        articleTitle: c.articles?.title || "Unknown",
        articleSlug: c.articles?.slug || "",
        categorySlug: (c.articles?.categories as any)?.slug,
      }));
    },
  });

  // ── Fetch user comments ──
  const { data: userComments = [], isLoading: loadingUser } = useQuery({
    queryKey: ["moderation-user-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, author_name, approved, articles(id, title, slug, categories:primary_category_id(slug))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any): UnifiedComment => ({
        id: c.id,
        content: c.content,
        date: c.created_at,
        authorName: c.author_name || "Anonymous",
        authorType: "user",
        status: c.approved ? "approved" : "pending",
        articleId: c.articles?.id || "",
        articleTitle: c.articles?.title || "Unknown",
        articleSlug: c.articles?.slug || "",
        categorySlug: (c.articles?.categories as any)?.slug,
      }));
    },
  });

  const isLoading = loadingAi || loadingUser;

  // ── Merge + filter + search + paginate ──
  const allComments = useMemo(() => {
    const merged = [...aiComments, ...userComments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return merged;
  }, [aiComments, userComments]);

  const filtered = useMemo(() => {
    let result = allComments;
    if (filter === "pending") result = result.filter(c => c.status === "pending");
    else if (filter === "ai") result = result.filter(c => c.authorType === "ai");
    else if (filter === "approved") result = result.filter(c => c.status === "approved");

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        c => c.authorName.toLowerCase().includes(q) || c.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allComments, filter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const counts = useMemo(() => ({
    all: allComments.length,
    pending: allComments.filter(c => c.status === "pending").length,
    ai: allComments.filter(c => c.authorType === "ai").length,
    approved: allComments.filter(c => c.status === "approved").length,
  }), [allComments]);

  // ── Mutations ──
  const approveUserComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").update({ approved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment approved");
      queryClient.invalidateQueries({ queryKey: ["moderation-user-comments"] });
    },
    onError: () => toast.error("Failed to approve"),
  });

  const deleteComment = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "ai" | "user" }) => {
      const table = type === "ai" ? "ai_generated_comments" : "comments";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment deleted");
      queryClient.invalidateQueries({ queryKey: ["moderation-ai-comments"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-user-comments"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content, type }: { id: string; content: string; type: "ai" | "user" }) => {
      const table = type === "ai" ? "ai_generated_comments" : "comments";
      const { error } = await supabase.from(table).update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment updated");
      setEditingComment(null);
      queryClient.invalidateQueries({ queryKey: ["moderation-ai-comments"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-user-comments"] });
    },
    onError: () => toast.error("Failed to update"),
  });

  // ── Bulk actions ──
  const handleBulkApprove = async () => {
    const ids = [...selected].filter(id => {
      const c = allComments.find(c => c.id === id);
      return c?.authorType === "user" && c?.status === "pending";
    });
    if (ids.length === 0) { toast("No pending user comments selected"); return; }
    for (const id of ids) {
      await supabase.from("comments").update({ approved: true }).eq("id", id);
    }
    toast.success(`Approved ${ids.length} comment${ids.length > 1 ? "s" : ""}`);
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["moderation-user-comments"] });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} comment${selected.size > 1 ? "s" : ""}?`)) return;
    for (const id of selected) {
      const c = allComments.find(c => c.id === id);
      if (!c) continue;
      const table = c.authorType === "ai" ? "ai_generated_comments" : "comments";
      await supabase.from(table).delete().eq("id", id);
    }
    toast.success(`Deleted ${selected.size} comment${selected.size > 1 ? "s" : ""}`);
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["moderation-ai-comments"] });
    queryClient.invalidateQueries({ queryKey: ["moderation-user-comments"] });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map(c => c.id)));
    }
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setPage(0);
    setSelected(new Set());
    setSearchParams(value === "all" ? {} : { filter: value });
  };

  const statusBadge = (c: UnifiedComment) => {
    if (c.status === "approved") return <Badge variant="default" className="text-xs">Approved</Badge>;
    if (c.status === "pending") return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    return <Badge variant="outline" className="text-xs">AI Generated</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comment Moderation</h1>
        <p className="text-muted-foreground text-sm">Manage all user and AI comments in one place.</p>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={handleFilterChange}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="ai">AI ({counts.ai})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + bulk actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by author or content..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkApprove}>
              <CheckCircle className="h-4 w-4 mr-1" /> Approve ({selected.size})
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={paged.length > 0 && selected.size === paged.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="hidden md:table-cell">Comment</TableHead>
                <TableHead className="hidden lg:table-cell">Article</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No comments match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {c.authorType === "ai" ? (
                          <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate max-w-[120px]">{c.authorName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs">
                      <p className="text-sm text-muted-foreground line-clamp-2">{c.content}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <a
                        href={`/${c.categorySlug || "article"}/${c.articleSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1 max-w-[200px] truncate"
                      >
                        {c.articleTitle}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>{statusBadge(c)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(c.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {c.status === "pending" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => approveUserComment.mutate(c.id)}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingComment({ id: c.id, content: c.content, type: c.authorType });
                            setEditContent(c.content);
                          }}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteComment.mutate({ id: c.id, type: c.authorType })}
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingComment} onOpenChange={() => setEditingComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Comment</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={5}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingComment(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editingComment) {
                  updateComment.mutate({ id: editingComment.id, content: editContent, type: editingComment.type });
                }
              }}
              disabled={updateComment.isPending}
            >
              {updateComment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommentModeration;

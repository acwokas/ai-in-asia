import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Home, Plus, Search, Pencil, Copy, Trash2, Loader2, BookOpen } from "lucide-react";

const AdminGuides = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);

  const { data: guides, isLoading } = useQuery({
    queryKey: ["admin-guides", search, statusFilter, pillarFilter],
    queryFn: async () => {
      let query = supabase.from("ai_guides").select("id, title, slug, status, pillar, difficulty, read_time_minutes, updated_at, guide_category, level").order("updated_at", { ascending: false });
      if (search) query = query.ilike("title", `%${search}%`);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (pillarFilter !== "all") query = query.eq("pillar", pillarFilter);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this guide?")) return;
    const { error } = await supabase.from("ai_guides").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Guide deleted" });
    queryClient.invalidateQueries({ queryKey: ["admin-guides"] });
  };

  const handleDuplicate = async (guideId: string) => {
    const { data: original } = await supabase.from("ai_guides").select("*").eq("id", guideId).single();
    if (!original) return;
    const { id, created_at, updated_at, published_at, preview_code, ...rest } = original as any;
    const { error } = await supabase.from("ai_guides").insert({ ...rest, title: `${rest.title} (Copy)`, slug: `${rest.slug}-copy-${Date.now()}`, status: "draft" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Guide duplicated" });
    queryClient.invalidateQueries({ queryKey: ["admin-guides"] });
  };

  const handleBulkAction = async (action: string) => {
    if (!selected.length) return;
    if (action === "delete" && !confirm(`Delete ${selected.length} guides?`)) return;
    for (const id of selected) {
      if (action === "publish") await supabase.from("ai_guides").update({ status: "published" }).eq("id", id);
      else if (action === "archive") await supabase.from("ai_guides").update({ status: "archived" }).eq("id", id);
      else if (action === "delete") await supabase.from("ai_guides").delete().eq("id", id);
    }
    setSelected([]);
    queryClient.invalidateQueries({ queryKey: ["admin-guides"] });
    toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} completed`, description: `${selected.length} guides updated.` });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { published: "bg-green-500", draft: "bg-muted-foreground/50", archived: "bg-amber-500" };
    return <Badge className={`${colors[status] || "bg-muted"} text-white text-xs`}>{status || "draft"}</Badge>;
  };

  const pillarBadge = (pillar: string) => {
    const colors: Record<string, string> = { learn: "bg-blue-500", prompts: "bg-purple-500", toolbox: "bg-orange-500" };
    return pillar ? <Badge className={`${colors[pillar] || "bg-muted"} text-white text-xs`}>{pillar}</Badge> : null;
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary inline-flex items-center gap-1"><Home className="h-3 w-3" />Home</Link>
        <span className="mx-2">-</span>
        <Link to="/admin" className="hover:text-primary">Admin</Link>
        <span className="mx-2">-</span>
        <span>Manage Guides</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Manage Guides</h1>
          <p className="text-muted-foreground">{guides?.length || 0} guides total</p>
        </div>
        <Button onClick={() => navigate("/guide-editor")} className="gap-2">
          <Plus className="h-4 w-4" /> Create New Guide
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search guides..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pillarFilter} onValueChange={setPillarFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                <SelectItem value="learn">Learn</SelectItem>
                <SelectItem value="prompts">Prompts</SelectItem>
                <SelectItem value="toolbox">Toolbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("publish")}>Publish</Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("archive")}>Archive</Button>
          <Button variant="destructive" size="sm" onClick={() => handleBulkAction("delete")}>Delete</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : guides?.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">No guides found</p>
          <Button onClick={() => navigate("/guide-editor")}>Create your first guide</Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left w-8"><Checkbox checked={selected.length === guides?.length} onCheckedChange={c => setSelected(c ? (guides || []).map(g => g.id) : [])} /></th>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left hidden md:table-cell">Pillar</th>
                <th className="p-3 text-left hidden md:table-cell">Status</th>
                <th className="p-3 text-left hidden lg:table-cell">Difficulty</th>
                <th className="p-3 text-left hidden lg:table-cell">Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {guides?.map(guide => (
                <tr key={guide.id} className="hover:bg-muted/20">
                  <td className="p-3"><Checkbox checked={selected.includes(guide.id)} onCheckedChange={c => setSelected(c ? [...selected, guide.id] : selected.filter(s => s !== guide.id))} /></td>
                  <td className="p-3 font-medium max-w-[300px] truncate">{guide.title}</td>
                  <td className="p-3 hidden md:table-cell">{pillarBadge(guide.pillar as string)}</td>
                  <td className="p-3 hidden md:table-cell">{statusBadge(guide.status as string)}</td>
                  <td className="p-3 hidden lg:table-cell capitalize">{guide.difficulty || guide.level || "-"}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{guide.updated_at ? new Date(guide.updated_at).toLocaleDateString("en-GB") : "-"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/guide-editor/${guide.id}`)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(guide.id)}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(guide.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default AdminGuides;

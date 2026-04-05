import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, BookOpen } from "lucide-react";

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category: string;
  related_terms: string[] | null;
  created_at: string;
}

interface TermFormData {
  term: string;
  definition: string;
  category: string;
  related_terms: string;
}

const emptyForm: TermFormData = { term: "", definition: "", category: "", related_terms: "" };

export default function AdminGlossary() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TermFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ["admin-glossary-terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glossary_terms")
        .select("*")
        .order("term");
      if (error) throw error;
      return data as GlossaryTerm[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return terms;
    const q = search.toLowerCase();
    return terms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [terms, search]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    terms.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [terms]);

  const saveMutation = useMutation({
    mutationFn: async (data: TermFormData & { id?: string }) => {
      const payload = {
        term: data.term.trim(),
        definition: data.definition.trim(),
        category: data.category.trim(),
        related_terms: data.related_terms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (data.id) {
        const { error } = await supabase
          .from("glossary_terms")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("glossary_terms").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-glossary-terms"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Term updated" : "Term added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("glossary_terms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-glossary-terms"] });
      setDeleteId(null);
      toast({ title: "Term deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (t: GlossaryTerm) => {
    setEditingId(t.id);
    setForm({
      term: t.term,
      definition: t.definition,
      category: t.category,
      related_terms: (t.related_terms || []).join(", "),
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Glossary Manager</h1>
            <p className="text-sm text-muted-foreground">
              {terms.length} terms across {categories.length} categories
            </p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Term
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search terms, definitions, categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Term</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead>Definition</TableHead>
              <TableHead className="w-[180px]">Related Terms</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {search ? "No matching terms" : "No glossary terms yet"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.term}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {t.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {t.definition}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(t.related_terms || []).slice(0, 3).map((rt) => (
                        <Badge key={rt} variant="outline" className="text-xs">
                          {rt}
                        </Badge>
                      ))}
                      {(t.related_terms || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(t.related_terms || []).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(t)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(t.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {terms.length} terms
      </p>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Term" : "Add New Term"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Term</label>
              <Input
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                placeholder="e.g. Neural Network"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Machine Learning"
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {categories.map(([cat]) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Definition</label>
              <Textarea
                value={form.definition}
                onChange={(e) => setForm({ ...form, definition: e.target.value })}
                placeholder="Plain-language definition..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Related Terms{" "}
                <span className="text-muted-foreground font-normal">(comma-separated)</span>
              </label>
              <Input
                value={form.related_terms}
                onChange={(e) => setForm({ ...form, related_terms: e.target.value })}
                placeholder="e.g. Deep Learning, CNN, RNN"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })}
              disabled={!form.term.trim() || !form.definition.trim() || !form.category.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add Term"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Term</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this term? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

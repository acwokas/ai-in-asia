import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Building2, User, Clock, MessageSquare } from "lucide-react";

const STATUS_OPTIONS = ["new", "contacted", "in_progress", "closed"] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-primary/20 text-primary",
  closed: "bg-muted text-muted-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  editorial_sponsorship: "Editorial Sponsorship",
  event_partnership: "Event Partnership",
  research_collaboration: "Research Collaboration",
  brand_integration: "Brand Integration",
};

const BUDGET_LABELS: Record<string, string> = {
  under_5k: "Under $5K",
  "5k_15k": "$5K–$15K",
  "15k_50k": "$15K–$50K",
  "50k_plus": "$50K+",
  discuss: "To discuss",
};

export default function AdminPartnerships() {
  const [filter, setFilter] = useState<string>("all");

  const { data: inquiries, refetch } = useQuery({
    queryKey: ["admin-partnership-inquiries", filter],
    queryFn: async () => {
      let q = supabase
        .from("partnership_inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("partnership_inquiries")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success("Status updated");
    refetch();
  };

  const updateNotes = async (id: string, notes: string) => {
    const { error } = await supabase
      .from("partnership_inquiries")
      .update({ notes })
      .eq("id", id);
    if (error) toast.error("Failed to save notes");
    else toast.success("Notes saved");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Partnership Inquiries</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {inquiries?.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No inquiries yet.</p>
      )}

      <div className="space-y-4">
        {inquiries?.map((inq) => (
          <InquiryCard
            key={inq.id}
            inquiry={inq}
            onStatusChange={(status) => updateStatus(inq.id, status)}
            onNotesSave={(notes) => updateNotes(inq.id, notes)}
          />
        ))}
      </div>
    </div>
  );
}

function InquiryCard({
  inquiry,
  onStatusChange,
  onNotesSave,
}: {
  inquiry: any;
  onStatusChange: (status: string) => void;
  onNotesSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(inquiry.notes ?? "");
  const [dirty, setDirty] = useState(false);

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {inquiry.name}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${inquiry.email}`} className="hover:text-primary">
                  {inquiry.email}
                </a>
              </span>
              {inquiry.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {inquiry.company}
                </span>
              )}
              {inquiry.role && <span>{inquiry.role}</span>}
            </div>
          </div>
          <Select value={inquiry.status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-36">
              <Badge className={STATUS_COLORS[inquiry.status] ?? ""}>
                {inquiry.status.replace("_", " ")}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{TYPE_LABELS[inquiry.partnership_type] ?? inquiry.partnership_type}</Badge>
          {inquiry.budget_range && (
            <Badge variant="secondary">{BUDGET_LABELS[inquiry.budget_range] ?? inquiry.budget_range}</Badge>
          )}
          <span className="flex items-center gap-1 text-muted-foreground ml-auto">
            <Clock className="h-3 w-3" />
            {new Date(inquiry.created_at).toLocaleDateString()}
          </span>
        </div>

        {inquiry.message && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg flex gap-2">
            <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>{inquiry.message}</p>
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            placeholder="Internal notes..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
            rows={2}
            className="text-sm"
          />
          {dirty && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onNotesSave(notes);
                setDirty(false);
              }}
            >
              Save Notes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

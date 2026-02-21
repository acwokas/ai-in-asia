import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Check, X, Edit, ExternalLink, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: string;
  event_name: string;
  website_url: string;
  start_date: string;
  end_date: string;
  location: string;
  is_virtual: boolean;
  is_hybrid: boolean;
  event_type: string;
  region: string;
  expected_attendance: number | null;
  ticket_price: string | null;
  description: string | null;
  submitter_email: string;
  status: string;
  reviewer_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

const AdminEventSubmissions = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Submission>>({});
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["event-submissions", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("event_submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Submission[];
    },
  });

  const handleApprove = async (submission: Submission, overrides?: Partial<Submission>) => {
    setProcessing(submission.id);
    try {
      const s = { ...submission, ...overrides };

      // Create the event in the events table
      const slug = s.event_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80);

      const locationParts = s.location.split(",").map((p) => p.trim());
      const city = locationParts[0] || s.location;
      const country = locationParts[1] || locationParts[0] || "";

      const { error: eventError } = await supabase.from("events").insert({
        title: s.event_name,
        slug: `${slug}-${Date.now().toString(36)}`,
        description: s.description || "",
        event_type: s.event_type.toLowerCase(),
        start_date: s.start_date,
        end_date: s.end_date,
        location: s.location,
        city,
        country,
        region: s.region,
        website_url: s.website_url,
        status: "upcoming",
        is_featured: false,
        is_sponsored: false,
      });

      if (eventError) throw eventError;

      // Update submission status
      const { error: updateError } = await supabase
        .from("event_submissions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewer_notes: reviewerNotes || null,
        })
        .eq("id", submission.id);

      if (updateError) throw updateError;

      toast.success(`"${s.event_name}" approved and added to events.`);
      queryClient.invalidateQueries({ queryKey: ["event-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setSelectedSubmission(null);
      setEditMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve submission.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (submission: Submission) => {
    setProcessing(submission.id);
    try {
      const { error } = await supabase
        .from("event_submissions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewer_notes: reviewerNotes || null,
        })
        .eq("id", submission.id);

      if (error) throw error;
      toast.success(`"${submission.event_name}" rejected.`);
      queryClient.invalidateQueries({ queryKey: ["event-submissions"] });
      setSelectedSubmission(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to reject submission.");
    } finally {
      setProcessing(null);
    }
  };

  const openDetail = (sub: Submission, edit = false) => {
    setSelectedSubmission(sub);
    setEditMode(edit);
    setEditForm({ ...sub });
    setReviewerNotes(sub.reviewer_notes || "");
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-destructive/20 text-destructive border-destructive/30",
    };
    return <Badge variant="outline" className={colors[status] || ""}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Event Submissions</CardTitle>
            <CardDescription>Review and manage user-submitted events</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !submissions?.length ? (
          <p className="text-center py-8 text-muted-foreground">No submissions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="hidden lg:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Submitted By</TableHead>
                  <TableHead className="hidden md:table-cell">Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(sub)}>
                    <TableCell className="font-medium max-w-[200px] truncate">{sub.event_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {format(new Date(sub.start_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[120px]">{sub.location}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{sub.event_type}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[140px]">{sub.submitter_email}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {format(new Date(sub.submitted_at), "MMM dd")}
                    </TableCell>
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-right">
                      {sub.status === "pending" && (
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400 hover:text-green-300" onClick={() => handleApprove(sub)} disabled={processing === sub.id}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => handleReject(sub)} disabled={processing === sub.id}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDetail(sub, true)} disabled={processing === sub.id}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail / Edit Dialog */}
        <Dialog open={!!selectedSubmission} onOpenChange={(open) => { if (!open) { setSelectedSubmission(null); setEditMode(false); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editMode ? "Edit & Approve" : "Submission Details"}</DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-4">
                {editMode ? (
                  <>
                    <div>
                      <Label>Event Name</Label>
                      <Input value={editForm.event_name || ""} onChange={(e) => setEditForm({ ...editForm, event_name: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>Website URL</Label>
                      <Input value={editForm.website_url || ""} onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })} className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start Date</Label>
                        <Input type="date" value={editForm.start_date || ""} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input type="date" value={editForm.end_date || ""} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={editForm.location || ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Event Type</Label>
                        <Input value={editForm.event_type || ""} onChange={(e) => setEditForm({ ...editForm, event_type: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label>Region</Label>
                        <Input value={editForm.region || ""} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="mt-1" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg">{selectedSubmission.event_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {statusBadge(selectedSubmission.status)}
                          <Badge variant="outline">{selectedSubmission.event_type}</Badge>
                          <Badge variant="outline">{selectedSubmission.region}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(selectedSubmission.start_date), "MMM dd, yyyy")} — {format(new Date(selectedSubmission.end_date), "MMM dd, yyyy")}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedSubmission.location}
                        {selectedSubmission.is_virtual && " (Virtual)"}
                        {selectedSubmission.is_hybrid && " (Hybrid)"}
                      </div>
                      {selectedSubmission.website_url && (
                        <a href={selectedSubmission.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <ExternalLink className="w-3.5 h-3.5" /> {selectedSubmission.website_url}
                        </a>
                      )}
                      {selectedSubmission.description && (
                        <p className="text-sm text-muted-foreground">{selectedSubmission.description}</p>
                      )}
                      {selectedSubmission.ticket_price && (
                        <p className="text-sm">Price: {selectedSubmission.ticket_price}</p>
                      )}
                      {selectedSubmission.expected_attendance && (
                        <p className="text-sm">Expected attendance: {selectedSubmission.expected_attendance}</p>
                      )}
                      <div className="border-t border-border pt-3 mt-3">
                        <p className="text-xs text-muted-foreground">Submitted by: {selectedSubmission.submitter_email}</p>
                        <p className="text-xs text-muted-foreground">Submitted: {format(new Date(selectedSubmission.submitted_at), "PPP")}</p>
                      </div>
                    </div>
                  </>
                )}

                {selectedSubmission.status === "pending" && (
                  <div>
                    <Label>Reviewer Notes</Label>
                    <Textarea placeholder="Internal notes (not shared with submitter)" value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} className="mt-1" />
                  </div>
                )}
              </div>
            )}
            {selectedSubmission?.status === "pending" && (
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="destructive" onClick={() => handleReject(selectedSubmission)} disabled={!!processing}>
                  {processing === selectedSubmission.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
                  Reject
                </Button>
                {editMode ? (
                  <Button onClick={() => handleApprove(selectedSubmission, editForm)} disabled={!!processing}>
                    {processing === selectedSubmission.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                    Save & Approve
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(true)}>
                      <Edit className="w-4 h-4 mr-1" /> Edit & Approve
                    </Button>
                    <Button onClick={() => handleApprove(selectedSubmission)} disabled={!!processing}>
                      {processing === selectedSubmission.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                      Approve
                    </Button>
                  </>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminEventSubmissions;

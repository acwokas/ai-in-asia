 import { useState } from "react";
 import { Link } from "react-router-dom";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import Header from "@/components/Header";
 import { Button } from "@/components/ui/button";
 import { Card } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Home, UserMinus, Search, Download, Loader2 } from "lucide-react";
 import {
   Breadcrumb,
   BreadcrumbList,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbSeparator,
   BreadcrumbPage,
 } from "@/components/ui/breadcrumb";
 import { format } from "date-fns";
 import { toast } from "sonner";
 
 const REASON_LABELS: Record<string, string> = {
   too_frequent: "Too many emails",
   not_relevant: "Content not relevant",
   never_signed_up: "Never signed up",
   switched_job: "Changed jobs/industries",
   other: "Other",
 };
 
 export default function AdminUnsubscribes() {
   const [searchTerm, setSearchTerm] = useState("");
 
   const { data: unsubscribes, isLoading } = useQuery({
     queryKey: ["admin-unsubscribes"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("newsletter_unsubscribes")
         .select("*")
         .order("unsubscribed_at", { ascending: false });
 
       if (error) throw error;
       return data;
     },
   });
 
   const filteredUnsubscribes = unsubscribes?.filter((unsub) =>
     unsub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     unsub.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     unsub.feedback?.toLowerCase().includes(searchTerm.toLowerCase())
   );
 
   const handleExportCSV = () => {
     if (!unsubscribes || unsubscribes.length === 0) {
       toast.error("No data to export");
       return;
     }
 
     const headers = ["Email", "Reason", "Feedback", "Source", "Unsubscribed At"];
     const rows = unsubscribes.map((u) => [
       u.email,
       REASON_LABELS[u.reason || ""] || u.reason || "",
       u.feedback || "",
       u.source || "",
       format(new Date(u.unsubscribed_at), "yyyy-MM-dd HH:mm"),
     ]);
 
     const csvContent = [
       headers.join(","),
       ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
     ].join("\n");
 
     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
     const url = URL.createObjectURL(blob);
     const link = document.createElement("a");
     link.setAttribute("href", url);
     link.setAttribute("download", `unsubscribes-${format(new Date(), "yyyy-MM-dd")}.csv`);
     link.style.visibility = "hidden";
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
 
     toast.success("CSV exported successfully");
   };
 
   // Group by reason for stats
   const reasonStats = unsubscribes?.reduce((acc, u) => {
     const reason = u.reason || "no_reason";
     acc[reason] = (acc[reason] || 0) + 1;
     return acc;
   }, {} as Record<string, number>) || {};
 
   return (
     <div className="min-h-screen flex flex-col">
       <Header />
       <main className="flex-1 container mx-auto px-4 py-8">
         <Breadcrumb className="mb-6">
           <BreadcrumbList>
             <BreadcrumbItem>
               <BreadcrumbLink asChild>
                 <Link to="/" className="flex items-center gap-1">
                   <Home className="h-4 w-4" />
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
               <BreadcrumbPage>Unsubscribes</BreadcrumbPage>
             </BreadcrumbItem>
           </BreadcrumbList>
         </Breadcrumb>
 
         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
           <div>
             <h1 className="text-3xl font-bold flex items-center gap-2">
               <UserMinus className="h-8 w-8" />
               Newsletter Unsubscribes
             </h1>
             <p className="text-muted-foreground mt-1">
               Track who has unsubscribed and why
             </p>
           </div>
           <Button variant="outline" onClick={handleExportCSV} disabled={!unsubscribes?.length}>
             <Download className="h-4 w-4 mr-2" />
             Export CSV
           </Button>
         </div>
 
         {/* Stats Cards */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
           <Card className="p-4">
             <p className="text-sm text-muted-foreground">Total Unsubscribes</p>
             <p className="text-2xl font-bold">{unsubscribes?.length || 0}</p>
           </Card>
           <Card className="p-4">
             <p className="text-sm text-muted-foreground">Too Frequent</p>
             <p className="text-2xl font-bold">{reasonStats["too_frequent"] || 0}</p>
           </Card>
           <Card className="p-4">
             <p className="text-sm text-muted-foreground">Not Relevant</p>
             <p className="text-2xl font-bold">{reasonStats["not_relevant"] || 0}</p>
           </Card>
           <Card className="p-4">
             <p className="text-sm text-muted-foreground">Other/No Reason</p>
             <p className="text-2xl font-bold">
               {(reasonStats["other"] || 0) + (reasonStats["no_reason"] || 0)}
             </p>
           </Card>
         </div>
 
         {/* Search */}
         <div className="relative mb-6">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Search by email, reason, or feedback..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-10"
           />
         </div>
 
         {/* Table */}
         <Card>
           {isLoading ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
           ) : filteredUnsubscribes && filteredUnsubscribes.length > 0 ? (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Email</TableHead>
                   <TableHead>Reason</TableHead>
                   <TableHead>Feedback</TableHead>
                   <TableHead>Source</TableHead>
                   <TableHead>Date</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredUnsubscribes.map((unsub) => (
                   <TableRow key={unsub.id}>
                     <TableCell className="font-medium">{unsub.email}</TableCell>
                     <TableCell>
                       {unsub.reason ? (
                         <Badge variant="secondary">
                           {REASON_LABELS[unsub.reason] || unsub.reason}
                         </Badge>
                       ) : (
                         <span className="text-muted-foreground text-sm">—</span>
                       )}
                     </TableCell>
                     <TableCell className="max-w-xs truncate">
                       {unsub.feedback || <span className="text-muted-foreground">—</span>}
                     </TableCell>
                     <TableCell>
                       <Badge variant="outline">{unsub.source || "unknown"}</Badge>
                     </TableCell>
                     <TableCell className="text-muted-foreground">
                       {format(new Date(unsub.unsubscribed_at), "MMM d, yyyy h:mm a")}
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           ) : (
             <div className="text-center py-12">
               <UserMinus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
               <h3 className="text-lg font-medium mb-1">No unsubscribes yet</h3>
               <p className="text-muted-foreground">
                 {searchTerm ? "No results match your search." : "Good news! No one has unsubscribed."}
               </p>
             </div>
           )}
         </Card>
       </main>
     </div>
   );
 }
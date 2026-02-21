import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { CalendarIcon, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EVENT_TYPES = ["Conference", "Summit", "Meetup", "Workshop", "Hackathon", "Webinar", "Other"];
const REGIONS = ["APAC", "Americas", "EMEA", "Middle East & Africa"];

interface FormData {
  event_name: string;
  website_url: string;
  start_date: Date | undefined;
  end_date: Date | undefined;
  location: string;
  is_virtual: boolean;
  is_hybrid: boolean;
  event_type: string;
  region: string;
  expected_attendance: string;
  ticket_price: string;
  description: string;
  submitter_email: string;
}

const initialForm: FormData = {
  event_name: "",
  website_url: "",
  start_date: undefined,
  end_date: undefined,
  location: "",
  is_virtual: false,
  is_hybrid: false,
  event_type: "",
  region: "",
  expected_attendance: "",
  ticket_price: "",
  description: "",
  submitter_email: "",
};

interface FieldErrors {
  [key: string]: string;
}

const SubmitEvent = () => {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const set = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!form.event_name.trim()) e.event_name = "Event name is required.";
    else if (form.event_name.length > 200) e.event_name = "Max 200 characters.";

    if (!form.website_url.trim()) e.website_url = "Website URL is required.";
    else {
      try {
        new URL(form.website_url);
      } catch {
        e.website_url = "Please enter a valid URL (e.g., https://...).";
      }
    }

    if (!form.start_date) e.start_date = "Start date is required.";
    if (!form.end_date) e.end_date = "End date is required.";
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      e.end_date = "End date cannot be before start date.";
    }

    if (!form.is_virtual && !form.location.trim()) e.location = "Location is required.";
    if (!form.event_type) e.event_type = "Event type is required.";
    if (!form.region) e.region = "Region is required.";

    if (!form.submitter_email.trim()) e.submitter_email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.submitter_email.trim()))
      e.submitter_email = "Please enter a valid email address.";

    if (form.description.length > 300) e.description = "Max 300 characters.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("event_submissions").insert({
        event_name: form.event_name.trim(),
        website_url: form.website_url.trim(),
        start_date: format(form.start_date!, "yyyy-MM-dd"),
        end_date: format(form.end_date!, "yyyy-MM-dd"),
        location: form.is_virtual && !form.is_hybrid ? "Online" : form.location.trim(),
        is_virtual: form.is_virtual,
        is_hybrid: form.is_hybrid,
        event_type: form.event_type,
        region: form.region,
        expected_attendance: form.expected_attendance ? parseInt(form.expected_attendance) : null,
        ticket_price: form.ticket_price.trim() || null,
        description: form.description.trim() || null,
        submitter_email: form.submitter_email.trim(),
      });
      if (error) throw error;
      setSubmittedEmail(form.submitter_email.trim());
      setSubmitted(true);
      toast.success("Event submitted for review!");
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
    setSubmitted(false);
    setSubmittedEmail("");
  };

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-destructive mt-1">{errors[field]}</p> : null;

  return (
    <>
      <SEOHead
        title="Submit an Event | AI in Asia"
        description="Submit AI conferences, summits, meetups, and workshops to the AI in Asia events directory."
        canonical="https://aiinasia.com/events/submit"
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <Breadcrumb className="mb-8">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/events">Events</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Submit</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {submitted ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Thanks! Your event has been submitted.
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                We'll review it and email you at{" "}
                <span className="text-primary font-medium">{submittedEmail}</span> once it's published.
              </p>
              <Button variant="outline" onClick={resetForm} className="mt-4">
                Submit another event
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Submit an Event
                </h1>
                <p className="text-muted-foreground">
                  Help us keep the AI events directory comprehensive. Submit conferences, summits, meetups, and workshops for review.
                </p>
              </div>

              <div className="space-y-5">
                {/* Event Name */}
                <div>
                  <Label htmlFor="event_name">Event Name *</Label>
                  <Input id="event_name" maxLength={200} placeholder="e.g., AI Summit Singapore 2026" value={form.event_name} onChange={(e) => set("event_name", e.target.value)} className="mt-1" />
                  <FieldError field="event_name" />
                </div>

                {/* Website */}
                <div>
                  <Label htmlFor="website_url">Event Website *</Label>
                  <Input id="website_url" type="url" placeholder="https://..." value={form.website_url} onChange={(e) => set("website_url", e.target.value)} className="mt-1" />
                  <FieldError field="website_url" />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !form.start_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.start_date ? format(form.start_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.start_date} onSelect={(d) => { set("start_date", d); if (d && (!form.end_date || form.end_date < d)) set("end_date", d); }} className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                    <FieldError field="start_date" />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !form.end_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.end_date ? format(form.end_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.end_date} onSelect={(d) => set("end_date", d)} disabled={(date) => form.start_date ? date < form.start_date : false} className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                    <FieldError field="end_date" />
                  </div>
                </div>

                {/* Virtual toggle */}
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_virtual} onCheckedChange={(v) => { set("is_virtual", v); if (!v) set("is_hybrid", false); }} />
                  <Label>Virtual Event</Label>
                </div>
                {form.is_virtual && (
                  <div className="flex items-center gap-3 pl-6">
                    <Switch checked={form.is_hybrid} onCheckedChange={(v) => set("is_hybrid", v)} />
                    <Label>Hybrid (both virtual and in-person)</Label>
                  </div>
                )}

                {/* Location */}
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Singapore, Singapore"
                    value={form.is_virtual && !form.is_hybrid ? "Online" : form.location}
                    onChange={(e) => set("location", e.target.value)}
                    readOnly={form.is_virtual && !form.is_hybrid}
                    className={cn("mt-1", form.is_virtual && !form.is_hybrid && "opacity-60")}
                  />
                  <FieldError field="location" />
                </div>

                {/* Type & Region */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Event Type *</Label>
                    <Select value={form.event_type} onValueChange={(v) => set("event_type", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FieldError field="event_type" />
                  </div>
                  <div>
                    <Label>Region *</Label>
                    <Select value={form.region} onValueChange={(v) => set("region", v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select region" /></SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FieldError field="region" />
                  </div>
                </div>

                {/* Attendance & Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="attendance">Expected Attendance</Label>
                    <Input id="attendance" type="number" placeholder="e.g., 500" value={form.expected_attendance} onChange={(e) => set("expected_attendance", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="price">Ticket Price</Label>
                    <Input id="price" placeholder="e.g., Free, $299, $50-$500" value={form.ticket_price} onChange={(e) => set("ticket_price", e.target.value)} className="mt-1" />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" maxLength={300} placeholder="Brief description of the event" value={form.description} onChange={(e) => set("description", e.target.value)} className="mt-1 min-h-[80px]" />
                  <div className="flex justify-between mt-1">
                    <FieldError field="description" />
                    <span className="text-xs text-muted-foreground ml-auto">{form.description.length}/300</span>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">Your Email *</Label>
                  <Input id="email" type="email" placeholder="your@email.com" value={form.submitter_email} onChange={(e) => set("submitter_email", e.target.value)} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">We'll notify you when your event is reviewed</p>
                  <FieldError field="submitter_email" />
                </div>

                {/* Submit */}
                <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto mt-2" size="lg">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Event for Review →
                </Button>
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SubmitEvent;

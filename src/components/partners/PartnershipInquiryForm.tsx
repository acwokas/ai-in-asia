import { useState, forwardRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, CheckCircle2 } from "lucide-react";
import { useFadeInOnScroll } from "./useFadeInOnScroll";

const PARTNERSHIP_TYPES = [
  { value: "editorial_sponsorship", label: "Editorial Sponsorship" },
  { value: "event_partnership", label: "Event Partnership" },
  { value: "research_collaboration", label: "Research Collaboration" },
  { value: "brand_integration", label: "Brand Integration" },
] as const;

const BUDGET_RANGES = [
  { value: "under_5k", label: "Under $5K" },
  { value: "5k_15k", label: "$5K to $15K" },
  { value: "15k_50k", label: "$15K to $50K" },
  { value: "50k_plus", label: "$50K+" },
  { value: "discuss", label: "Let us discuss" },
] as const;

const PartnershipInquiryForm = forwardRef<HTMLDivElement>((_, formRef) => {
  const { ref: fadeRef, isVisible } = useFadeInOnScroll();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    partnership_type: "",
    message: "",
    budget_range: "",
  });

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.partnership_type) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.name.length > 200 || form.email.length > 255 || form.message.length > 5000) {
      toast.error("One or more fields exceed the maximum length.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("partnership_inquiries").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim() || null,
      role: form.role.trim() || null,
      partnership_type: form.partnership_type,
      message: form.message.trim() || null,
      budget_range: form.budget_range || null,
    });
    setLoading(false);
    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section ref={formRef} className="py-16 md:py-20 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="headline text-2xl font-bold mb-2">Thank you for your interest</h2>
          <p className="text-muted-foreground">
            We have received your inquiry and will be in touch within 2 business days.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={(node) => {
        // Merge refs
        if (typeof formRef === "function") formRef(node);
        else if (formRef) (formRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (fadeRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={`py-16 md:py-20 border-t border-border/50 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-10">
          <h2 className="headline text-2xl md:text-3xl font-bold mb-3">Get In Touch</h2>
          <p className="text-muted-foreground">
            Tell us about your goals and we will design a partnership that delivers results.
          </p>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pi-name">Name *</Label>
                  <Input
                    id="pi-name"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Your name"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pi-email">Email *</Label>
                  <Input
                    id="pi-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="you@company.com"
                    maxLength={255}
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pi-company">Company</Label>
                  <Input
                    id="pi-company"
                    value={form.company}
                    onChange={(e) => handleChange("company", e.target.value)}
                    placeholder="Your organization"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pi-role">Your Role</Label>
                  <Input
                    id="pi-role"
                    value={form.role}
                    onChange={(e) => handleChange("role", e.target.value)}
                    placeholder="e.g. Head of Marketing"
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Partnership Type *</Label>
                  <Select value={form.partnership_type} onValueChange={(v) => handleChange("partnership_type", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNERSHIP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Budget Range (optional)</Label>
                  <Select value={form.budget_range} onValueChange={(v) => handleChange("budget_range", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_RANGES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pi-message">Message</Label>
                <Textarea
                  id="pi-message"
                  value={form.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  placeholder="Tell us about your partnership goals, target audience, or any specific ideas you have in mind."
                  rows={4}
                  maxLength={5000}
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <Send className="h-4 w-4" />
                {loading ? "Submitting..." : "Submit Inquiry"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
});

PartnershipInquiryForm.displayName = "PartnershipInquiryForm";
export default PartnershipInquiryForm;

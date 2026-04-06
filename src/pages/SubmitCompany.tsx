import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "AI Infrastructure", "Computer Vision", "NLP/LLM", "Robotics",
  "Healthcare AI", "Fintech AI", "EdTech AI", "AgriTech AI", "Creative AI",
  "Autonomous Vehicles", "AI Chips/Hardware", "AI Consulting", "Enterprise AI",
  "AI Research Labs",
];

const COUNTRIES = [
  "Australia", "Bangladesh", "China", "India", "Indonesia", "Japan",
  "Malaysia", "Myanmar", "Nepal", "New Zealand", "Pakistan", "Philippines",
  "Singapore", "South Korea", "Sri Lanka", "Taiwan", "Thailand", "Vietnam",
];

const SubmitCompany = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    website: "",
    contact_email: "",
    description: "",
    country: "",
    category: [] as string[],
  });

  const handleCategoryToggle = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      category: prev.category.includes(cat)
        ? prev.category.filter((c) => c !== cat)
        : prev.category.length < 4
        ? [...prev.category, cat]
        : prev.category,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.company_name.trim() || !form.website.trim() || !form.contact_email.trim() || !form.country) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.contact_email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("company_submissions").insert({
        company_name: form.company_name.trim(),
        website: form.website.trim(),
        contact_email: form.contact_email.trim(),
        description: form.description.trim() || null,
        country: form.country,
        category: form.category.length > 0 ? form.category : null,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <SEOHead title="Submission Received | AI Company Directory" description="Your company submission has been received." />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-24 text-center max-w-lg">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Submission Received
            </h1>
            <p className="text-muted-foreground mb-6">
              Thank you for submitting your company. Our editorial team will review your listing within 48 hours.
            </p>
            <Link to="/directory">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Directory
              </Button>
            </Link>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Submit Your AI Company | Directory"
        description="Submit your AI company for inclusion in the Asia-Pacific AI Company Directory."
        canonical="https://aiinasia.com/directory/submit"
      />

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Breadcrumb className="mb-8">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/directory">Directory</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Submit</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <h1
              className="text-3xl font-extrabold mb-2"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Submit Your Company
            </h1>
            <p className="text-muted-foreground mb-8">
              Get your AI company listed in the Asia-Pacific AI Company Directory.
              All submissions are reviewed by our editorial team.
            </p>

            <Card className="border-border/50">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={form.company_name}
                        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                        placeholder="e.g. Acme AI"
                        required
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website URL *</Label>
                      <Input
                        id="website"
                        type="url"
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        placeholder="https://example.com"
                        required
                        maxLength={500}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email *</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={form.contact_email}
                        onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                        placeholder="contact@example.com"
                        required
                        maxLength={255}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                        <SelectTrigger id="country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description of what your company does..."
                      rows={4}
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground">{form.description.length}/1000</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Categories (select up to 4)</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryToggle(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            form.category.includes(cat)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-transparent text-foreground/80 border-border hover:border-foreground/40"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
                    <Building2 className="w-4 h-4" />
                    {loading ? "Submitting..." : "Submit for Review"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default SubmitCompany;

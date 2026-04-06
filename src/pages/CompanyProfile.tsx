import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Globe, MapPin, ExternalLink, Calendar, Users, Share2,
  ArrowLeft, ChevronRight, Briefcase, Star, Edit3,
} from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const CompanyProfile = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-profile", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_companies")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: relatedCompanies } = useQuery({
    queryKey: ["related-companies", company?.country, company?.category, company?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_companies")
        .select("id, slug, name, description, country, city, category, logo_url, founded_year")
        .neq("id", company!.id)
        .eq("country", company!.country)
        .limit(6);
      return data || [];
    },
    enabled: !!company,
  });

  // Related articles mentioning the company name
  const { data: relatedArticles } = useQuery({
    queryKey: ["company-articles", company?.name],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, slug, title, excerpt, published_at, primary_category_id")
        .eq("status", "published")
        .ilike("title", `%${company!.name.split(" ")[0]}%`)
        .order("published_at", { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!company,
  });

  const handleShare = async () => {
    const url = `https://aiinasia.com/directory/${slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: company?.name, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-12 w-3/4 mb-6" />
          <Skeleton className="h-64 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-24 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Company Not Found</h1>
          <p className="text-muted-foreground mb-6">This company may have been removed or the link is incorrect.</p>
          <Link to="/directory">
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const keyPeople = Array.isArray(company.key_people) ? company.key_people as { name: string; title: string }[] : [];
  const socialLinks = (company.social_links || {}) as Record<string, string>;
  const pageTitle = `${company.name} | AI Company Directory`;
  const pageDesc = company.description || `${company.name}, an AI company based in ${company.city || company.country}.`;

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    description: company.description,
    url: company.website_url,
    logo: company.logo_url,
    foundingDate: company.founded_year ? `${company.founded_year}` : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: company.city,
      addressCountry: company.country,
    },
    sameAs: Object.values(socialLinks).filter(Boolean),
  };

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDesc.slice(0, 155)}
        canonical={`https://aiinasia.com/directory/${company.slug}`}
        ogImage={company.logo_url || "https://aiinasia.com/icons/aiinasia-512.png?v=3"}
        schemaJson={schemaJson}
      />

      <div className="min-h-screen flex flex-col">
        <Header />

        {/* Hero */}
        <section
          className="relative overflow-hidden border-b border-border/30"
          style={{
            background: `
              radial-gradient(600px 400px ellipse at 30% 50%, rgba(0, 212, 255, 0.06) 0%, transparent 70%),
              linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))
            `,
          }}
        >
          <div className="container mx-auto px-4 pt-8 pb-10 md:pt-12 md:pb-14">
            <Breadcrumb className="mb-6">
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
                  <BreadcrumbPage className="truncate max-w-[200px]">{company.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-start gap-4 md:gap-6 mb-6">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-10 h-10 md:w-14 md:h-14 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-2xl font-bold text-primary">${company.name[0]}</span>`;
                    }}
                  />
                ) : (
                  <span className="text-2xl md:text-3xl font-bold text-primary">{company.name[0]}</span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1
                    className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {company.name}
                  </h1>
                  {company.is_verified && (
                    <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">Verified</Badge>
                  )}
                  {company.is_featured && (
                    <Star className="w-5 h-5 text-amber-400" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {company.city ? `${company.city}, ` : ""}{company.country}
                  </span>
                  {company.founded_year && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Founded {company.founded_year}
                    </span>
                  )}
                  {company.employee_count_range && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      {company.employee_count_range} employees
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
              {company.category?.map((cat: string) => (
                <Badge key={cat} className="bg-primary/10 text-primary border-primary/20">{cat}</Badge>
              ))}
              {company.funding_stage && (
                <Badge variant="outline">{company.funding_stage}</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {company.website_url && (
                <a href={company.website_url} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="gap-2">
                    Visit Website <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              )}
              <Button variant="outline" size="lg" className="gap-2" onClick={handleShare}>
                <Share2 className="w-4 h-4" /> Share
              </Button>
              <Link to="/directory/submit">
                <Button variant="ghost" size="lg" className="gap-2">
                  <Edit3 className="w-4 h-4" /> Suggest an Edit
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {/* Overview */}
              {(company.description || company.long_description) && (
                <section>
                  <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Overview
                  </h2>
                  <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                    {company.long_description || company.description}
                  </div>
                </section>
              )}

              {/* Key People */}
              {keyPeople.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Leadership
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {keyPeople.map((person, i) => (
                      <Card key={i} className="border-border/50">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{person.name}</p>
                            <p className="text-xs text-muted-foreground">{person.title}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Related articles */}
              {relatedArticles && relatedArticles.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Latest News
                  </h2>
                  <div className="space-y-3">
                    {relatedArticles.map((article) => (
                      <Link
                        key={article.id}
                        to={`/${article.slug}`}
                        className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{article.excerpt}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="border-border/50">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold text-lg">Company Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{company.city ? `${company.city}, ` : ""}{company.country}</p>
                      </div>
                    </div>
                    {company.founded_year && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Founded</p>
                          <p className="text-muted-foreground">{company.founded_year}</p>
                        </div>
                      </div>
                    )}
                    {company.funding_stage && (
                      <div className="flex items-start gap-3">
                        <Briefcase className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Funding Stage</p>
                          <p className="text-muted-foreground">{company.funding_stage}</p>
                          {company.funding_total && (
                            <p className="text-muted-foreground">{company.funding_total}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {company.employee_count_range && (
                      <div className="flex items-start gap-3">
                        <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Employees</p>
                          <p className="text-muted-foreground">{company.employee_count_range}</p>
                        </div>
                      </div>
                    )}
                    {company.website_url && (
                      <div className="flex items-start gap-3">
                        <Globe className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Website</p>
                          <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs break-all">
                            {company.website_url.replace(/^https?:\/\/(www\.)?/, "")}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Categories card */}
              {company.category && company.category.length > 0 && (
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <h3 className="font-bold mb-3">Categories</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {company.category.map((cat: string) => (
                        <Link
                          key={cat}
                          to={`/directory?category=${encodeURIComponent(cat)}`}
                          className="inline-block"
                        >
                          <Badge variant="outline" className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                            {cat}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Related Companies */}
          {relatedCompanies && relatedCompanies.length > 0 && (
            <section className="mt-16 pt-10 border-t border-border/30">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                More Companies in {company.country}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedCompanies.map((rc) => (
                  <Link key={rc.id} to={`/directory/${rc.slug}`} className="group block">
                    <Card className="h-full transition-all hover:border-primary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{rc.name[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm group-hover:text-primary transition-colors truncate">{rc.name}</h3>
                            <p className="text-xs text-muted-foreground">{rc.city ? `${rc.city}, ` : ""}{rc.country}</p>
                          </div>
                        </div>
                        {rc.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{rc.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CompanyProfile;

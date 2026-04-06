import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { EventStructuredData } from "@/components/StructuredData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, MapPin, ExternalLink, CalendarPlus, Globe, Users,
  ArrowLeft, Share2, Clock, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const generateICS = (event: any): string => {
  const fmtDate = (d: string) =>
    new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = fmtDate(event.start_date);
  const end = event.end_date ? fmtDate(event.end_date) : start;
  const desc = (event.description || "").replace(/\n/g, "\\n").slice(0, 500);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AIinAsia//Events//EN",
    "BEGIN:VEVENT", `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${event.title}`, `DESCRIPTION:${desc}`,
    `LOCATION:${event.venue || ""}, ${event.city}, ${event.country}`,
    event.website_url ? `URL:${event.website_url}` : "",
    `UID:${event.id}@aiinasia.com`, "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
};

const googleCalendarUrl = (event: any): string => {
  const fmtDate = (d: string) =>
    new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = fmtDate(event.start_date);
  const end = event.end_date ? fmtDate(event.end_date) : start;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: (event.description || "").slice(0, 500),
    location: `${event.venue || ""} ${event.city}, ${event.country}`.trim(),
  });
  if (event.website_url) params.set("sprop", `website:${event.website_url}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const getFormatFromLocation = (location: string): string => {
  const loc = (location || "").toLowerCase();
  if (loc.includes("hybrid")) return "Hybrid";
  if (loc.includes("virtual") || loc.includes("online")) return "Virtual";
  return "In-Person";
};

const FORMAT_COLORS: Record<string, string> = {
  "In-Person": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Virtual: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Hybrid: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const EventDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-detail", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: relatedEvents } = useQuery({
    queryKey: ["related-events", event?.region, event?.event_type, event?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, slug, start_date, end_date, city, country, event_type, region")
        .eq("status", "upcoming")
        .neq("id", event!.id)
        .or(`region.eq.${event!.region},event_type.eq.${event!.event_type}`)
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(6);
      return data || [];
    },
    enabled: !!event,
  });

  const handleDownloadICS = () => {
    if (!event) return;
    const ics = generateICS(event);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const url = `https://aiinasia.com/events/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title, url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const formatDateRange = (start: string, end: string | null) => {
    const s = new Date(start);
    if (!end) return format(s, "EEEE, MMMM dd, yyyy");
    const e = new Date(end);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${format(s, "MMMM dd")} to ${format(e, "dd, yyyy")}`;
    }
    return `${format(s, "MMMM dd, yyyy")} to ${format(e, "MMMM dd, yyyy")}`;
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

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-24 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This event may have been removed or the link may be incorrect.
          </p>
          <Link to="/events">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Events
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const eventFormat = getFormatFromLocation(event.location);
  const pageTitle = `${event.title} | AI Events`;
  const pageDesc = event.description
    ? event.description.slice(0, 155)
    : `${event.title} in ${event.city}, ${event.country}. ${format(new Date(event.start_date), "MMMM dd, yyyy")}.`;

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDesc}
        canonical={`https://aiinasia.com/events/${event.slug}`}
        ogImage={event.image_url || "https://aiinasia.com/icons/aiinasia-512.png?v=3"}
      />

      <EventStructuredData
        name={event.title}
        description={event.description}
        startDate={event.start_date}
        endDate={event.end_date || undefined}
        location={event.location}
        city={event.city}
        country={event.country}
        organizer={event.organizer || undefined}
        url={event.website_url || undefined}
        eventType={event.event_type}
        imageUrl={event.image_url || undefined}
      />

      <div className="min-h-screen flex flex-col">
        <Header />

        {/* Hero */}
        <section
          className="relative overflow-hidden border-b border-border/30"
          style={{
            background: `
              radial-gradient(600px 400px ellipse at 30% 50%, rgba(0, 212, 255, 0.06) 0%, transparent 70%),
              radial-gradient(500px 400px ellipse at 70% 30%, rgba(99, 102, 241, 0.05) 0%, transparent 70%),
              linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))
            `,
          }}
        >
          <div className="container mx-auto px-4 pt-8 pb-12 md:pt-12 md:pb-16">
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/events">Events</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate max-w-[200px]">{event.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className="bg-primary/15 text-primary border-primary/20">{event.event_type}</Badge>
              <Badge variant="outline" className="text-muted-foreground">{event.region}</Badge>
              <Badge className={FORMAT_COLORS[eventFormat]}>{eventFormat}</Badge>
              {event.is_featured && (
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20">Featured</Badge>
              )}
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4 max-w-4xl"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-muted-foreground mb-6">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                {formatDateRange(event.start_date, event.end_date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                {event.venue ? `${event.venue}, ` : ""}{event.city}, {event.country}
              </span>
              {event.organizer && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  {event.organizer}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {event.registration_url && (
                <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="gap-2">
                    Register Now <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              )}
              {event.website_url && !event.registration_url && (
                <a href={event.website_url} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="gap-2">
                    Visit Website <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              )}
              <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="gap-2">
                  <CalendarPlus className="w-4 h-4" /> Google Calendar
                </Button>
              </a>
              <Button variant="outline" size="lg" className="gap-2" onClick={handleDownloadICS}>
                <CalendarPlus className="w-4 h-4" /> Download .ics
              </Button>
              <Button variant="ghost" size="lg" className="gap-2" onClick={handleShare}>
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
          </div>
        </section>

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main content */}
            <div className="lg:col-span-2">
              {event.description && (
                <section className="mb-10">
                  <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    About This Event
                  </h2>
                  <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                    {event.description}
                  </div>
                </section>
              )}

              {event.editorial_note && (
                <section className="mb-10 p-5 rounded-lg border border-primary/20 bg-primary/5">
                  <h3 className="text-sm font-semibold text-primary mb-2 uppercase tracking-wide">
                    Editor's Note
                  </h3>
                  <p className="text-sm text-muted-foreground">{event.editorial_note}</p>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="border-border/50">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold text-lg">Event Details</h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Date</p>
                        <p className="text-muted-foreground">{formatDateRange(event.start_date, event.end_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">
                          {event.venue && <span className="block">{event.venue}</span>}
                          {event.city}, {event.country}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Globe className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Format</p>
                        <p className="text-muted-foreground">{eventFormat}</p>
                      </div>
                    </div>

                    {event.organizer && (
                      <div className="flex items-start gap-3">
                        <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Organizer</p>
                          <p className="text-muted-foreground">{event.organizer}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Type</p>
                        <p className="text-muted-foreground">{event.event_type}</p>
                      </div>
                    </div>
                  </div>

                  {(event.registration_url || event.website_url) && (
                    <a
                      href={event.registration_url || event.website_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full gap-2 mt-2">
                        {event.registration_url ? "Register Now" : "Visit Website"}
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>

              {/* Calendar export card */}
              <Card className="border-border/50">
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-bold">Add to Your Calendar</h3>
                  <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full gap-2">
                      <CalendarPlus className="w-4 h-4" /> Google Calendar
                    </Button>
                  </a>
                  <Button variant="outline" className="w-full gap-2" onClick={handleDownloadICS}>
                    <CalendarPlus className="w-4 h-4" /> Download .ics File
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Related Events */}
          {relatedEvents && relatedEvents.length > 0 && (
            <section className="mt-16 pt-10 border-t border-border/30">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Related Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedEvents.map((re) => (
                  <Link
                    key={re.id}
                    to={`/events/${re.slug}`}
                    className="group block"
                  >
                    <Card className="h-full transition-all hover:border-primary/30 hover:bg-card/80">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">{re.event_type}</Badge>
                          <Badge variant="outline" className="text-muted-foreground text-xs">{re.region}</Badge>
                        </div>
                        <h3 className="font-bold text-sm mb-2 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {re.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(re.start_date), "MMM dd, yyyy")}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {re.city}, {re.country}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-primary mt-3 font-medium">
                          View Details <ChevronRight className="w-3 h-3" />
                        </span>
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

export default EventDetail;

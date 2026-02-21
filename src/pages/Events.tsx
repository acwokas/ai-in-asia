import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, endOfWeek, endOfMonth, addDays } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, ExternalLink, Globe, Loader2, Search, ArrowRight } from "lucide-react";
import EventCard from "@/components/events/EventCard";
import FeaturedEventCard, { type FeaturedEvent } from "@/components/events/FeaturedEventCard";
import { Input } from "@/components/ui/input";
import SEOHead from "@/components/SEOHead";
import { EventStructuredData } from "@/components/StructuredData";
import EventsFilterBar, { type EventFilters } from "@/components/events/EventsFilterBar";
import EventAlertSignup from "@/components/events/EventAlertSignup";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string;
  city: string;
  country: string;
  region: string;
  website_url: string | null;
  registration_url: string | null;
  is_featured: boolean;
  organizer: string | null;
  status: string;
  editorial_note?: string | null;
  is_sponsored?: boolean;
}

const EVENTS_PER_PAGE = 20;

const Events = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialise filters from URL
  const [filters, setFilters] = useState<EventFilters>(() => ({
    region: searchParams.get("region") || "all",
    type: searchParams.get("type") || "all",
    format: searchParams.get("format") || "all",
    date: searchParams.get("date") || "all",
    price: searchParams.get("price") || "all",
  }));

  // Sync filters → URL
  const handleFiltersChange = useCallback(
    (next: EventFilters) => {
      setFilters(next);
      setPage(1);
      const params = new URLSearchParams();
      if (next.region !== "all") params.set("region", next.region);
      if (next.type !== "all") params.set("type", next.type);
      if (next.format !== "all") params.set("format", next.format);
      if (next.date !== "all") params.set("date", next.date);
      if (next.price !== "all") params.set("price", next.price);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  // Fetch all upcoming events (no server-side region filter anymore — filtering is client-side)
  const { data: events, isLoading } = useQuery({
    queryKey: ["events", page],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("events")
        .select("*", { count: "exact" })
        .eq("status", "upcoming")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .range(0, page * EVENTS_PER_PAGE - 1);

      if (error) throw error;
      return { events: data as Event[], total: count || 0 };
    },
  });

  // Dynamic stats for hero
  const { data: eventStats } = useQuery({
    queryKey: ["event-stats"],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "upcoming")
        .gte("start_date", new Date().toISOString());

      const { data: countries } = await supabase
        .from("events")
        .select("country")
        .eq("status", "upcoming")
        .gte("start_date", new Date().toISOString());

      const uniqueCountries = new Set(countries?.map((c) => c.country)).size;
      return { totalEvents: count || 0, totalCountries: uniqueCountries };
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("events-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["events"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Apply all filters client-side
  const { featuredEvents, upcomingEvents, filteredTotal } = useMemo(() => {
    if (!events?.events) return { featuredEvents: [], upcomingEvents: [], filteredTotal: 0 };

    let filtered = events.events;

    // Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.country.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }

    // Region
    if (filters.region !== "all") {
      filtered = filtered.filter((e) => e.region === filters.region);
    }

    // Type
    if (filters.type !== "all") {
      filtered = filtered.filter(
        (e) => e.event_type.toLowerCase() === filters.type.toLowerCase()
      );
    }

    // Format (match against location text heuristic)
    if (filters.format !== "all") {
      const f = filters.format;
      filtered = filtered.filter((e) => {
        const loc = (e.location || "").toLowerCase();
        if (f === "virtual") return loc.includes("virtual") || loc.includes("online");
        if (f === "hybrid") return loc.includes("hybrid");
        // in-person = not virtual
        return !loc.includes("virtual") && !loc.includes("online");
      });
    }

    // Date
    if (filters.date !== "all") {
      const now = new Date();
      if (filters.date === "this-week") {
        const end = endOfWeek(now, { weekStartsOn: 1 });
        filtered = filtered.filter((e) => new Date(e.start_date) <= end);
      } else if (filters.date === "this-month") {
        const end = endOfMonth(now);
        filtered = filtered.filter((e) => new Date(e.start_date) <= end);
      } else if (filters.date === "next-30") {
        const end = addDays(now, 30);
        filtered = filtered.filter((e) => new Date(e.start_date) <= end);
      } else if (filters.date === "next-90") {
        const end = addDays(now, 90);
        filtered = filtered.filter((e) => new Date(e.start_date) <= end);
      } else if (filters.date === "custom" && filters.dateFrom && filters.dateTo) {
        filtered = filtered.filter((e) => {
          const d = new Date(e.start_date);
          return d >= filters.dateFrom! && d <= filters.dateTo!;
        });
      }
    }

    // Price
    if (filters.price !== "all") {
      filtered = filtered.filter((e) => {
        const isFree =
          e.event_type.toLowerCase().includes("free") ||
          e.title.toLowerCase().includes("free") ||
          (e.description && e.description.toLowerCase().includes("free"));
        return filters.price === "free" ? isFree : !isFree;
      });
    }

    const filteredTotal = filtered.length;

    // Featured / upcoming split
    let featured = filtered.filter(
      (event) => event.is_featured && event.region === "APAC" && event.description && event.website_url
    );
    let upcoming = filtered.filter((event) => !event.is_featured || event.region !== "APAC");

    if (featured.length < 2) {
      const apacExtras = filtered
        .filter((e) => e.region === "APAC" && !e.is_featured && e.description && e.website_url)
        .slice(0, 2 - featured.length);
      featured = [...featured, ...apacExtras];
      upcoming = upcoming.filter((e) => !apacExtras.some((f) => f.id === e.id));
    }

    return { featuredEvents: featured, upcomingEvents: upcoming, filteredTotal };
  }, [events?.events, searchQuery, filters]);

  const formatEventDate = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    if (!endDate) return format(start, "MMM dd, yyyy");
    const end = new Date(endDate);
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${format(start, "MMM dd")}-${format(end, "dd, yyyy")}`;
    }
    return `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`;
  };

  return (
    <>
      <SEOHead
        title="AI Events & Conferences Calendar"
        description="Discover upcoming AI conferences, summits, and workshops across Asia Pacific and globally. Stay updated with the latest artificial intelligence events."
        canonical="https://aiinasia.com/events"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
      />

      {featuredEvents?.map((event) => (
        <EventStructuredData
          key={event.id}
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
        />
      ))}

      <div className="min-h-screen flex flex-col">
        <Header />

        {/* Hero Section */}
        <section
          className="relative overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 15% 20%, hsl(var(--primary) / 0.12) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 85% 70%, rgba(95, 114, 255, 0.08) 0%, transparent 60%),
              linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))
            `,
          }}
        >
          <div className="container mx-auto px-4 pt-12 pb-20 md:pt-20 md:pb-24">
            <Breadcrumb className="mb-8">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Events</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold tracking-wide uppercase">AI Events Calendar</span>
              </div>
              <a
                href="#"
                className="hidden sm:inline-flex items-center gap-2 text-sm text-muted-foreground border border-border rounded-full px-4 py-1.5 hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                Submit an Event <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.15] tracking-tight mb-5 max-w-3xl"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              The Largest AI Events Directory{" "}
              <br className="hidden md:block" />
              Focused on Asia-Pacific
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-8">
              Tracking{" "}
              <span className="text-primary font-semibold">{eventStats?.totalEvents ?? "—"}</span>
              {" "}events across{" "}
              <span className="text-primary font-semibold">{eventStats?.totalCountries ?? "—"}</span>
              {" "}countries — updated daily from 12+ sources
            </p>

            <div className="max-w-[600px] mb-6">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events by name, topic, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-lg text-sm md:text-base"
                />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </section>

        {/* Filter Bar */}
        <EventsFilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          filteredCount={filteredTotal}
          totalCount={events?.total ?? 0}
        />

        {/* Events List */}
        <main className="flex-1 container mx-auto px-4 py-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          ) : (
            <>
              {/* Editor's Picks */}
              {featuredEvents && featuredEvents.length > 0 && (
                <section className="mb-0 -mx-4 px-4 py-12 md:py-14 border-t border-b border-border/30"
                  style={{ background: "hsl(var(--card) / 0.4)" }}
                >
                  <div className="mb-8">
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Editor's Picks
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Hand-picked events our editorial team recommends
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {featuredEvents.slice(0, 3).map((event) => (
                      <FeaturedEventCard key={event.id} event={event as FeaturedEvent} />
                    ))}
                  </div>
              </section>
              )}

              {/* Event Alert Signup */}
              <EventAlertSignup />

              {/* All Upcoming Events */}
              <section>
                <h2 className="text-2xl font-bold mb-6">All Upcoming Events</h2>
                <div className="space-y-4">
                  {upcomingEvents && upcomingEvents.length > 0 ? (
                    <>
                      {upcomingEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}

                      {events && events.total > page * EVENTS_PER_PAGE && (
                        <div className="text-center mt-8">
                          <Button onClick={() => setPage((p) => p + 1)} variant="outline" size="lg" disabled={isLoading}>
                            Load More Events
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({page * EVENTS_PER_PAGE} of {events.total})
                            </span>
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No events found matching your filters.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </section>
            </>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Events;

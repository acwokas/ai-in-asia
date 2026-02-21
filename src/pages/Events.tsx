import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, ExternalLink, Globe, Users, Loader2, Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import SEOHead from "@/components/SEOHead";
import { EventStructuredData } from "@/components/StructuredData";
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
}

const EVENTS_PER_PAGE = 20;

const Events = () => {
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<string | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', selectedRegion, page],
    staleTime: 5 * 60 * 1000, // 5 minutes - events don't change frequently
    queryFn: async () => {
      const from = 0;
      const to = page * EVENTS_PER_PAGE - 1;
      
      let query = supabase
        .from('events')
        .select('*', { count: 'exact' })
        .eq('status', 'upcoming')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .range(from, to);
      
      if (selectedRegion !== 'all') {
        query = query.eq('region', selectedRegion);
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      return { events: data as Event[], total: count || 0 };
    },
  });

  // Dynamic stats for hero
  const { data: eventStats } = useQuery({
    queryKey: ['event-stats'],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'upcoming')
        .gte('start_date', new Date().toISOString());
      
      const { data: countries } = await supabase
        .from('events')
        .select('country')
        .eq('status', 'upcoming')
        .gte('start_date', new Date().toISOString());
      
      const uniqueCountries = new Set(countries?.map(c => c.country)).size;
      return { totalEvents: count || 0, totalCountries: uniqueCountries };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          // Efficiently refetch only events data without full page reload
          queryClient.invalidateQueries({ queryKey: ['events'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset page when region changes
  useEffect(() => {
    setPage(1);
  }, [selectedRegion]);

  // Memoize filtered events to avoid recalculating on every render
  const { featuredEvents, upcomingEvents } = useMemo(() => {
    if (!events?.events) return { featuredEvents: [], upcomingEvents: [] };

    // Apply search + quick filters first
    let filtered = events.events;
    
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
      );
    }

    if (quickFilter) {
      const now = new Date();
      if (quickFilter === 'this-week') {
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        filtered = filtered.filter(e => new Date(e.start_date) <= weekEnd);
      } else if (quickFilter === 'this-month') {
        const monthEnd = endOfMonth(now);
        filtered = filtered.filter(e => new Date(e.start_date) <= monthEnd);
      } else if (quickFilter === 'apac') {
        filtered = filtered.filter(e => e.region === 'APAC');
      } else if (quickFilter === 'free') {
        filtered = filtered.filter(e => 
          e.event_type.toLowerCase().includes('free') ||
          e.title.toLowerCase().includes('free') ||
          (e.description && e.description.toLowerCase().includes('free'))
        );
      }
    }

    // Featured events should be APAC-specific with complete data
    let featured = filtered.filter(event => 
      event.is_featured && 
      event.region === 'APAC' && 
      event.description && 
      event.website_url
    );
    
    let upcoming = filtered.filter(event => !event.is_featured || event.region !== 'APAC');
    
    if (featured.length < 2) {
      const apacEvents = filtered.filter(event => 
        event.region === 'APAC' && 
        !event.is_featured && 
        event.description && 
        event.website_url
      );
      const needed = 2 - featured.length;
      const additionalFeatured = apacEvents.slice(0, needed);
      featured = [...featured, ...additionalFeatured];
      upcoming = upcoming.filter(e => !additionalFeatured.some(f => f.id === e.id));
    }

    return { featuredEvents: featured, upcomingEvents: upcoming };
  }, [events?.events, searchQuery, quickFilter]);

  const formatEventDate = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    if (!endDate) {
      return format(start, 'MMM dd, yyyy');
    }
    const end = new Date(endDate);
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${format(start, 'MMM dd')}-${format(end, 'dd, yyyy')}`;
    }
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
  };

  return (
    <>
      <SEOHead
        title="AI Events & Conferences Calendar"
        description="Discover upcoming AI conferences, summits, and workshops across Asia Pacific and globally. Stay updated with the latest artificial intelligence events."
        canonical="https://aiinasia.com/events"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
      />
      
      {/* Event Structured Data for Featured Events */}
      {featuredEvents && featuredEvents.map((event) => (
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
        
        {/* Hero Section with gradient background */}
        <section className="relative overflow-hidden" style={{
          background: `
            radial-gradient(ellipse 60% 50% at 15% 20%, hsl(var(--primary) / 0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 85% 70%, rgba(95, 114, 255, 0.08) 0%, transparent 60%),
            linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))
          `
        }}>
          <div className="container mx-auto px-4 pt-12 pb-20 md:pt-20 md:pb-24">
            {/* Breadcrumb */}
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

            {/* Top row: pill + submit link */}
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

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.15] tracking-tight mb-5 max-w-3xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              The Largest AI Events Directory{' '}
              <br className="hidden md:block" />
              Focused on Asia-Pacific
            </h1>

            {/* Dynamic stats line */}
            <p className="text-base md:text-lg text-muted-foreground mb-8">
              Tracking{' '}
              <span className="text-primary font-semibold">{eventStats?.totalEvents ?? '—'}</span>
              {' '}events across{' '}
              <span className="text-primary font-semibold">{eventStats?.totalCountries ?? '—'}</span>
              {' '}countries — updated daily from 12+ sources
            </p>

            {/* Search bar */}
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

            {/* Quick-filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'this-week', label: 'This Week' },
                { id: 'this-month', label: 'This Month' },
                { id: 'apac', label: 'APAC' },
                { id: 'free', label: 'Free Events' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setQuickFilter(prev => prev === filter.id ? null : filter.id)}
                  className={`flex-shrink-0 text-xs font-medium rounded-full px-4 py-1.5 border transition-colors ${
                    quickFilter === filter.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/40'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </section>

        <main className="flex-1 container mx-auto px-4 py-8">

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          ) : (
            <>
              {/* Featured Events */}
              {featuredEvents && featuredEvents.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    Featured Events
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {featuredEvents.map((event) => (
                      <Card key={event.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <Badge className="bg-primary text-primary-foreground">
                              {event.event_type}
                            </Badge>
                            <Badge variant="outline">{event.region}</Badge>
                          </div>
                          <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                          <CardDescription>
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <Calendar className="w-4 h-4" />
                              {formatEventDate(event.start_date, event.end_date)}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4" />
                              {event.city}, {event.country}
                            </div>
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {event.description}
                          </p>
                          {event.organizer && (
                            <p className="text-xs text-muted-foreground mb-4">
                              Organized by {event.organizer}
                            </p>
                          )}
                          <div className="flex gap-2">
                            {event.website_url && (
                              <Button variant="default" size="sm" asChild>
                                <a href={event.website_url} target="_blank" rel="noopener noreferrer">
                                  <Globe className="w-4 h-4 mr-2" />
                                  Visit Website
                                </a>
                              </Button>
                            )}
                            {event.registration_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Register
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* All Upcoming Events */}
              <section>
                <h2 className="text-2xl font-bold mb-6">All Upcoming Events</h2>
                <div className="space-y-4">
                  {upcomingEvents && upcomingEvents.length > 0 ? (
                    <>
                      {upcomingEvents.map((event) => (
                        <Card key={event.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">{event.event_type}</Badge>
                                  <Badge variant="secondary">{event.region}</Badge>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {formatEventDate(event.start_date, event.end_date)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {event.city}, {event.country}
                                  </span>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {event.website_url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={event.website_url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Learn More about {event.title}
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Load More Button */}
                      {events && events.total > page * EVENTS_PER_PAGE && (
                        <div className="text-center mt-8">
                          <Button 
                            onClick={() => setPage(p => p + 1)}
                            variant="outline"
                            size="lg"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                Load More Events
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({page * EVENTS_PER_PAGE} of {events.total})
                                </span>
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No events found matching your search.</p>
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

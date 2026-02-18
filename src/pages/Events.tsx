import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, ExternalLink, Globe, Users, Loader2 } from "lucide-react";
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

  // Subscribe to realtime updates - use query invalidation instead of reload
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

    // Featured events should be APAC-specific with complete data
    let featured = events.events.filter(event => 
      event.is_featured && 
      event.region === 'APAC' && 
      event.description && 
      event.website_url
    );
    
    let upcoming = events.events.filter(event => !event.is_featured || event.region !== 'APAC');
    
    // If we have fewer than 2 APAC featured events, find more with complete data
    if (featured.length < 2) {
      const apacEvents = events.events.filter(event => 
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
  }, [events?.events]);

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
        
        <main className="flex-1 container mx-auto px-4 py-12">
          <Breadcrumb className="mb-6">
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
          
          {/* Hero Section */}
          <section className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-semibold">AI Events Calendar</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Upcoming AI Conferences & Events
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with the global AI community at premier conferences, workshops, and summits across Asia and beyond.
            </p>
          </section>

          {/* Region Filter */}
          <Tabs defaultValue="all" className="mb-8" onValueChange={setSelectedRegion}>
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
              <TabsTrigger value="all">All Regions</TabsTrigger>
              <TabsTrigger value="APAC">APAC</TabsTrigger>
              <TabsTrigger value="Americas">Americas</TabsTrigger>
              <TabsTrigger value="EMEA">EMEA</TabsTrigger>
            </TabsList>
          </Tabs>

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
                        <p className="text-muted-foreground">No events found for the selected region.</p>
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

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  end_date?: string;
  location: string;
  city: string;
  country: string;
  region: string;
  event_type: string;
  website_url?: string;
  registration_url?: string;
  is_featured: boolean;
}

export const UpcomingEvents = () => {
  const { data: events, isLoading } = useQuery({
    queryKey: ['upcoming-events-widget'],
    queryFn: async () => {
      // Fetch APAC events first
      const { data: apacEvents, error: apacError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'upcoming')
        .eq('region', 'APAC')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(2);

      if (apacError) throw apacError;

      // Fetch 1 non-APAC event
      const { data: westernEvents, error: westernError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'upcoming')
        .neq('region', 'APAC')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(1);

      if (westernError) throw westernError;

      // Combine: 2 APAC + 1 Western, and filter out any past events
      const allEvents = [...(apacEvents || []), ...(westernEvents || [])];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return allEvents.filter(event => new Date(event.start_date) >= today) as Event[];
    },
  });

  const formatEventDate = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    if (!endDate) return format(start, 'MMM d, yyyy');
    
    const end = new Date(endDate);
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'MMM d')}-${format(end, 'd, yyyy')}`;
    }
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Upcoming AI Events</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Upcoming AI Events</h2>
            <p className="text-muted-foreground">
              Join the latest AI conferences, workshops, and meetups across the globe
            </p>
          </div>
          <Link to="/events">
            <Button variant="outline" className="gap-2">
              View All Events <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {event.event_type}
                  </Badge>
                  {event.is_featured && (
                    <Badge variant="default">Featured</Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatEventDate(event.start_date, event.end_date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.city}, {event.country}</span>
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      {event.region}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {event.website_url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      asChild
                    >
                      <a href={event.website_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        Website
                      </a>
                    </Button>
                  )}
                  {event.registration_url && (
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1"
                      asChild
                    >
                      <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                        Register
                      </a>
                    </Button>
                  )}
                  {!event.website_url && !event.registration_url && (
                    <Link to={`/events`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

import { useState } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CalendarRange, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import Header from "@/components/Header";

const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(Calendar);

interface EventDropArgs {
  event: CalendarEvent;
  start: Date;
  end: Date;
}

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  author: string;
  authorId: string;
  categoryName: string;
  categoryColor: string;
  status: string;
  slug: string;
}

// Generate consistent color from author ID
const getAuthorColor = (authorId: string): string => {
  const colors = [
    "hsl(210, 80%, 45%)", // Blue
    "hsl(340, 75%, 45%)", // Pink
    "hsl(280, 65%, 50%)", // Purple
    "hsl(160, 60%, 40%)", // Teal
    "hsl(25, 75%, 50%)",  // Orange
    "hsl(45, 85%, 50%)",  // Yellow
    "hsl(140, 55%, 45%)", // Green
    "hsl(190, 70%, 45%)", // Cyan
  ];
  
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Category-specific colors
const getCategoryColor = (categoryName: string): string => {
  const categoryColors: Record<string, string> = {
    "News": "hsl(0, 85%, 45%)",      // Red
    "Business": "hsl(210, 85%, 40%)", // Blue
    "Life": "hsl(280, 65%, 50%)",     // Purple
    "Learn": "hsl(45, 90%, 45%)",     // Yellow/Gold
    "Create": "hsl(340, 75%, 45%)",   // Pink/Magenta
    "AI Policy Atlas": "hsl(160, 60%, 35%)", // Teal/Green
    "Voices": "hsl(25, 75%, 50%)",    // Orange
  };
  
  return categoryColors[categoryName] || "hsl(220, 15%, 50%)"; // Default gray
};

const ContentCalendar = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());

  const { data: articles, isLoading } = useQuery({
    queryKey: ["calendar-articles"],
    queryFn: async () => {
      // Fetch scheduled articles
      const { data: scheduledData, error: scheduledError } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          status,
          scheduled_for,
          published_at,
          author_id,
          authors (
            id,
            name
          ),
          primary_category_id,
          categories:categories!articles_primary_category_id_fkey (
            id,
            name,
            color
          )
        `)
        .eq("status", "scheduled")
        .not("scheduled_for", "is", null)
        .order("scheduled_for", { ascending: true });

      // Fetch recently published articles (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: publishedData, error: publishedError } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          status,
          scheduled_for,
          published_at,
          author_id,
          authors (
            id,
            name
          ),
          primary_category_id,
          categories:categories!articles_primary_category_id_fkey (
            id,
            name,
            color
          )
        `)
        .eq("status", "published")
        .not("published_at", "is", null)
        .gte("published_at", thirtyDaysAgo.toISOString())
        .order("published_at", { ascending: false });

      if (scheduledError) {
        console.error("Error fetching scheduled articles:", scheduledError);
        throw scheduledError;
      }
      if (publishedError) {
        console.error("Error fetching published articles:", publishedError);
        throw publishedError;
      }

      return [...(scheduledData || []), ...(publishedData || [])];
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, scheduled_for }: { id: string; scheduled_for: string }) => {
      const { error } = await supabase
        .from("articles")
        .update({ scheduled_for })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-articles"] });
      toast.success("Article rescheduled successfully");
    },
    onError: (error) => {
      toast.error("Failed to reschedule article: " + error.message);
    },
  });

  const events: CalendarEvent[] = (articles || []).map((article) => {
    const eventDate = article.status === "scheduled" 
      ? new Date(article.scheduled_for!) 
      : new Date(article.published_at!);
    
    return {
      id: article.id,
      title: article.title,
      start: eventDate,
      end: new Date(eventDate.getTime() + 3 * 60 * 60 * 1000), // 3 hour duration
      author: article.authors?.name || "Unknown Author",
      authorId: article.author_id || "unknown",
      categoryName: article.categories?.name || "Uncategorized",
      categoryColor: article.categories?.color || "#999999",
      status: article.status,
      slug: article.slug,
    };
  });

  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/editor?id=${event.id}`);
  };

  const handleEventDrop = ({ event, start }: EventDropArgs) => {
    updateArticleMutation.mutate({
      id: event.id,
      scheduled_for: start.toISOString(),
    });
  };

  const handleEventResize = ({ event, start }: EventDropArgs) => {
    updateArticleMutation.mutate({
      id: event.id,
      scheduled_for: start.toISOString(),
    });
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const categoryColor = getCategoryColor(event.categoryName);
    const authorColor = getAuthorColor(event.authorId);
    const isPublished = event.status === "published";
    
    return {
      style: {
        backgroundColor: categoryColor,
        color: "white",
        borderRadius: "6px",
        border: `2px solid ${authorColor}`,
        borderLeft: `6px solid ${authorColor}`,
        display: "flex",
        flexDirection: "column" as const,
        fontSize: "0.8rem",
        fontWeight: "500",
        opacity: isPublished ? 0.7 : 1,
        padding: "6px 10px",
        overflow: "visible",
        whiteSpace: "normal" as const,
        lineHeight: "1.3",
      },
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Content Calendar</h1>
          <p className="text-muted-foreground">
            View and manage your scheduled articles
          </p>
        </div>

        <Card className="p-6 bg-card border-border">
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={view === "month" ? "default" : "outline"}
              onClick={() => setView("month")}
              className="gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              Month
            </Button>
            <Button
              variant={view === "week" ? "default" : "outline"}
              onClick={() => setView("week")}
              className="gap-2"
            >
              <CalendarRange className="h-4 w-4" />
              Week
            </Button>
            <Button
              variant={view === "day" ? "default" : "outline"}
              onClick={() => setView("day")}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Day
            </Button>
            <Button
              variant={view === "agenda" ? "default" : "outline"}
              onClick={() => setView("agenda")}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Schedule
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[600px] w-full" />
            </div>
          ) : (
            <div className="calendar-wrapper">
              <DragAndDropCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 800 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                eventPropGetter={eventStyleGetter}
                resizable
                min={new Date(2024, 0, 1, 7, 0, 0)}
                max={new Date(2024, 0, 1, 19, 0, 0)}
                step={60}
                timeslots={1}
                components={{
                  event: ({ event }: { event: CalendarEvent }) => (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                        👤 {event.author}
                      </div>
                    </div>
                  ),
                }}
              />
            </div>
          )}

          {!isLoading && events.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No articles found</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ContentCalendar;

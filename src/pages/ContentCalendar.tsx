import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CalendarRange, Calendar as CalendarIcon } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Header from "@/components/Header";

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
  slug: string;
}

const ContentCalendar = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());

  const { data: scheduledArticles, isLoading } = useQuery({
    queryKey: ["scheduled-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          scheduled_for,
          authors (
            name
          )
        `)
        .eq("status", "scheduled")
        .not("scheduled_for", "is", null)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const events: CalendarEvent[] = (scheduledArticles || []).map((article) => {
    const scheduledDate = new Date(article.scheduled_for!);
    return {
      id: article.id,
      title: article.title,
      start: scheduledDate,
      end: new Date(scheduledDate.getTime() + 60 * 60 * 1000), // 1 hour duration for display
      author: article.authors?.name || "Unknown Author",
      slug: article.slug,
    };
  });

  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/editor?id=${event.id}`);
  };

  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        borderRadius: "4px",
        border: "none",
        display: "block",
        fontSize: "0.875rem",
        fontWeight: "500",
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
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                tooltipAccessor={(event) => 
                  `${event.title}\nAuthor: ${event.author}\nScheduled: ${format(event.start, "PPpp")}`
                }
              />
            </div>
          )}

          {!isLoading && events.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No scheduled articles found</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ContentCalendar;

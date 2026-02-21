import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  eachDayOfInterval,
  isWithinInterval,
  addWeeks,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import EventCard from "@/components/events/EventCard";

interface CalendarEvent {
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
  registration_url?: string | null;
  is_featured?: boolean;
  organizer: string | null;
  status?: string;
}

interface Props {
  events: CalendarEvent[];
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  conference: "#5F72FF",
  summit: "hsl(168, 100%, 41%)",
  meetup: "#4CAF50",
  workshop: "#FF9800",
  hackathon: "#FF9800",
  webinar: "#9E9E9E",
};

const LEGEND_ITEMS = [
  { type: "Conference", color: "#5F72FF" },
  { type: "Summit", color: "hsl(168, 100%, 41%)" },
  { type: "Meetup", color: "#4CAF50" },
  { type: "Workshop", color: "#FF9800" },
  { type: "Webinar", color: "#9E9E9E" },
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getEventDot(eventType: string): string {
  const key = eventType.toLowerCase();
  return EVENT_TYPE_COLORS[key] || "#9E9E9E";
}

function getEventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => {
    const start = new Date(e.start_date);
    const end = e.end_date ? new Date(e.end_date) : start;
    // Normalise to date-only comparisons
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const evStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const evEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return dayStart >= evStart && dayStart <= evEnd;
  });
}

export default function EventsCalendarView({ events }: Props) {
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [mobileWeekStart, setMobileWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Desktop: build grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Mobile: week days
  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: mobileWeekStart, end: addDays(mobileWeekStart, 6) });
  }, [mobileWeekStart]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return getEventsOnDay(events, selectedDay);
  }, [selectedDay, events]);

  const goToToday = () => {
    setCurrentMonth(new Date());
    setMobileWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setSelectedDay(new Date());
  };

  const navigateMonth = (dir: number) => {
    const next = dir > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1);
    setCurrentMonth(next);
    if (isMobile) {
      setMobileWeekStart(startOfWeek(startOfMonth(next), { weekStartsOn: 1 }));
    }
  };

  const navigateWeek = (dir: number) => {
    const next = dir > 0 ? addWeeks(mobileWeekStart, 1) : subWeeks(mobileWeekStart, 1);
    setMobileWeekStart(next);
    // Update month header if week crosses into new month
    const midWeek = addDays(next, 3);
    if (!isSameMonth(midWeek, currentMonth)) {
      setCurrentMonth(midWeek);
    }
  };

  // Desktop grid cell
  const DayCell = ({ day }: { day: Date }) => {
    const inMonth = isSameMonth(day, currentMonth);
    const today = isToday(day);
    const dayEvents = getEventsOnDay(events, day);
    const hasEvents = dayEvents.length > 0;
    const isSelected = selectedDay && isSameDay(day, selectedDay);

    return (
      <button
        onClick={() => hasEvents ? setSelectedDay(day) : setSelectedDay(null)}
        className={cn(
          "relative flex flex-col items-start p-1.5 md:p-2 min-h-[72px] md:min-h-[80px] border-b border-r border-border/30 transition-colors text-left",
          !inMonth && "opacity-30",
          hasEvents && "hover:bg-muted/30 cursor-pointer",
          !hasEvents && "cursor-default",
          isSelected && "bg-primary/10"
        )}
      >
        <span
          className={cn(
            "text-xs md:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
            today && "bg-primary text-primary-foreground",
            !today && "text-foreground"
          )}
        >
          {format(day, "d")}
        </span>
        {hasEvents && (
          <div className="flex items-center gap-0.5 mt-1 flex-wrap">
            {dayEvents.slice(0, 3).map((e, i) => (
              <span
                key={e.id + "-" + i}
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getEventDot(e.event_type) }}
              />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-[9px] text-muted-foreground ml-0.5">
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  // Mobile day cell
  const MobileDayCell = ({ day }: { day: Date }) => {
    const today = isToday(day);
    const dayEvents = getEventsOnDay(events, day);
    const hasEvents = dayEvents.length > 0;
    const isSelected = selectedDay && isSameDay(day, selectedDay);

    return (
      <button
        onClick={() => setSelectedDay(day)}
        className={cn(
          "flex flex-col items-center py-2 px-1 flex-1 min-w-0 rounded-lg transition-colors",
          isSelected && "bg-primary/15",
          !isSelected && hasEvents && "hover:bg-muted/30"
        )}
      >
        <span className="text-[10px] text-muted-foreground uppercase">
          {format(day, "EEE")}
        </span>
        <span
          className={cn(
            "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mt-0.5",
            today && "bg-primary text-primary-foreground",
            isSelected && !today && "ring-1 ring-primary"
          )}
        >
          {format(day, "d")}
        </span>
        {hasEvents && (
          <div className="flex gap-0.5 mt-1">
            {dayEvents.slice(0, 3).map((e, i) => (
              <span
                key={e.id + "-" + i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: getEventDot(e.event_type) }}
              />
            ))}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Month Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => isMobile ? navigateWeek(-1) : navigateMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3
              className="text-lg font-extrabold min-w-[160px] text-center"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => isMobile ? navigateWeek(1) : navigateMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-7">
            Today
          </Button>
        </div>

        {/* Desktop Grid */}
        {!isMobile && (
          <div>
            <div className="grid grid-cols-7 border-b border-border/50">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-muted-foreground py-2 border-r border-border/30 last:border-r-0"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => (
                <DayCell key={i} day={day} />
              ))}
            </div>
          </div>
        )}

        {/* Mobile Week Strip */}
        {isMobile && (
          <div className="flex border-b border-border/30">
            {weekDays.map((day, i) => (
              <MobileDayCell key={i} day={day} />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.type}
          </div>
        ))}
      </div>

      {/* Selected Day Events */}
      {selectedDay && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">
            Events on {format(selectedDay, "EEEE, MMMM d, yyyy")}
          </h3>
          {selectedDayEvents.length > 0 ? (
            <div className="space-y-4">
              {selectedDayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No events on this date.</p>
          )}
        </div>
      )}
    </div>
  );
}

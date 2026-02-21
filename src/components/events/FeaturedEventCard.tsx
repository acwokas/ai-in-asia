import { format, differenceInCalendarDays, isWithinInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ExternalLink, CalendarPlus, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface FeaturedEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string;
  city: string;
  country: string;
  region: string;
  website_url: string | null;
  organizer: string | null;
  editorial_note?: string | null;
  is_sponsored?: boolean;
}

interface FeaturedEventCardProps {
  event: FeaturedEvent;
}

const getCountdown = (startDate: string, endDate: string | null) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  if (now > end && differenceInCalendarDays(now, end) > 0) {
    return { label: "Completed", style: "text-muted-foreground", pulse: false };
  }
  if (isWithinInterval(now, { start, end }) || differenceInCalendarDays(start, now) === 0) {
    return { label: "Happening Now", style: "text-primary", pulse: true };
  }
  const days = differenceInCalendarDays(start, now);
  if (days === 1) return { label: "Starting Tomorrow", style: "text-primary font-semibold", pulse: false };
  if (days <= 7) return { label: `In ${days} days`, style: "text-primary font-semibold", pulse: false };
  if (days <= 30) return { label: `In ${days} days`, style: "text-foreground", pulse: false };
  return { label: `In ${days} days`, style: "text-muted-foreground", pulse: false };
};

const formatSmartDate = (startDate: string, endDate: string | null) => {
  const start = new Date(startDate);
  const currentYear = new Date().getFullYear();
  const showYear = start.getFullYear() !== currentYear;
  if (!endDate) return format(start, showYear ? "MMM dd, yyyy" : "MMM dd");
  const end = new Date(endDate);
  const endShowYear = end.getFullYear() !== currentYear;
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM dd")}-${format(end, endShowYear ? "dd, yyyy" : "dd")}`;
  }
  return `${format(start, "MMM dd")} - ${format(end, endShowYear ? "MMM dd, yyyy" : "MMM dd")}`;
};

const generateICS = (event: FeaturedEvent): string => {
  const fmtDate = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = fmtDate(event.start_date);
  const end = event.end_date ? fmtDate(event.end_date) : start;
  const desc = (event.description || "").replace(/\n/g, "\\n").slice(0, 500);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AIinAsia//Events//EN",
    "BEGIN:VEVENT", `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${event.title}`, `DESCRIPTION:${desc}`,
    `LOCATION:${event.city}, ${event.country}`,
    event.website_url ? `URL:${event.website_url}` : "",
    `UID:${event.id}@aiinasia.com`, "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
};

const FeaturedEventCard = ({ event }: FeaturedEventCardProps) => {
  const countdown = getCountdown(event.start_date, event.end_date);
  const isSponsored = event.is_sponsored === true;

  const handleAddToCalendar = () => {
    const ics = generateICS(event);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detect free from text heuristics
  const isFree =
    event.event_type.toLowerCase().includes("free") ||
    event.title.toLowerCase().includes("free") ||
    (event.description && event.description.toLowerCase().includes("free"));

  return (
    <div className="relative group rounded-xl p-[1px] transition-all hover:shadow-lg hover:shadow-primary/5"
      style={{
        background: isSponsored
          ? "linear-gradient(135deg, hsl(45 80% 55% / 0.4), hsl(35 90% 45% / 0.2), hsl(var(--border)))"
          : "linear-gradient(135deg, hsl(var(--primary) / 0.5), hsl(230 100% 66% / 0.3), hsl(var(--border)))",
      }}
    >
      <div className="rounded-[11px] bg-card p-5 md:p-6 h-full flex flex-col">
        {/* Top label + region */}
        <div className="flex items-center justify-between mb-3">
          {isSponsored ? (
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "hsl(45 80% 55%)" }}>
              Sponsored
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
              Editor's Pick
            </span>
          )}
          <Badge variant="outline" className="text-muted-foreground text-[10px]">
            {event.region}
          </Badge>
        </div>

        {/* Event name */}
        <h3 className="text-lg md:text-xl font-extrabold mb-3 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {event.website_url ? (
            <a
              href={event.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              {event.title}
            </a>
          ) : (
            event.title
          )}
        </h3>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground mb-3">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {formatSmartDate(event.start_date, event.end_date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {event.city}, {event.country}
          </span>
        </div>

        {/* Info pills row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">{event.event_type}</Badge>
          {isFree && (
            <span className="text-xs font-medium text-primary">Free</span>
          )}
          {event.organizer && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {event.organizer}
            </span>
          )}
        </div>

        {/* Editorial quote */}
        {event.editorial_note && (
          <div className="border-l-2 border-primary/40 pl-3 mb-4">
            <p className="text-sm italic text-muted-foreground/80 leading-relaxed">
              "{event.editorial_note}"
            </p>
          </div>
        )}

        {/* Spacer to push bottom content down */}
        <div className="flex-1" />

        {/* Countdown */}
        <div className={`flex items-center gap-1.5 text-sm font-medium mb-3 ${countdown.style}`}>
          {countdown.pulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
          {countdown.label}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {event.website_url && (
            <a
              href={event.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Visit Website <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={handleAddToCalendar}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add to Calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedEventCard;

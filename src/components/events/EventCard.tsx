import { useState } from "react";
import { format, differenceInCalendarDays, isWithinInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Link as LinkIcon, ExternalLink, CalendarPlus, Share2, Bookmark, BookmarkCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface EventCardEvent {
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
}

interface EventCardProps {
  event: EventCardEvent;
}

const getFormatFromLocation = (location: string): string => {
  const loc = (location || "").toLowerCase();
  if (loc.includes("hybrid")) return "Hybrid";
  if (loc.includes("virtual") || loc.includes("online")) return "Virtual";
  return "In-Person";
};

const FORMAT_STYLES: Record<string, string> = {
  "In-Person": "bg-[hsl(122_39%_49%/0.15)] text-[hsl(122_39%_49%)] border-[hsl(122_39%_49%/0.2)]",
  "Virtual": "bg-[hsl(291_47%_51%/0.15)] text-[hsl(291_47%_60%)] border-[hsl(291_47%_51%/0.2)]",
  "Hybrid": "bg-[hsl(36_100%_50%/0.15)] text-[hsl(36_100%_65%)] border-[hsl(36_100%_50%/0.2)]",
};

const getCountdown = (startDate: string, endDate: string | null) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  if (now > end && differenceInCalendarDays(now, end) > 0) {
    return { label: "Completed", style: "text-muted-foreground", pulse: false, completed: true };
  }

  if (isWithinInterval(now, { start, end }) || differenceInCalendarDays(start, now) === 0) {
    return { label: "Happening Now", style: "text-primary", pulse: true, completed: false };
  }

  const days = differenceInCalendarDays(start, now);
  if (days === 1) return { label: "Tomorrow", style: "text-primary", pulse: false, completed: false };
  if (days <= 7) return { label: `In ${days} days`, style: "text-primary", pulse: false, completed: false };
  if (days <= 30) return { label: `In ${days} days`, style: "text-foreground", pulse: false, completed: false };
  return { label: `In ${days} days`, style: "text-muted-foreground", pulse: false, completed: false };
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

const extractDomain = (url: string | null): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const generateICS = (event: EventCardEvent): string => {
  const formatICSDate = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = formatICSDate(event.start_date);
  const end = event.end_date ? formatICSDate(event.end_date) : start;
  const desc = (event.description || "").replace(/\n/g, "\\n").slice(0, 500);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AIinAsia//Events//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${event.city}, ${event.country}`,
    event.website_url ? `URL:${event.website_url}` : "",
    `UID:${event.id}@aiinasia.com`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
};

const SAVED_KEY = "aiia-saved-events";

const getSavedEvents = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const toggleSaved = (id: string): boolean => {
  const saved = getSavedEvents();
  const nowSaved = !saved.has(id);
  if (nowSaved) saved.add(id); else saved.delete(id);
  localStorage.setItem(SAVED_KEY, JSON.stringify([...saved]));
  return nowSaved;
};

const EventCard = ({ event }: EventCardProps) => {
  const [isSaved, setIsSaved] = useState(() => getSavedEvents().has(event.id));
  const countdown = getCountdown(event.start_date, event.end_date);
  const eventFormat = getFormatFromLocation(event.location);
  const domain = extractDomain(event.website_url);
  const isThisWeek = (() => {
    const days = differenceInCalendarDays(new Date(event.start_date), new Date());
    return days >= 0 && days <= 7;
  })();

  const descIsUseful = event.description &&
    !event.description.toLowerCase().startsWith(event.title.toLowerCase().slice(0, 20));

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

  const handleShare = async () => {
    const url = event.website_url || `https://aiinasia.com/events`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!", { description: "Event link has been copied to your clipboard." });
  };

  const handleSave = () => {
    const nowSaved = toggleSaved(event.id);
    setIsSaved(nowSaved);
    toast(nowSaved ? "Event saved" : "Event removed");
  };

  return (
    <Card
      className={`transition-all hover:brightness-110 ${countdown.completed ? "opacity-70" : ""} ${isThisWeek && !countdown.completed ? "border-l-[3px] border-l-primary" : ""}`}
    >
      <CardContent className="p-5 md:p-6">
        {/* Row 1: Pills + Countdown */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge className="bg-primary/15 text-primary border-primary/20 hover:bg-primary/20">{event.event_type}</Badge>
          <Badge variant="outline" className="text-muted-foreground">{event.region}</Badge>
          <Badge className={`text-xs ${FORMAT_STYLES[eventFormat] || ""}`}>{eventFormat}</Badge>
          <div className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${countdown.style}`}>
            {countdown.pulse && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
            {countdown.label}
          </div>
        </div>

        {/* Row 2: Event Name */}
        <h3 className="text-lg md:text-xl font-bold mb-2 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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

        {/* Row 3: Metadata — wider spacing */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-2">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {formatSmartDate(event.start_date, event.end_date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {event.city}, {event.country}
          </span>
          {domain && (
            <span className="inline-flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5 shrink-0" />
              {domain}
            </span>
          )}
        </div>

        {/* Row 4: Description (optional) */}
        {descIsUseful && (
          <p className="text-sm text-muted-foreground/70 line-clamp-1 mb-3">{event.description}</p>
        )}

        {/* Row 5: Actions */}
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {event.website_url && (
            <a
              href={event.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1.5 rounded-md hover:bg-primary/10"
            >
              Visit Website <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleAddToCalendar}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-muted/50"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add to Calendar</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">Add to Calendar</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-muted/50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">Share</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSave}
                  className={`inline-flex items-center gap-1.5 text-sm transition-colors px-2 py-1.5 rounded-md hover:bg-muted/50 ${isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">{isSaved ? "Saved" : "Save"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventCard;

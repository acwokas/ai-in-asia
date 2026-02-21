import { useMemo } from "react";
import EventCard from "@/components/events/EventCard";
import type { EventAdSlotRow } from "@/hooks/useEventAdSlots";

interface EventPostFilterAdProps {
  postFilterSlots: EventAdSlotRow[];
  activeRegion: string;
  activeType: string;
  events: any[];
}

export default function EventPostFilterAd({
  postFilterSlots,
  activeRegion,
  activeType,
  events,
}: EventPostFilterAdProps) {
  const hasActiveFilters = activeRegion !== "all" || activeType !== "all";

  const matchedSlot = useMemo(() => {
    if (!hasActiveFilters || postFilterSlots.length === 0) return null;
    // Find a slot whose filter_region/filter_type matches
    return postFilterSlots.find((s) => {
      const regionMatch = !s.filter_region || s.filter_region === activeRegion;
      const typeMatch = !s.filter_type || s.filter_type.toLowerCase() === activeType.toLowerCase();
      return regionMatch && typeMatch;
    }) || null;
  }, [hasActiveFilters, postFilterSlots, activeRegion, activeType]);

  // Find the sponsored event to display
  const sponsoredEvent = useMemo(() => {
    if (!matchedSlot) return null;
    // Look for a sponsored event in the events list
    return events.find((e: any) => e.is_sponsored) || null;
  }, [matchedSlot, events]);

  if (!matchedSlot || !sponsoredEvent) return null;

  return (
    <div className="mb-4">
      <div className="relative border-l-[3px] rounded-lg overflow-hidden" style={{ borderLeftColor: "hsl(45 80% 55%)" }}>
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
            Recommended
          </span>
          <span className="text-[9px] text-muted-foreground/40 uppercase">Sponsored</span>
        </div>
        <EventCard event={sponsoredEvent} />
      </div>
    </div>
  );
}

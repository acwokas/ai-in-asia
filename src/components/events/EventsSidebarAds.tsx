import EventAdSlot from "./EventAdSlot";
import type { EventAdSlotRow } from "@/hooks/useEventAdSlots";

interface EventsSidebarAdsProps {
  skyscraper: EventAdSlotRow | null;
  square: EventAdSlotRow | null;
}

export default function EventsSidebarAds({ skyscraper, square }: EventsSidebarAdsProps) {
  if (!skyscraper && !square) return null;

  return (
    <aside className="hidden lg:block w-[280px] shrink-0 space-y-4 sticky top-20">
      {skyscraper && (
        <EventAdSlot ad={skyscraper} variant="skyscraper" />
      )}
      {square && (
        <EventAdSlot ad={square} variant="square" />
      )}
    </aside>
  );
}

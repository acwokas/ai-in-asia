import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EventAdSlotRow {
  id: string;
  name: string;
  slot_type: string;
  image_url: string | null;
  click_url: string | null;
  alt_text: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  position_index: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  impression_count: number;
  click_count: number;
  filter_region: string | null;
  filter_type: string | null;
}

export function useEventAdSlots() {
  return useQuery({
    queryKey: ["event-ad-slots"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const now = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("event_ad_slots")
        .select("*")
        .eq("is_active", true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order("position_index", { ascending: true });

      if (error) throw error;
      return (data || []) as EventAdSlotRow[];
    },
  });
}

export function useAdSlotsByType(slots: EventAdSlotRow[] | undefined) {
  const midListBanners = (slots || []).filter((s) => s.slot_type === "mid_list_banner");
  const sidebarSkyscraper = (slots || []).find((s) => s.slot_type === "sidebar_skyscraper") || null;
  const sidebarSquare = (slots || []).find((s) => s.slot_type === "sidebar_square") || null;
  const postFilter = (slots || []).filter((s) => s.slot_type === "post_filter");
  const alertsSponsor = (slots || []).find((s) => s.slot_type === "alerts_sponsor") || null;

  return { midListBanners, sidebarSkyscraper, sidebarSquare, postFilter, alertsSponsor };
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  List,
  CalendarDays,
  MapPinned,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "calendar" | "map";

export interface EventFilters {
  region: string;
  type: string;
  format: string;
  date: string;
  price: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const DEFAULT_FILTERS: EventFilters = {
  region: "all",
  type: "all",
  format: "all",
  date: "all",
  price: "all",
};

const REGION_OPTIONS = [
  { value: "all", label: "All Regions" },
  { value: "APAC", label: "APAC" },
  { value: "Americas", label: "Americas" },
  { value: "EMEA", label: "EMEA" },
  { value: "MEA", label: "Middle East & Africa" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "conference", label: "Conference" },
  { value: "summit", label: "Summit" },
  { value: "meetup", label: "Meetup" },
  { value: "workshop", label: "Workshop" },
  { value: "hackathon", label: "Hackathon" },
  { value: "webinar", label: "Webinar" },
];

const FORMAT_OPTIONS = [
  { value: "all", label: "All Formats" },
  { value: "in-person", label: "In-Person" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];

const DATE_OPTIONS = [
  { value: "all", label: "All Dates" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "next-30", label: "Next 30 Days" },
  { value: "next-90", label: "Next 90 Days" },
  { value: "custom", label: "Custom Range" },
];

const PRICE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

interface Props {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  filteredCount: number;
  totalCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger
      className={cn(
        "h-9 w-auto min-w-[130px] bg-transparent border-border text-sm gap-1.5",
        value !== "all" && "text-primary border-primary/40"
      )}
    >
      <SelectValue placeholder={label} />
    </SelectTrigger>
    <SelectContent className="bg-card border-border z-50">
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default function EventsFilterBar({
  filters,
  onFiltersChange,
  filteredCount,
  totalCount,
  viewMode,
  onViewModeChange,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sticky detection
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: [1], rootMargin: "-1px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const setFilter = useCallback(
    (key: keyof EventFilters, value: string | Date | undefined) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const clearAll = () => onFiltersChange({ ...DEFAULT_FILTERS });

  const activeFilters = Object.entries(filters).filter(
    ([key, val]) =>
      key !== "dateFrom" &&
      key !== "dateTo" &&
      val !== "all" &&
      val !== undefined
  );

  const activeCount = activeFilters.length;

  const getLabelForValue = (key: string, value: string) => {
    const map: Record<string, { value: string; label: string }[]> = {
      region: REGION_OPTIONS,
      type: TYPE_OPTIONS,
      format: FORMAT_OPTIONS,
      date: DATE_OPTIONS,
      price: PRICE_OPTIONS,
    };
    return map[key]?.find((o) => o.value === value)?.label ?? value;
  };

  const removeFilter = (key: string) => {
    const next = { ...filters, [key]: "all" };
    if (key === "date") {
      next.dateFrom = undefined;
      next.dateTo = undefined;
    }
    onFiltersChange(next);
  };

  // Desktop filter row
  const filterControls = (
    <>
      <FilterSelect
        label="Region"
        value={filters.region}
        options={REGION_OPTIONS}
        onChange={(v) => setFilter("region", v)}
      />
      <FilterSelect
        label="Type"
        value={filters.type}
        options={TYPE_OPTIONS}
        onChange={(v) => setFilter("type", v)}
      />
      <FilterSelect
        label="Format"
        value={filters.format}
        options={FORMAT_OPTIONS}
        onChange={(v) => setFilter("format", v)}
      />
      <FilterSelect
        label="Date"
        value={filters.date}
        options={DATE_OPTIONS}
        onChange={(v) => setFilter("date", v)}
      />
      {filters.date === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs border-border gap-1.5"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {filters.dateFrom && filters.dateTo
                ? `${format(filters.dateFrom, "MMM d")} – ${format(filters.dateTo, "MMM d")}`
                : "Pick range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
            <Calendar
              mode="range"
              selected={
                filters.dateFrom && filters.dateTo
                  ? { from: filters.dateFrom, to: filters.dateTo }
                  : undefined
              }
              onSelect={(range) => {
                onFiltersChange({
                  ...filters,
                  dateFrom: range?.from,
                  dateTo: range?.to,
                });
              }}
              className="p-3 pointer-events-auto"
              disabled={(date) => date < new Date()}
            />
          </PopoverContent>
        </Popover>
      )}
      <FilterSelect
        label="Price"
        value={filters.price}
        options={PRICE_OPTIONS}
        onChange={(v) => setFilter("price", v)}
      />
    </>
  );

  const viewToggles = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center border border-border rounded-md overflow-hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>List View</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn("p-2 transition-colors", viewMode === "calendar" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
              onClick={() => onViewModeChange("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Calendar View</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn("p-2 transition-colors", viewMode === "map" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
              onClick={() => onViewModeChange("map")}
            >
              <MapPinned className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Map View</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* Sentinel for sticky detection */}
      <div ref={barRef} className="h-0" />

      {/* Filter Bar */}
      <div
        className={cn(
          "sticky top-0 z-30 transition-shadow duration-200 bg-card border-b border-border",
          isSticky && "shadow-lg shadow-background/80"
        )}
      >
        <div className="container mx-auto px-4">
          {/* Desktop */}
          <div className="hidden md:flex items-center gap-3 py-3">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {filterControls}
            </div>
            {viewToggles}
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-2 py-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1 justify-center border-border"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters{activeCount > 0 && ` (${activeCount})`}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">Filter Events</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Region</label>
                    <FilterSelect label="Region" value={filters.region} options={REGION_OPTIONS} onChange={(v) => setFilter("region", v)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Type</label>
                    <FilterSelect label="Type" value={filters.type} options={TYPE_OPTIONS} onChange={(v) => setFilter("type", v)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Format</label>
                    <FilterSelect label="Format" value={filters.format} options={FORMAT_OPTIONS} onChange={(v) => setFilter("format", v)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
                    <FilterSelect label="Date" value={filters.date} options={DATE_OPTIONS} onChange={(v) => setFilter("date", v)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Price</label>
                    <FilterSelect label="Price" value={filters.price} options={PRICE_OPTIONS} onChange={(v) => setFilter("price", v)} />
                  </div>
                  {activeCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => { clearAll(); setMobileOpen(false); }} className="w-full text-muted-foreground">
                      Clear all filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            {viewToggles}
          </div>
        </div>
      </div>

      {/* Active filter pills + result count */}
      <div className="container mx-auto px-4 pt-4 pb-2">
        {activeCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {activeFilters.map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full pl-2.5 pr-1.5 py-1"
              >
                {getLabelForValue(key, value as string)}
                <button
                  onClick={() => removeFilter(key)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredCount}</span> of{" "}
          <span className="font-medium text-foreground">{totalCount}</span> events
        </p>
      </div>
    </>
  );
}

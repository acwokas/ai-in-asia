import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, LocateFixed, RotateCcw, ChevronDown, MapPin, Calendar } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MapEvent {
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

const EVENT_TYPE_COLORS: Record<string, string> = {
  conference: "#5F72FF",
  summit: "#00d4aa",
  meetup: "#4CAF50",
  workshop: "#FF9800",
  hackathon: "#FF9800",
  webinar: "#9E9E9E",
};

const LEGEND_ITEMS = [
  { type: "Conference", color: "#5F72FF" },
  { type: "Summit", color: "#00d4aa" },
  { type: "Meetup", color: "#4CAF50" },
  { type: "Workshop", color: "#FF9800" },
  { type: "Webinar", color: "#9E9E9E" },
];

const DEFAULT_CENTER: [number, number] = [110, 15];
const DEFAULT_ZOOM = 3;

// Simple city → coordinates lookup for common APAC cities
const CITY_COORDS: Record<string, [number, number]> = {
  singapore: [103.8198, 1.3521],
  "hong kong": [114.1694, 22.3193],
  tokyo: [139.6917, 35.6895],
  seoul: [126.978, 37.5665],
  beijing: [116.4074, 39.9042],
  shanghai: [121.4737, 31.2304],
  bangkok: [100.5018, 13.7563],
  "kuala lumpur": [101.6869, 3.139],
  jakarta: [106.8456, -6.2088],
  mumbai: [72.8777, 19.076],
  "new delhi": [77.1025, 28.6139],
  delhi: [77.1025, 28.6139],
  sydney: [151.2093, -33.8688],
  melbourne: [144.9631, -37.8136],
  dubai: [55.2708, 25.2048],
  "abu dhabi": [54.3773, 24.4539],
  "san francisco": [-122.4194, 37.7749],
  "new york": [-74.006, 40.7128],
  london: [-0.1276, 51.5074],
  paris: [2.3522, 48.8566],
  berlin: [13.405, 52.52],
  amsterdam: [4.9041, 52.3676],
  taipei: [121.5654, 25.033],
  manila: [120.9842, 14.5995],
  hanoi: [105.8342, 21.0278],
  "ho chi minh": [106.6297, 10.8231],
  shenzhen: [114.0579, 22.5431],
  osaka: [135.5023, 34.6937],
  riyadh: [46.6753, 24.7136],
  doha: [51.5311, 25.2854],
  "tel aviv": [34.7818, 32.0853],
  bengaluru: [77.5946, 12.9716],
  bangalore: [77.5946, 12.9716],
  hyderabad: [78.4867, 17.385],
  pune: [73.8567, 18.5204],
  chennai: [80.2707, 13.0827],
  auckland: [174.7633, -36.8485],
  perth: [115.8605, -31.9505],
  brisbane: [153.0251, -27.4698],
  austin: [-97.7431, 30.2672],
  seattle: [-122.3321, 47.6062],
  boston: [-71.0589, 42.3601],
  chicago: [-87.6298, 41.8781],
  "los angeles": [-118.2437, 34.0522],
  toronto: [-79.3832, 43.6532],
  vancouver: [-123.1216, 49.2827],
  lisbon: [-9.1393, 38.7223],
  barcelona: [2.1734, 41.3851],
  munich: [11.582, 48.1351],
  zurich: [8.5417, 47.3769],
  stockholm: [18.0686, 59.3293],
  copenhagen: [12.5683, 55.6761],
  vienna: [16.3738, 48.2082],
  prague: [14.4378, 50.0755],
  warsaw: [21.0122, 52.2297],
  rome: [12.4964, 41.9028],
  milan: [9.19, 45.4642],
  cairo: [31.2357, 30.0444],
  johannesburg: [28.0473, -26.2041],
  nairobi: [36.8219, -1.2921],
  lagos: [3.3792, 6.5244],
};

function geocodeCity(city: string, country: string): [number, number] | null {
  const key = city.toLowerCase().trim();
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // Try city, country combo partial match
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

function isVirtualEvent(location: string): boolean {
  const loc = (location || "").toLowerCase();
  return loc.includes("virtual") || loc.includes("online");
}

interface Props {
  events: MapEvent[];
}

export default function EventsMapView({ events }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersSourceRef = useRef<boolean>(false);
  const isMobile = useIsMobile();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<MapEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [showAllVisible, setShowAllVisible] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Separate physical vs virtual events
  const { physicalEvents, virtualEvents } = useMemo(() => {
    const physical: (MapEvent & { coords: [number, number] })[] = [];
    const virtual: MapEvent[] = [];
    for (const e of events) {
      if (isVirtualEvent(e.location)) {
        virtual.push(e);
      } else {
        const coords = geocodeCity(e.city, e.country);
        if (coords) {
          physical.push({ ...e, coords });
        } else {
          // Can't geocode — skip from map but include in virtual list as fallback
          virtual.push(e);
        }
      }
    }
    return { physicalEvents: physical, virtualEvents: virtual };
  }, [events]);

  // Fetch mapbox token
  useEffect(() => {
    supabase.functions.invoke("get-mapbox-token").then(({ data, error }) => {
      if (error || !data?.token) {
        setMapError("Map could not be loaded. Please try again later.");
      } else {
        setMapboxToken(data.token);
      }
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");

      if (cancelled || !mapContainerRef.current) return;

      (mapboxgl as any).accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;
        setMapLoaded(true);
      });
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersSourceRef.current = false;
        setMapLoaded(false);
      }
    };
  }, [mapboxToken]);

  // Add/update markers when map loaded or events change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remove existing source/layers
    if (markersSourceRef.current) {
      try {
        if (map.getLayer("clusters")) map.removeLayer("clusters");
        if (map.getLayer("cluster-count")) map.removeLayer("cluster-count");
        if (map.getLayer("unclustered-point")) map.removeLayer("unclustered-point");
        if (map.getSource("events")) map.removeSource("events");
      } catch {}
      markersSourceRef.current = false;
    }

    const geojson = {
      type: "FeatureCollection" as const,
      features: physicalEvents.map((e) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: e.coords },
        properties: {
          id: e.id,
          title: e.title,
          event_type: e.event_type.toLowerCase(),
          color: EVENT_TYPE_COLORS[e.event_type.toLowerCase()] || "#9E9E9E",
          start_date: e.start_date,
          end_date: e.end_date || "",
          city: e.city,
          country: e.country,
          website_url: e.website_url || "",
          description: (e.description || "").slice(0, 150),
        },
      })),
    };

    map.addSource("events", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "events",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "rgba(255,255,255,0.9)",
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30],
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(0,212,170,0.5)",
      },
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "events",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 13,
      },
      paint: { "text-color": "#111" },
    });

    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: "events",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": 7,
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(255,255,255,0.5)",
      },
    });

    markersSourceRef.current = true;

    // Click cluster → zoom
    map.on("click", "clusters", (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      const clusterId = features[0].properties.cluster_id;
      (map.getSource("events") as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        map.easeTo({ center: features[0].geometry.coordinates, zoom });
      });
    });

    // Click pin → popup
    map.on("click", "unclustered-point", (e: any) => {
      const props = e.features[0].properties;
      const coords = e.features[0].geometry.coordinates.slice();
      const startDate = format(new Date(props.start_date), "MMM dd, yyyy");
      const endDate = props.end_date ? ` - ${format(new Date(props.end_date), "MMM dd, yyyy")}` : "";
      const typeColor = props.color || "#9E9E9E";

      const html = `
        <div style="max-width:260px;font-family:system-ui,sans-serif;">
          <h3 style="font-size:14px;font-weight:700;margin:0 0 6px;color:#fff;">${props.title}</h3>
          <p style="font-size:12px;color:#aaa;margin:0 0 4px;">${startDate}${endDate}</p>
          <p style="font-size:12px;color:#aaa;margin:0 0 6px;">${props.city}, ${props.country}</p>
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:500;color:#fff;background:${typeColor};">${props.event_type}</span>
          ${props.website_url ? `<div style="margin-top:8px;"><a href="${props.website_url}" target="_blank" rel="noopener" style="color:#00d4aa;font-size:12px;text-decoration:none;">Visit Website →</a></div>` : ""}
        </div>
      `;

      const mapboxgl = (window as any).mapboxgl || map._mapboxgl;
      // Use dynamic import result cached on window
      import("mapbox-gl").then(({ default: mb }) => {
        new mb.Popup({
          closeButton: true,
          closeOnClick: true,
          className: "events-map-popup",
          maxWidth: "280px",
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      // Also select the event for the mini-list highlight
      const found = physicalEvents.find((ev) => ev.id === props.id);
      if (found) setSelectedEvent(found);
    });

    // Cursors
    map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
    map.on("mouseenter", "unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "unclustered-point", () => { map.getCanvas().style.cursor = ""; });

    // Update visible events on move
    const updateVisible = () => {
      const bounds = map.getBounds();
      const visible = physicalEvents.filter((e) => {
        const [lng, lat] = e.coords;
        return bounds.contains([lng, lat]);
      });
      setVisibleEvents(visible);
    };

    map.on("moveend", updateVisible);
    // Initial
    setTimeout(updateVisible, 500);

    return () => {
      map.off("moveend", updateVisible);
    };
  }, [mapLoaded, physicalEvents]);

  const handleResetView = useCallback(() => {
    mapRef.current?.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 1000 });
  }, []);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.easeTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 8,
          duration: 1200,
        });
      },
      () => {}
    );
  }, []);

  const displayedVisible = showAllVisible ? visibleEvents : visibleEvents.slice(0, isMobile ? 5 : visibleEvents.length);

  if (mapError) {
    return (
      <Card className="border-border">
        <CardContent className="p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{mapError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map container */}
      <div className="relative rounded-lg overflow-hidden border border-border">
        <div
          ref={mapContainerRef}
          className="w-full"
          style={{ height: isMobile ? 350 : 500 }}
        />

        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        {/* Controls */}
        {mapLoaded && (
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-card/90 backdrop-blur-sm border border-border text-xs gap-1.5 shadow-md"
              onClick={handleResetView}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset View
            </Button>
            {typeof navigator !== "undefined" && "geolocation" in navigator && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-card/90 backdrop-blur-sm border border-border text-xs gap-1.5 shadow-md"
                onClick={handleNearMe}
              >
                <LocateFixed className="w-3.5 h-3.5" /> Near Me
              </Button>
            )}
          </div>
        )}

        {/* Legend */}
        {mapLoaded && (
          <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm border border-border rounded-md px-3 py-2 shadow-md">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {LEGEND_ITEMS.map((item) => (
                <span key={item.type} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.type}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mini event list — events in current viewport */}
      {visibleEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            {visibleEvents.length} event{visibleEvents.length !== 1 ? "s" : ""} in view
          </h3>
          <div className="space-y-2">
            {displayedVisible.map((event) => (
              <div
                key={event.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedEvent?.id === event.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:border-border/80 bg-card"
                }`}
                onClick={() => {
                  setSelectedEvent(event);
                  const pe = physicalEvents.find((p) => p.id === event.id);
                  if (pe && mapRef.current) {
                    mapRef.current.easeTo({ center: (pe as any).coords, zoom: 10, duration: 800 });
                  }
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: EVENT_TYPE_COLORS[event.event_type.toLowerCase()] || "#9E9E9E" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.start_date), "MMM dd")}
                    {event.end_date ? ` - ${format(new Date(event.end_date), "MMM dd")}` : ""}
                    {" · "}
                    {event.city}, {event.country}
                  </p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] shrink-0">
                  {event.event_type}
                </Badge>
                {event.website_url && (
                  <a
                    href={event.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
          {isMobile && !showAllVisible && visibleEvents.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground"
              onClick={() => setShowAllVisible(true)}
            >
              Show {visibleEvents.length - 5} more <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Virtual events list */}
      {virtualEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {virtualEvents.length} Virtual Event{virtualEvents.length !== 1 ? "s" : ""}
          </h3>
          <div className="space-y-2">
            {virtualEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: EVENT_TYPE_COLORS[event.event_type.toLowerCase()] || "#9E9E9E" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.start_date), "MMM dd, yyyy")} · Online
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">Virtual</Badge>
                {event.website_url && (
                  <a
                    href={event.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

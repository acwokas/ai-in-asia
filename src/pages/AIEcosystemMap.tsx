import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X, Filter, ExternalLink, MapPin, Building2, GraduationCap, Landmark, Briefcase, ChevronRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  COMPANIES, COUNTRIES, LAYER_COLORS, LAYER_LABELS, SECTORS, FUNDING_STAGES,
  getCompaniesForCountry, getCountryBySlug, getCountryStats,
  type EcoCompany,
} from "@/lib/ecosystemData";

const LAYER_ICONS: Record<string, typeof Building2> = {
  startups: Building2,
  research: GraduationCap,
  bigtech: Landmark,
  investors: Briefcase,
};

const AIEcosystemMap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapToken, setMapToken] = useState<string>("");
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(["startups", "research", "bigtech", "investors"]));
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedSector, setSelectedSector] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<EcoCompany | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch Mapbox token
  useEffect(() => {
    supabase.functions.invoke("get-mapbox-token").then(({ data, error }) => {
      if (!error && data?.token) setMapToken(data.token);
    });
  }, []);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return COMPANIES.filter(c => {
      if (!activeLayers.has(c.layer)) return false;
      if (selectedCountry && c.countrySlug !== selectedCountry) return false;
      if (selectedSector && c.sector !== selectedSector) return false;
      if (selectedStage && c.fundingStage !== selectedStage) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeLayers, selectedCountry, selectedSector, selectedStage, search]);

  // Init map
  useEffect(() => {
    if (!mapToken || !mapContainer.current || mapRef.current) return;
    let cancelled = false;

    const init = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !mapContainer.current) return;

      (mapboxgl as any).accessToken = mapToken;
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [105, 20],
        zoom: 3,
        minZoom: 2,
        maxZoom: 16,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        if (!cancelled) setMapLoaded(true);
      });
    };
    init();
    return () => { cancelled = true; };
  }, [mapToken]);

  // Update markers when filters change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const addMarkers = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;

      filteredCompanies.forEach(company => {
        const color = LAYER_COLORS[company.layer];
        const el = document.createElement("div");
        el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.3);cursor:pointer;transition:transform 0.2s;`;
        el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.5)"; });
        el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedCompany(company);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([company.lng, company.lat])
          .addTo(mapRef.current!);
        markersRef.current.push(marker);
      });
    };

    addMarkers();
  }, [filteredCompanies, mapLoaded]);

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCountry("");
    setSelectedSector("");
    setSelectedStage("");
    setActiveLayers(new Set(["startups", "research", "bigtech", "investors"]));
  };

  const activeFilterCount = [selectedCountry, selectedSector, selectedStage].filter(Boolean).length + (activeLayers.size < 4 ? 1 : 0);

  const flyToCountry = (slug: string) => {
    const country = getCountryBySlug(slug);
    if (country && mapRef.current) {
      mapRef.current.flyTo({ center: [country.lng, country.lat], zoom: country.zoom, duration: 1500 });
      setSelectedCountry(slug);
    }
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "AI Ecosystem Map: Asia-Pacific",
    description: "Interactive map of AI companies, startups, research labs, and investors across the Asia-Pacific region.",
    url: "https://www.aiinasia.com/ai-ecosystem-map",
    creator: { "@type": "Organization", name: "AI in Asia" },
    spatialCoverage: "Asia-Pacific",
    keywords: ["AI", "artificial intelligence", "startups", "Asia", "map", "ecosystem"],
  };

  const FilterPanel = () => (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Country</label>
        <select
          value={selectedCountry}
          onChange={e => { flyToCountry(e.target.value); }}
          className="w-full rounded-md border border-border bg-background text-foreground text-sm px-3 py-2"
        >
          <option value="">All countries</option>
          {COUNTRIES.map(c => <option key={c.slug} value={c.slug}>{c.name} ({getCompaniesForCountry(c.slug).length})</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Sector</label>
        <select
          value={selectedSector}
          onChange={e => setSelectedSector(e.target.value)}
          className="w-full rounded-md border border-border bg-background text-foreground text-sm px-3 py-2"
        >
          <option value="">All sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Funding Stage</label>
        <select
          value={selectedStage}
          onChange={e => setSelectedStage(e.target.value)}
          className="w-full rounded-md border border-border bg-background text-foreground text-sm px-3 py-2"
        >
          <option value="">All stages</option>
          {FUNDING_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="AI Ecosystem Map: Asia-Pacific — Companies, Startups & Labs | AI in Asia"
        description="Explore the companies, labs, and investors shaping AI across the Asia-Pacific region. Interactive map of 100+ AI organisations."
        canonicalPath="/ai-ecosystem-map"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Header />

      <main id="main-content">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4 py-10 md:py-14">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">AI Ecosystem Map: Asia-Pacific</h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Explore the companies, labs, and investors shaping AI across the region
            </p>
            <div className="flex flex-wrap gap-3 mt-4 text-sm text-muted-foreground">
              <span className="bg-muted/40 px-3 py-1 rounded-full">{COMPANIES.length} organisations</span>
              <span className="bg-muted/40 px-3 py-1 rounded-full">{COUNTRIES.length} countries</span>
              <span className="bg-muted/40 px-3 py-1 rounded-full">{SECTORS.length} sectors</span>
            </div>
          </div>
        </section>

        {/* Layer toggles + search */}
        <section className="border-b border-border sticky top-0 z-20 bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            {Object.entries(LAYER_LABELS).map(([key, label]) => {
              const Icon = LAYER_ICONS[key];
              const active = activeLayers.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground bg-transparent opacity-50"
                  }`}
                  style={active ? { backgroundColor: LAYER_COLORS[key] } : {}}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search companies..."
                  className="pl-8 h-8 w-48 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Mobile filter trigger */}
              <div className="md:hidden">
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="relative h-8">
                      <Filter className="h-3.5 w-3.5 mr-1" /> Filter
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[70vh]">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="py-4">
                      <FilterPanel />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </section>

        {/* Map + Sidebar */}
        <section className="flex flex-col md:flex-row" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
          {/* Sidebar — desktop */}
          <aside className="hidden md:flex flex-col w-80 lg:w-96 border-r border-border bg-background overflow-hidden">
            <div className="p-4 border-b border-border space-y-3">
              <FilterPanel />
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-2 py-1">{filteredCompanies.length} results</p>
                {filteredCompanies.map(company => (
                  <button
                    key={company.name + company.city}
                    onClick={() => {
                      setSelectedCompany(company);
                      if (mapRef.current) {
                        mapRef.current.flyTo({ center: [company.lng, company.lat], zoom: 12, duration: 1000 });
                      }
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/50 ${
                      selectedCompany?.name === company.name ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: LAYER_COLORS[company.layer] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{company.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {company.city}, {company.country} · {company.sector}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Map */}
          <div className="flex-1 relative">
            <div ref={mapContainer} className="w-full h-full" />

            {!mapToken && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                <Skeleton className="w-full h-full" />
              </div>
            )}

            {/* Company detail card */}
            {selectedCompany && (
              <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 bg-card border border-border rounded-xl shadow-xl p-5 animate-fade-in z-10">
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: LAYER_COLORS[selectedCompany.layer] }}
                  >
                    {selectedCompany.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{selectedCompany.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedCompany.city}, {selectedCompany.country}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="secondary" className="text-xs">{selectedCompany.sector}</Badge>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: LAYER_COLORS[selectedCompany.layer], color: LAYER_COLORS[selectedCompany.layer] }}>
                    {LAYER_LABELS[selectedCompany.layer]}
                  </Badge>
                  {selectedCompany.fundingStage !== "N/A" && (
                    <Badge variant="outline" className="text-xs">{selectedCompany.fundingStage}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{selectedCompany.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span>Founded {selectedCompany.founded}</span>
                  {selectedCompany.fundingAmount !== "N/A" && <span>Funding: {selectedCompany.fundingAmount}</span>}
                </div>
                <div className="flex gap-2">
                  <a
                    href={selectedCompany.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Website
                  </a>
                  {selectedCompany.articleLink && (
                    <Link
                      to={selectedCompany.articleLink}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Read our coverage <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile company list */}
          <div className="md:hidden border-t border-border bg-background max-h-[40vh] overflow-y-auto">
            <div className="p-3">
              <p className="text-xs text-muted-foreground mb-2">{filteredCompanies.length} organisations</p>
              {filteredCompanies.slice(0, 20).map(company => (
                <button
                  key={company.name + company.city}
                  onClick={() => {
                    setSelectedCompany(company);
                    if (mapRef.current) {
                      mapRef.current.flyTo({ center: [company.lng, company.lat], zoom: 12, duration: 1000 });
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LAYER_COLORS[company.layer] }} />
                    <span className="text-sm font-medium truncate">{company.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">{company.country}</span>
                  </div>
                </button>
              ))}
              {filteredCompanies.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing 20 of {filteredCompanies.length} — use filters to narrow down
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Country cards */}
        <section className="container mx-auto px-4 py-14 md:py-20">
          <h2 className="text-2xl font-bold mb-2">Explore by Country</h2>
          <p className="text-muted-foreground mb-8">Deep-dive into each country's AI ecosystem</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COUNTRIES.map(country => {
              const stats = getCountryStats(country.slug);
              return (
                <Link
                  key={country.slug}
                  to={`/ai-ecosystem-map/${country.slug}`}
                  onClick={() => flyToCountry(country.slug)}
                  className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <h3 className="font-bold text-base group-hover:text-primary transition-colors">{country.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{country.summary}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{stats.total} orgs</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{stats.sectors.length} sectors</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AIEcosystemMap;

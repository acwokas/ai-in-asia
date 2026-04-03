import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin, Building2, GraduationCap, Landmark, Briefcase } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  COMPANIES, LAYER_COLORS, LAYER_LABELS,
  getCompaniesForCountry, getCountryBySlug, getCountryStats,
  type EcoCompany,
} from "@/lib/ecosystemData";

const LAYER_ICONS: Record<string, typeof Building2> = {
  startups: Building2,
  research: GraduationCap,
  bigtech: Landmark,
  investors: Briefcase,
};

const EcosystemCountry = () => {
  const { countrySlug } = useParams<{ countrySlug: string }>();
  const country = getCountryBySlug(countrySlug || "");
  const companies = getCompaniesForCountry(countrySlug || "");
  const stats = getCountryStats(countrySlug || "");

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapToken, setMapToken] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<EcoCompany | null>(null);
  const [activeLayer, setActiveLayer] = useState<string>("all");

  useEffect(() => {
    supabase.functions.invoke("get-mapbox-token").then(({ data, error }) => {
      if (!error && data?.token) setMapToken(data.token);
    });
  }, []);

  useEffect(() => {
    if (!mapToken || !mapContainer.current || mapRef.current || !country) return;
    let cancelled = false;

    const init = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !mapContainer.current) return;

      (mapboxgl as any).accessToken = mapToken;
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [country.lng, country.lat],
        zoom: country.zoom,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        if (!cancelled) setMapLoaded(true);
      });
    };
    init();
    return () => { cancelled = true; };
  }, [mapToken, country]);

  // Add markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const addMarkers = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      const filtered = activeLayer === "all" ? companies : companies.filter(c => c.layer === activeLayer);

      filtered.forEach(company => {
        const el = document.createElement("div");
        const color = LAYER_COLORS[company.layer];
        el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.4);cursor:pointer;transition:transform 0.2s;`;
        el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.5)"; });
        el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
        el.addEventListener("click", () => setSelectedCompany(company));

        new mapboxgl.Marker(el).setLngLat([company.lng, company.lat]).addTo(mapRef.current!);
      });
    };
    addMarkers();
  }, [companies, mapLoaded, activeLayer]);

  if (!country) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Country not found</h1>
          <Link to="/ai-ecosystem-map" className="text-primary hover:underline">← Back to Ecosystem Map</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={`AI Ecosystem: ${country.name} — Companies & Startups | AI in Asia`}
        description={country.summary}
        canonical={`/ai-ecosystem-map/${country.slug}`}
      />
      <Header />

      <main id="main-content">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4 py-8 md:py-12">
            <Link to="/ai-ecosystem-map" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Ecosystem Map
            </Link>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">AI in {country.name}</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mb-4">{country.summary}</p>

            <div className="flex flex-wrap gap-3">
              {Object.entries(LAYER_LABELS).map(([key, label]) => {
                const count = companies.filter(c => c.layer === key).length;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-full text-sm">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LAYER_COLORS[key] }} />
                    {count} {label}
                  </div>
                );
              })}
              <div className="bg-muted/40 px-3 py-1.5 rounded-full text-sm">{stats.sectors.length} sectors</div>
            </div>
          </div>
        </section>

        {/* Layer filter */}
        <div className="border-b border-border sticky top-0 z-20 bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-2 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveLayer("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all shrink-0 ${activeLayer === "all" ? "bg-foreground text-background border-transparent" : "border-border text-muted-foreground"}`}
            >
              All ({companies.length})
            </button>
            {Object.entries(LAYER_LABELS).map(([key, label]) => {
              const count = companies.filter(c => c.layer === key).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setActiveLayer(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all shrink-0 ${
                    activeLayer === key ? "text-white border-transparent" : "border-border text-muted-foreground"
                  }`}
                  style={activeLayer === key ? { backgroundColor: LAYER_COLORS[key] } : {}}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: 400 }}>
          <div ref={mapContainer} className="w-full h-full" />
          {!mapToken && <div className="absolute inset-0"><Skeleton className="w-full h-full" /></div>}
        </div>

        {/* Companies grid */}
        <section className="container mx-auto px-4 py-10 md:py-14">
          <h2 className="text-xl font-bold mb-6">
            {activeLayer === "all" ? "All Organisations" : LAYER_LABELS[activeLayer]} in {country.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeLayer === "all" ? companies : companies.filter(c => c.layer === activeLayer)).map(company => (
              <div
                key={company.name}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => setSelectedCompany(selectedCompany?.name === company.name ? null : company)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: LAYER_COLORS[company.layer] }}
                  >
                    {company.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{company.name}</h3>
                    <p className="text-xs text-muted-foreground">{company.city} · Founded {company.founded}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  <Badge variant="secondary" className="text-[10px]">{company.sector}</Badge>
                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: LAYER_COLORS[company.layer] }}>
                    {LAYER_LABELS[company.layer]}
                  </Badge>
                  {company.fundingStage !== "N/A" && (
                    <Badge variant="outline" className="text-[10px]">{company.fundingStage}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{company.description}</p>
                {company.fundingAmount !== "N/A" && (
                  <p className="text-xs text-muted-foreground">Funding: {company.fundingAmount}</p>
                )}
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" /> Website
                </a>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default EcosystemCountry;

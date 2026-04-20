import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { awardPoints } from "@/lib/gamification";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InlineNewsletterSignup from "@/components/InlineNewsletterSignup";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Calendar, MapPin, Clock, Trophy, ExternalLink,
  Mail, ChevronLeft, ChevronRight, Ticket,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";

/* ───────── types ───────── */

type EventType = "Conference" | "Summit" | "Workshop" | "Hackathon" | "Webinar" | "Expo";
type Pricing = "Free" | "Paid" | "Free+Paid";

interface AIEvent {
  id: number;
  name: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;
  city: string;
  country: string;
  flag: string;
  type: EventType;
  pricing: Pricing;
  description: string;
  url: string;
}

/* ───────── data ───────── */

const EVENTS: AIEvent[] = [
  { id: 1, name: "AI Singapore Annual Summit", startDate: "2026-03-18", endDate: "2026-03-19", city: "Singapore", country: "Singapore", flag: "🇸🇬", type: "Summit", pricing: "Free+Paid", description: "Flagship event from AI Singapore showcasing national AI strategy progress and research breakthroughs.", url: "#" },
  { id: 2, name: "Google I/O Extended Singapore", startDate: "2026-06-12", endDate: "2026-06-12", city: "Singapore", country: "Singapore", flag: "🇸🇬", type: "Conference", pricing: "Free", description: "Community-organized event bringing Google I/O keynotes and AI demos to Southeast Asia.", url: "#" },
  { id: 3, name: "AWS Summit Singapore", startDate: "2026-05-14", endDate: "2026-05-15", city: "Singapore", country: "Singapore", flag: "🇸🇬", type: "Summit", pricing: "Free", description: "Amazon Web Services flagship cloud and AI summit for builders across ASEAN.", url: "#" },
  { id: 4, name: "AWS Summit Tokyo", startDate: "2026-06-04", endDate: "2026-06-05", city: "Tokyo", country: "Japan", flag: "🇯🇵", type: "Summit", pricing: "Free", description: "AWS cloud infrastructure and generative AI showcase for the Japanese market.", url: "#" },
  { id: 5, name: "AWS Summit Mumbai", startDate: "2026-05-21", endDate: "2026-05-22", city: "Mumbai", country: "India", flag: "🇮🇳", type: "Summit", pricing: "Free", description: "AWS brings cloud computing and AI solutions to India's enterprise community.", url: "#" },
  { id: 6, name: "NVIDIA GTC APAC", startDate: "2026-10-14", endDate: "2026-10-16", city: "Tokyo", country: "Japan", flag: "🇯🇵", type: "Conference", pricing: "Paid", description: "NVIDIA's GPU Technology Conference covering accelerated computing, AI, and robotics.", url: "#" },
  { id: 7, name: "Rise Conference Hong Kong", startDate: "2026-03-24", endDate: "2026-03-26", city: "Hong Kong", country: "Hong Kong", flag: "🇭🇰", type: "Conference", pricing: "Paid", description: "Asia's premier tech conference featuring startups, investors, and AI thought leaders.", url: "#" },
  { id: 8, name: "Tech in Asia Conference", startDate: "2026-09-16", endDate: "2026-09-17", city: "Singapore", country: "Singapore", flag: "🇸🇬", type: "Conference", pricing: "Paid", description: "Southeast Asia's largest tech startup conference with extensive AI and deep tech tracks.", url: "#" },
  { id: 9, name: "AI Expo Tokyo", startDate: "2026-05-28", endDate: "2026-05-30", city: "Tokyo", country: "Japan", flag: "🇯🇵", type: "Expo", pricing: "Free+Paid", description: "Japan's largest AI trade show with 500+ exhibitors covering enterprise AI solutions.", url: "#" },
  { id: 10, name: "India AI Summit", startDate: "2026-08-20", endDate: "2026-08-21", city: "New Delhi", country: "India", flag: "🇮🇳", type: "Summit", pricing: "Paid", description: "National summit covering India's AI strategy, digital public infrastructure, and research.", url: "#" },
  { id: 11, name: "Korea AI Summit", startDate: "2026-07-08", endDate: "2026-07-09", city: "Seoul", country: "South Korea", flag: "🇰🇷", type: "Summit", pricing: "Paid", description: "Annual gathering of Korean AI leaders discussing semiconductor AI, LLMs, and robotics.", url: "#" },
  { id: 12, name: "Computex Taipei", startDate: "2026-06-02", endDate: "2026-06-05", city: "Taipei", country: "Taiwan", flag: "🇹🇼", type: "Expo", pricing: "Free+Paid", description: "Global computing trade show featuring AI chips, edge computing, and next-gen hardware.", url: "#" },
  { id: 13, name: "Web Summit Qatar", startDate: "2026-02-24", endDate: "2026-02-26", city: "Doha", country: "Qatar", flag: "🇶🇦", type: "Conference", pricing: "Paid", description: "Major global tech conference expanding into the Middle East and Asia crossover region.", url: "#" },
  { id: 14, name: "GITEX Asia Singapore", startDate: "2026-04-22", endDate: "2026-04-24", city: "Singapore", country: "Singapore", flag: "🇸🇬", type: "Expo", pricing: "Paid", description: "GITEX's Asia debut bringing enterprise tech, AI, and cybersecurity to Southeast Asia.", url: "#" },
  { id: 15, name: "AI for Good Asia Workshop", startDate: "2026-04-10", endDate: "2026-04-10", city: "Bangkok", country: "Thailand", flag: "🇹🇭", type: "Workshop", pricing: "Free", description: "UN-backed workshop exploring AI applications for sustainable development across ASEAN.", url: "#" },
  { id: 16, name: "MLOps World Asia", startDate: "2026-07-22", endDate: "2026-07-23", city: "Singapore", country: "Singapore", flag: "🇸🇬", type: "Conference", pricing: "Paid", description: "Dedicated conference for ML engineering, model deployment, and production AI systems.", url: "#" },
  { id: 17, name: "Vietnam AI Day", startDate: "2026-09-05", endDate: "2026-09-05", city: "Ho Chi Minh City", country: "Vietnam", flag: "🇻🇳", type: "Conference", pricing: "Free", description: "Annual event showcasing Vietnam's growing AI ecosystem and government digitalization plans.", url: "#" },
  { id: 18, name: "Philippine AI Summit", startDate: "2026-08-06", endDate: "2026-08-07", city: "Manila", country: "Philippines", flag: "🇵🇭", type: "Summit", pricing: "Paid", description: "Exploring AI adoption in Philippine industries including BPO, fintech, and agriculture.", url: "#" },
  { id: 19, name: "Indonesia AI Forum", startDate: "2026-10-08", endDate: "2026-10-09", city: "Jakarta", country: "Indonesia", flag: "🇮🇩", type: "Conference", pricing: "Paid", description: "Indonesia's largest AI gathering covering digital economy, smart cities, and AI governance.", url: "#" },
  { id: 20, name: "Malaysia Digital AI Week", startDate: "2026-06-17", endDate: "2026-06-19", city: "Kuala Lumpur", country: "Malaysia", flag: "🇲🇾", type: "Conference", pricing: "Free+Paid", description: "Part of Malaysia's digital transformation push, covering AI policy and enterprise use cases.", url: "#" },
  { id: 21, name: "AI Research Workshop NUS", startDate: "2026-04-28", endDate: "2026-04-28", city: "Singapore", country: "Singapore", flag: "🇸🇬", type: "Workshop", pricing: "Free", description: "Academic workshop hosted by NUS covering cutting-edge AI research in Southeast Asia.", url: "#" },
  { id: 22, name: "Deep Learning Hackathon Seoul", startDate: "2026-05-09", endDate: "2026-05-11", city: "Seoul", country: "South Korea", flag: "🇰🇷", type: "Hackathon", pricing: "Free", description: "48-hour hackathon building AI solutions for urban challenges using Korean open datasets.", url: "#" },
  { id: 23, name: "AI in Healthcare Asia", startDate: "2026-11-04", endDate: "2026-11-05", city: "Singapore", country: "Singapore", flag: "🇸🇬", type: "Conference", pricing: "Paid", description: "Focused conference on medical AI, drug discovery, and digital health across APAC.", url: "#" },
  { id: 24, name: "Generative AI Summit Bangalore", startDate: "2026-07-16", endDate: "2026-07-17", city: "Bangalore", country: "India", flag: "🇮🇳", type: "Summit", pricing: "Paid", description: "India's dedicated generative AI event covering LLMs, foundation models, and enterprise adoption.", url: "#" },
  { id: 25, name: "AI Ethics Roundtable Tokyo", startDate: "2026-09-24", endDate: "2026-09-24", city: "Tokyo", country: "Japan", flag: "🇯🇵", type: "Workshop", pricing: "Free", description: "Expert roundtable on responsible AI, bias mitigation, and governance frameworks in Japan.", url: "#" },
  { id: 26, name: "Google Cloud AI Day Taipei", startDate: "2026-04-16", endDate: "2026-04-16", city: "Taipei", country: "Taiwan", flag: "🇹🇼", type: "Webinar", pricing: "Free", description: "Google Cloud showcasing Vertex AI, Gemini integration, and cloud-native AI tooling.", url: "#" },
  { id: 27, name: "Startup AI Pitch Competition HK", startDate: "2026-06-25", endDate: "2026-06-25", city: "Hong Kong", country: "Hong Kong", flag: "🇭🇰", type: "Hackathon", pricing: "Free", description: "AI startup pitch event connecting founders with investors across Greater Bay Area.", url: "#" },
  { id: 28, name: "NLP Workshop Bangkok", startDate: "2026-08-13", endDate: "2026-08-14", city: "Bangkok", country: "Thailand", flag: "🇹🇭", type: "Workshop", pricing: "Free+Paid", description: "Hands-on workshop covering multilingual NLP, Thai language models, and low-resource NLP.", url: "#" },
  { id: 29, name: "Australia AI Week Melbourne", startDate: "2026-10-20", endDate: "2026-10-22", city: "Melbourne", country: "Australia", flag: "🇦🇺", type: "Conference", pricing: "Paid", description: "Australia's flagship AI event covering national AI strategy, industry applications, and research.", url: "#" },
  { id: 30, name: "AI Robotics Expo Shenzhen", startDate: "2026-11-12", endDate: "2026-11-14", city: "Shenzhen", country: "China", flag: "🇨🇳", type: "Expo", pricing: "Paid", description: "China's hardware and robotics AI expo showcasing autonomous systems and manufacturing AI.", url: "#" },
  { id: 31, name: "Bangladesh AI Innovation Day", startDate: "2026-09-15", endDate: "2026-09-15", city: "Dhaka", country: "Bangladesh", flag: "🇧🇩", type: "Conference", pricing: "Free", description: "Highlighting AI innovation in Bangladesh's garment, agriculture, and fintech sectors.", url: "#" },
  { id: 32, name: "Pakistan AI Conference", startDate: "2026-10-28", endDate: "2026-10-29", city: "Lahore", country: "Pakistan", flag: "🇵🇰", type: "Conference", pricing: "Free+Paid", description: "Pakistan's growing AI community gathers to discuss research, education, and industry adoption.", url: "#" },
];

const TYPE_COLORS: Record<EventType, string> = {
  Conference: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Summit: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Workshop: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Hackathon: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Webinar: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Expo: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const PRICING_COLORS: Record<Pricing, string> = {
  Free: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Paid: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "Free+Paid": "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const COUNTRIES = [...new Set(EVENTS.map((e) => e.country))].sort();
const EVENT_TYPES: EventType[] = ["Conference","Summit","Workshop","Hackathon","Webinar","Expo"];

/* ───────── helpers ───────── */

function formatDateRange(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sMonth = MONTHS[s.getMonth()];
  if (start === end) return `${s.getDate()} ${sMonth} ${s.getFullYear()}`;
  if (s.getMonth() === e.getMonth())
    return `${s.getDate()}-${e.getDate()} ${sMonth} ${s.getFullYear()}`;
  return `${s.getDate()} ${sMonth} - ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
}

function daysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

/* ───────── component ───────── */

const AIEventsCalendar = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [pricingFilter, setPricingFilter] = useState<string>("all");
  const [showSubmit, setShowSubmit] = useState(false);

  const [viewedEvents, setViewedEvents] = useState<Set<number>>(new Set());
  const pointsAwarded = useRef(false);

  const markViewed = useCallback(
    (id: number) => {
      setViewedEvents((prev) => {
        const next = new Set(prev);
        next.add(id);
        if (next.size >= 10 && !pointsAwarded.current && user) {
          pointsAwarded.current = true;
          awardPoints(user.id, 10, "Explored 10+ AI events");
        }
        return next;
      });
    },
    [user]
  );

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(
    () =>
      EVENTS.filter((e) => e.startDate >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 3),
    [today]
  );

  const filtered = useMemo(() => {
    return EVENTS.filter((e) => {
      if (countryFilter !== "all" && e.country !== countryFilter) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (pricingFilter !== "all" && e.pricing !== pricingFilter) return false;
      if (monthFilter !== "all") {
        const m = new Date(e.startDate + "T00:00:00").getMonth();
        if (m !== Number(monthFilter)) return false;
      }
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (
          !e.name.toLowerCase().includes(q) &&
          !e.city.toLowerCase().includes(q) &&
          !e.country.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [countryFilter, typeFilter, monthFilter, pricingFilter, debouncedSearch, today]);

  // IO for gamification
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute("data-event-id"));
            if (id) markViewed(id);
          }
        });
      },
      { threshold: 0.4 }
    );
    const cards = document.querySelectorAll("[data-event-id]");
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [filtered.length, markViewed]);

  /* ───── timeline ───── */
  const [timelineYear] = useState(2026);
  const eventsByMonth = useMemo(() => {
    const map: Record<number, AIEvent[]> = {};
    EVENTS.forEach((e) => {
      const d = new Date(e.startDate + "T00:00:00");
      if (d.getFullYear() === timelineYear) {
        const m = d.getMonth();
        if (!map[m]) map[m] = [];
        map[m].push(e);
      }
    });
    return map;
  }, [timelineYear]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Events Calendar Asia-Pacific | Conferences & Summits | AI in Asia"
        description="Explore 30+ AI conferences, summits, workshops, and hackathons across Asia-Pacific. Filter by country, type, and month."
        canonical="https://aiinasia.com/tools/events-calendar"
      />
      <Header />

      <main className="flex-1 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <ToolBreadcrumb toolName="AI Events Calendar" />

          {/* Hero */}
          <div className="text-center mb-8">
            <Badge className="mb-3 bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/20 text-xs font-bold tracking-wide">
              Free Tool
            </Badge>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-2">
              AI Events Calendar
            </h1>
            <p className="text-foreground/70 max-w-xl mx-auto text-base">
              {EVENTS.length}+ AI conferences, summits, workshops, and hackathons across Asia-Pacific. Never miss what matters.
            </p>
          </div>

          {/* Gamification bar */}
          {viewedEvents.size > 0 && viewedEvents.size < 10 && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-card border border-border">
              <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${(viewedEvents.size / 10) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{viewedEvents.size}/10 events for +10 pts</span>
            </div>
          )}
          {viewedEvents.size >= 10 && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-400 font-semibold">+10 points earned for exploring 10+ events!</span>
            </div>
          )}

          {/* Upcoming countdowns */}
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-3">Coming Up Next</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {upcoming.map((ev) => {
                  const days = daysUntil(ev.startDate);
                  return (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-card p-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{ev.flag}</span>
                        <span className="font-display font-bold text-sm text-foreground line-clamp-1">{ev.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{formatDateRange(ev.startDate, ev.endDate)}</p>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-bold text-amber-500">
                          {days <= 0 ? "Happening now" : `${days} day${days === 1 ? "" : "s"} away`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly timeline */}
          <div className="mb-8 overflow-x-auto">
            <h2 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-3">{timelineYear} Timeline</h2>
            <div className="flex gap-0 min-w-[700px]">
              {MONTHS.map((label, idx) => {
                const evs = eventsByMonth[idx] || [];
                return (
                  <div key={idx} className="flex-1 text-center">
                    <p className="text-[10px] text-muted-foreground font-semibold mb-1">{label}</p>
                    <div className="h-1 bg-muted rounded-full mx-0.5 relative">
                      {evs.length > 0 && (
                        <div className="absolute inset-0 bg-amber-500/60 rounded-full" />
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                      {evs.map((e) => (
                        <div
                          key={e.id}
                          className="w-2 h-2 rounded-full bg-amber-500"
                          title={e.name}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, cities, countries..."
                className="pl-10"
              />
            </div>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground"
            >
              <option value="all">All Countries</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground"
            >
              <option value="all">All Types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground"
            >
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={pricingFilter}
              onChange={(e) => setPricingFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground"
            >
              <option value="all">Free/Paid</option>
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
              <option value="Free+Paid">Free+Paid</option>
            </select>
          </div>

          {/* Submit CTA + count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {EVENTS.length} events
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowSubmit(true)}
            >
              <Mail className="h-3.5 w-3.5" />
              Submit an Event
            </Button>
          </div>

          {showSubmit && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5"
            >
              <p className="text-sm text-foreground">
                Want your event listed? Email{" "}
                <a href="mailto:events@aiinasia.com" className="text-amber-500 font-semibold underline underline-offset-2">
                  events@aiinasia.com
                </a>{" "}
                with event details, dates, and a link. We review submissions weekly.
              </p>
              <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={() => setShowSubmit(false)}>
                Dismiss
              </Button>
            </motion.div>
          )}

          {/* Event cards */}
          {filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No events found. Try adjusting your filters.</p>
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((ev) => {
              const days = daysUntil(ev.startDate);
              const isPast = days < 0;
              return (
                <motion.div
                  key={ev.id}
                  data-event-id={ev.id}
                  className={`rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-amber-500/30 hover:bg-amber-500/[0.02] ${isPast ? "opacity-60" : ""}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Date box */}
                    <div className="shrink-0 w-16 h-16 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-amber-500 uppercase">
                        {MONTHS[new Date(ev.startDate + "T00:00:00").getMonth()]}
                      </span>
                      <span className="text-xl font-black text-foreground leading-none">
                        {new Date(ev.startDate + "T00:00:00").getDate()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap mb-1">
                        <h3 className="font-display text-lg font-bold text-foreground">{ev.name}</h3>
                        <Badge variant="outline" className={`shrink-0 text-[10px] ${TYPE_COLORS[ev.type]}`}>
                          {ev.type}
                        </Badge>
                        <Badge variant="outline" className={`shrink-0 text-[10px] ${PRICING_COLORS[ev.pricing]}`}>
                          <Ticket className="h-2.5 w-2.5 mr-0.5" />
                          {ev.pricing}
                        </Badge>
                        {isPast && (
                          <Badge variant="outline" className="shrink-0 text-[10px] bg-muted/50 text-muted-foreground border-border">
                            Past
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateRange(ev.startDate, ev.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {ev.flag} {ev.city}, {ev.country}
                        </span>
                        {!isPast && days >= 0 && (
                          <span className="flex items-center gap-1 text-amber-500 font-semibold">
                            <Clock className="h-3 w-3" />
                            {days === 0 ? "Today" : `${days}d away`}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-foreground/70 leading-relaxed">{ev.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Newsletter */}
          <div className="mt-12">
            <InlineNewsletterSignup />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIEventsCalendar;

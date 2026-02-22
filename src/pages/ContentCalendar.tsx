import { useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addDays, addWeeks, addMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CalendarRange, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Search, Home } from "lucide-react";
import { toast } from "sonner";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import Header from "@/components/Header";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";
import { CalendarCreateDialog } from "@/components/calendar/CalendarCreateDialog";
import { CalendarEventDetail, type CalendarEvent } from "@/components/calendar/CalendarEventDetail";
import { CalendarStatusLegend } from "@/components/calendar/CalendarStatusLegend";
import { CalendarSummaryBar } from "@/components/calendar/CalendarSummaryBar";

const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(Calendar);

interface EventDropArgs {
  event: CalendarEvent;
  start: Date;
  end: Date;
}

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// Category-specific colors
const getCategoryColor = (categoryName: string): string => {
  const categoryColors: Record<string, string> = {
    "News": "hsl(0, 85%, 45%)",
    "Business": "hsl(210, 85%, 40%)",
    "Life": "hsl(280, 65%, 50%)",
    "Learn": "hsl(45, 90%, 45%)",
    "Create": "hsl(340, 75%, 45%)",
    "AI Policy Atlas": "hsl(160, 60%, 35%)",
    "Voices": "hsl(25, 75%, 50%)",
  };
  return categoryColors[categoryName] || "hsl(220, 15%, 50%)";
};

import { useIsMobile } from "@/hooks/use-mobile";

const ARTICLE_SELECT = `
  id, title, slug, status, scheduled_for, published_at, author_id, view_count,
  authors ( id, name ),
  categories:categories!articles_primary_category_id_fkey ( id, name, color )
`;

const ContentCalendar = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>(isMobile ? "agenda" : "week");
  const [date, setDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch articles (scheduled + published 30d + drafts with scheduled_for)
  const { data: articles, isLoading } = useQuery({
    queryKey: ["calendar-articles"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [scheduled, published, drafts] = await Promise.all([
        supabase.from("articles").select(ARTICLE_SELECT)
          .eq("status", "scheduled").not("scheduled_for", "is", null)
          .order("scheduled_for", { ascending: true }),
        supabase.from("articles").select(ARTICLE_SELECT)
          .eq("status", "published").not("published_at", "is", null)
          .gte("published_at", thirtyDaysAgo.toISOString())
          .order("published_at", { ascending: false }),
        supabase.from("articles").select(ARTICLE_SELECT)
          .eq("status", "draft").not("scheduled_for", "is", null)
          .order("scheduled_for", { ascending: true }),
      ]);

      if (scheduled.error) throw scheduled.error;
      if (published.error) throw published.error;
      if (drafts.error) throw drafts.error;

      return [...(scheduled.data || []), ...(published.data || []), ...(drafts.data || [])];
    },
  });

  // Fetch authors & categories for create dialog
  const { data: authorsList = [] } = useQuery({
    queryKey: ["calendar-authors"],
    queryFn: async () => {
      const { data } = await supabase.from("authors").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: categoriesList = [] } = useQuery({
    queryKey: ["calendar-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data || [];
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, scheduled_for }: { id: string; scheduled_for: string }) => {
      const { error } = await supabase.from("articles").update({ scheduled_for }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-articles"] });
      toast.success("Article rescheduled successfully");
    },
    onError: (error) => {
      toast.error("Failed to reschedule article: " + error.message);
    },
  });

  // Filters
  const uniqueCategories = useMemo(() => {
    const cats = new Set(articles?.map((a) => a.categories?.name).filter(Boolean));
    return Array.from(cats).sort();
  }, [articles]);

  const uniqueAuthors = useMemo(() => {
    const auths = new Set(articles?.map((a) => a.authors?.name).filter(Boolean));
    return Array.from(auths).sort();
  }, [articles]);

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter((article) => {
      const matchesSearch = searchQuery === "" || article.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || article.categories?.name === categoryFilter;
      const matchesAuthor = authorFilter === "all" || article.authors?.name === authorFilter;
      const matchesStatus = statusFilter === "all" || article.status === statusFilter;
      return matchesSearch && matchesCategory && matchesAuthor && matchesStatus;
    });
  }, [articles, searchQuery, categoryFilter, authorFilter, statusFilter]);

  const events: CalendarEvent[] = (filteredArticles || []).map((article) => {
    const eventDate =
      article.status === "published"
        ? new Date(article.published_at!)
        : new Date(article.scheduled_for!);

    return {
      id: article.id,
      title: article.title,
      start: eventDate,
      end: new Date(eventDate.getTime() + 30 * 60 * 1000),
      author: article.authors?.name || "Unknown Author",
      authorId: article.author_id || "unknown",
      categoryName: article.categories?.name || "Uncategorized",
      categoryColor: article.categories?.color || "#999999",
      status: article.status,
      slug: article.slug,
      viewCount: article.view_count || 0,
    };
  });

  // Handlers
  const handleSelectEvent = (event: CalendarEvent) => {
    setDetailEvent(event);
    setDetailOpen(true);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setCreateDate(start);
    setCreateOpen(true);
  };

  const handleEventDrop = ({ event, start }: EventDropArgs) => {
    updateArticleMutation.mutate({ id: event.id, scheduled_for: start.toISOString() });
  };

  const handleEventResize = ({ event, start }: EventDropArgs) => {
    updateArticleMutation.mutate({ id: event.id, scheduled_for: start.toISOString() });
  };

  const navigateCalendar = (direction: "prev" | "next" | "today") => {
    if (direction === "today") { setDate(new Date()); return; }
    const m = direction === "next" ? 1 : -1;
    switch (view) {
      case "day": setDate(addDays(date, m)); break;
      case "week": setDate(addWeeks(date, m)); break;
      case "month": setDate(addMonths(date, m)); break;
      case "agenda": setDate(addWeeks(date, m)); break;
    }
  };

  // Status-based event styling
  const eventStyleGetter = (event: CalendarEvent) => {
    const baseColor = getCategoryColor(event.categoryName);
    const isPublished = event.status === "published";
    const isDraft = event.status === "draft";
    const isScheduled = event.status === "scheduled";

    const style: React.CSSProperties = {
      borderRadius: "6px",
      color: "white",
      fontSize: "0.8rem",
      fontWeight: "500",
      padding: "6px 10px",
      overflow: "visible",
      whiteSpace: "normal",
      lineHeight: "1.3",
      display: "flex",
      flexDirection: "column",
    };

    if (isPublished) {
      style.backgroundColor = baseColor;
      style.border = "none";
      style.opacity = 0.85;
    } else if (isDraft) {
      style.backgroundColor = baseColor.replace(")", ", 0.2)").replace("hsl(", "hsla(");
      style.border = `2px dashed ${baseColor}`;
      style.color = baseColor;
    } else if (isScheduled) {
      style.backgroundColor = baseColor;
      style.backgroundImage =
        "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.25) 3px, rgba(255,255,255,0.25) 6px)";
      style.border = "none";
    }

    return { style };
  };

  // Today marker
  const dayPropGetter = (d: Date) => {
    if (d.toDateString() === new Date().toDateString()) {
      return { style: { backgroundColor: "hsl(var(--accent) / 0.18)" } };
    }
    return {};
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/"><Home className="h-4 w-4" /></Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/admin">Admin</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Content Calendar</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">Content Calendar</h1>
            <p className="text-muted-foreground">View and manage your scheduled articles</p>
          </div>
          <Button onClick={() => navigate("/editor")} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Article
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Total Articles</div>
            <div className="text-2xl font-bold">{filteredArticles?.length || 0}</div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Scheduled</div>
            <div className="text-2xl font-bold">{filteredArticles?.filter((a) => a.status === "scheduled").length || 0}</div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Published (30d)</div>
            <div className="text-2xl font-bold">{filteredArticles?.filter((a) => a.status === "published").length || 0}</div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Drafts</div>
            <div className="text-2xl font-bold">{filteredArticles?.filter((a) => a.status === "draft").length || 0}</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6 bg-card border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search articles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={authorFilter} onValueChange={setAuthorFilter}>
              <SelectTrigger><SelectValue placeholder="All Authors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Authors</SelectItem>
                {uniqueAuthors.map((author) => <SelectItem key={author} value={author}>{author}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(searchQuery || categoryFilter !== "all" || authorFilter !== "all" || statusFilter !== "all") && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && <Badge variant="secondary">Search: {searchQuery}</Badge>}
              {categoryFilter !== "all" && <Badge variant="secondary">Category: {categoryFilter}</Badge>}
              {authorFilter !== "all" && <Badge variant="secondary">Author: {authorFilter}</Badge>}
              {statusFilter !== "all" && <Badge variant="secondary">Status: {statusFilter}</Badge>}
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setCategoryFilter("all"); setAuthorFilter("all"); setStatusFilter("all"); }}>
                Clear all
              </Button>
            </div>
          )}
        </Card>

        {/* Status Legend */}
        <CalendarStatusLegend />

        {/* Calendar */}
        <Card className="p-6 bg-card border-border">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigateCalendar("prev")} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button variant="outline" onClick={() => navigateCalendar("today")}>Today</Button>
              <Button variant="outline" onClick={() => navigateCalendar("next")} className="gap-2">
                Forward <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant={view === "month" ? "default" : "outline"} onClick={() => setView("month")} className="gap-2" size={isMobile ? "sm" : "default"}>
                <CalendarIcon className="h-4 w-4" /> Month
              </Button>
              {!isMobile && (
                <Button variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")} className="gap-2">
                  <CalendarRange className="h-4 w-4" /> Week
                </Button>
              )}
              <Button variant={view === "day" ? "default" : "outline"} onClick={() => setView("day")} className="gap-2" size={isMobile ? "sm" : "default"}>
                <CalendarDays className="h-4 w-4" /> Day
              </Button>
              <Button variant={view === "agenda" ? "default" : "outline"} onClick={() => setView("agenda")} className="gap-2" size={isMobile ? "sm" : "default"}>
                <CalendarDays className="h-4 w-4" /> Schedule
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-[600px] w-full" />
          ) : (
            <div className="calendar-wrapper">
              <DragAndDropCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: isMobile ? 500 : 800 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                selectable
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                eventPropGetter={eventStyleGetter}
                dayPropGetter={dayPropGetter}
                resizable={false}
                min={new Date(2024, 0, 1, 0, 0, 0)}
                max={new Date(2024, 0, 1, 23, 59, 59)}
                step={60}
                timeslots={1}
                formats={{ eventTimeRangeFormat: () => "" }}
                components={{
                  event: ({ event }: { event: CalendarEvent }) => (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      <span style={{ fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {event.title}
                      </span>
                    </div>
                  ),
                }}
              />
            </div>
          )}

          {!isLoading && events.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No articles found</p>
            </div>
          )}
        </Card>

        {/* Summary Bar */}
        <CalendarSummaryBar events={events} date={date} />
      </div>

      {/* Dialogs */}
      <CalendarCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        date={createDate}
        authors={authorsList}
        categories={categoriesList}
      />
      <CalendarEventDetail
        event={detailEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
};

export default ContentCalendar;

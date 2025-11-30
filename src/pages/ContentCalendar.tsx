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
import { CalendarDays, CalendarRange, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import Header from "@/components/Header";

const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(Calendar);

interface EventDropArgs {
  event: CalendarEvent;
  start: Date;
  end: Date;
}

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  author: string;
  authorId: string;
  categoryName: string;
  categoryColor: string;
  status: string;
  slug: string;
}

// Generate consistent color from author ID
const getAuthorColor = (authorId: string): string => {
  const colors = [
    "hsl(210, 80%, 45%)", // Blue
    "hsl(340, 75%, 45%)", // Pink
    "hsl(280, 65%, 50%)", // Purple
    "hsl(160, 60%, 40%)", // Teal
    "hsl(25, 75%, 50%)",  // Orange
    "hsl(45, 85%, 50%)",  // Yellow
    "hsl(140, 55%, 45%)", // Green
    "hsl(190, 70%, 45%)", // Cyan
  ];
  
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Category-specific colors
const getCategoryColor = (categoryName: string): string => {
  const categoryColors: Record<string, string> = {
    "News": "hsl(0, 85%, 45%)",      // Red
    "Business": "hsl(210, 85%, 40%)", // Blue
    "Life": "hsl(280, 65%, 50%)",     // Purple
    "Learn": "hsl(45, 90%, 45%)",     // Yellow/Gold
    "Create": "hsl(340, 75%, 45%)",   // Pink/Magenta
    "AI Policy Atlas": "hsl(160, 60%, 35%)", // Teal/Green
    "Voices": "hsl(25, 75%, 50%)",    // Orange
  };
  
  return categoryColors[categoryName] || "hsl(220, 15%, 50%)"; // Default gray
};

const ContentCalendar = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["calendar-articles"],
    queryFn: async () => {
      // Fetch scheduled articles
      const { data: scheduledData, error: scheduledError } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          status,
          scheduled_for,
          published_at,
          author_id,
          authors (
            id,
            name
          ),
          primary_category_id,
          categories:categories!articles_primary_category_id_fkey (
            id,
            name,
            color
          )
        `)
        .eq("status", "scheduled")
        .not("scheduled_for", "is", null)
        .order("scheduled_for", { ascending: true });

      // Fetch recently published articles (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: publishedData, error: publishedError } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          status,
          scheduled_for,
          published_at,
          author_id,
          authors (
            id,
            name
          ),
          primary_category_id,
          categories:categories!articles_primary_category_id_fkey (
            id,
            name,
            color
          )
        `)
        .eq("status", "published")
        .not("published_at", "is", null)
        .gte("published_at", thirtyDaysAgo.toISOString())
        .order("published_at", { ascending: false });

      if (scheduledError) {
        console.error("Error fetching scheduled articles:", scheduledError);
        throw scheduledError;
      }
      if (publishedError) {
        console.error("Error fetching published articles:", publishedError);
        throw publishedError;
      }

      return [...(scheduledData || []), ...(publishedData || [])];
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, scheduled_for }: { id: string; scheduled_for: string }) => {
      const { error } = await supabase
        .from("articles")
        .update({ scheduled_for })
        .eq("id", id);
      
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

  // Get unique categories and authors for filters
  const uniqueCategories = useMemo(() => {
    const cats = new Set(articles?.map(a => a.categories?.name).filter(Boolean));
    return Array.from(cats).sort();
  }, [articles]);

  const uniqueAuthors = useMemo(() => {
    const authors = new Set(articles?.map(a => a.authors?.name).filter(Boolean));
    return Array.from(authors).sort();
  }, [articles]);

  // Filter articles based on search and filters
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    
    return articles.filter(article => {
      const matchesSearch = searchQuery === "" || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || 
        article.categories?.name === categoryFilter;
      
      const matchesAuthor = authorFilter === "all" || 
        article.authors?.name === authorFilter;
      
      const matchesStatus = statusFilter === "all" || 
        article.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesAuthor && matchesStatus;
    });
  }, [articles, searchQuery, categoryFilter, authorFilter, statusFilter]);

  const events: CalendarEvent[] = (filteredArticles || []).map((article) => {
    const eventDate = article.status === "scheduled" 
      ? new Date(article.scheduled_for!) 
      : new Date(article.published_at!);
    
    return {
      id: article.id,
      title: article.title,
      start: eventDate,
      end: new Date(eventDate.getTime() + 3 * 60 * 60 * 1000), // 3 hour duration
      author: article.authors?.name || "Unknown Author",
      authorId: article.author_id || "unknown",
      categoryName: article.categories?.name || "Uncategorized",
      categoryColor: article.categories?.color || "#999999",
      status: article.status,
      slug: article.slug,
    };
  });

  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/editor?id=${event.id}`);
  };

  const handleEventDrop = ({ event, start }: EventDropArgs) => {
    updateArticleMutation.mutate({
      id: event.id,
      scheduled_for: start.toISOString(),
    });
  };

  const handleEventResize = ({ event, start }: EventDropArgs) => {
    updateArticleMutation.mutate({
      id: event.id,
      scheduled_for: start.toISOString(),
    });
  };

  const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setDate(new Date());
      return;
    }

    const multiplier = direction === 'next' ? 1 : -1;
    let newDate = date;

    switch (view) {
      case 'day':
        newDate = addDays(date, multiplier);
        break;
      case 'week':
        newDate = addWeeks(date, multiplier);
        break;
      case 'month':
        newDate = addMonths(date, multiplier);
        break;
      case 'agenda':
        newDate = addWeeks(date, multiplier);
        break;
    }

    setDate(newDate);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const categoryColor = getCategoryColor(event.categoryName);
    const authorColor = getAuthorColor(event.authorId);
    const isPublished = event.status === "published";
    
    return {
      style: {
        backgroundColor: categoryColor,
        color: "white",
        borderRadius: "6px",
        border: `2px solid ${authorColor}`,
        borderLeft: `6px solid ${authorColor}`,
        display: "flex",
        flexDirection: "column" as const,
        fontSize: "0.8rem",
        fontWeight: "500",
        opacity: isPublished ? 0.7 : 1,
        padding: "6px 10px",
        overflow: "visible",
        whiteSpace: "normal" as const,
        lineHeight: "1.3",
      },
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">Content Calendar</h1>
            <p className="text-muted-foreground">
              View and manage your scheduled articles
            </p>
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
            <div className="text-2xl font-bold">
              {filteredArticles?.filter(a => a.status === "scheduled").length || 0}
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Published (30d)</div>
            <div className="text-2xl font-bold">
              {filteredArticles?.filter(a => a.status === "published").length || 0}
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="text-sm text-muted-foreground">Active Filters</div>
            <div className="text-2xl font-bold">
              {[categoryFilter !== "all", authorFilter !== "all", statusFilter !== "all", searchQuery !== ""].filter(Boolean).length}
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="p-4 mb-6 bg-card border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={authorFilter} onValueChange={setAuthorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Authors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Authors</SelectItem>
                {uniqueAuthors.map(author => (
                  <SelectItem key={author} value={author}>{author}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(searchQuery || categoryFilter !== "all" || authorFilter !== "all" || statusFilter !== "all") && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                </Badge>
              )}
              {categoryFilter !== "all" && (
                <Badge variant="secondary">Category: {categoryFilter}</Badge>
              )}
              {authorFilter !== "all" && (
                <Badge variant="secondary">Author: {authorFilter}</Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary">Status: {statusFilter}</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setAuthorFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </Card>

        {/* Category Legend */}
        <Card className="p-4 mb-6 bg-card border-border">
          <div className="text-sm font-medium mb-3">Category Colors:</div>
          <div className="flex flex-wrap gap-3">
            {[
              { name: "News", color: "hsl(0, 85%, 45%)" },
              { name: "Business", color: "hsl(210, 85%, 40%)" },
              { name: "Life", color: "hsl(280, 65%, 50%)" },
              { name: "Learn", color: "hsl(45, 90%, 45%)" },
              { name: "Create", color: "hsl(340, 75%, 45%)" },
              { name: "AI Policy Atlas", color: "hsl(160, 60%, 35%)" },
              { name: "Voices", color: "hsl(25, 75%, 50%)" },
            ].map(cat => (
              <div key={cat.name} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm">{cat.name}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigateCalendar('prev')}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateCalendar('today')}
              >
                Today
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateCalendar('next')}
                className="gap-2"
              >
                Forward
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={view === "month" ? "default" : "outline"}
                onClick={() => setView("month")}
                className="gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                Month
              </Button>
              <Button
                variant={view === "week" ? "default" : "outline"}
                onClick={() => setView("week")}
                className="gap-2"
              >
                <CalendarRange className="h-4 w-4" />
                Week
              </Button>
              <Button
                variant={view === "day" ? "default" : "outline"}
                onClick={() => setView("day")}
                className="gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                Day
              </Button>
              <Button
                variant={view === "agenda" ? "default" : "outline"}
                onClick={() => setView("agenda")}
                className="gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                Schedule
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[600px] w-full" />
            </div>
          ) : (
            <div className="calendar-wrapper">
              <DragAndDropCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 800 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                eventPropGetter={eventStyleGetter}
                resizable
                min={new Date(2024, 0, 1, 7, 0, 0)}
                max={new Date(2024, 0, 1, 19, 0, 0)}
                step={60}
                timeslots={1}
                components={{
                  event: ({ event }: { event: CalendarEvent }) => (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                        👤 {event.author}
                      </div>
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
      </div>
    </div>
  );
};

export default ContentCalendar;

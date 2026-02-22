import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Calendar,
  BookOpen,
  BookPlus,
  Star,
  RefreshCw,
  Bot,
  MessageSquare,
  Brain,
  Mail,
  BarChart3,
  TrendingUp,
  UserMinus,
  Activity,
  BarChart,
  PieChart,
  Lightbulb,
  AlertTriangle,
  Search,
  Layers,
  Link as LinkIcon,
  HeartPulse,
  Unlink,
  Undo,
  Users,
  Megaphone,
  CalendarCheck,
  ExternalLink,
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  Menu,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  external?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Dashboard",
    items: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Articles", path: "/admin/articles", icon: FileText },
      { label: "New Article", path: "/editor", icon: FilePlus, external: true },
      { label: "Content Calendar", path: "/admin/calendar", icon: Calendar },
      { label: "Guides", path: "/admin/guides", icon: BookOpen },
      { label: "New Guide", path: "/admin/guide-editor", icon: BookPlus, external: true },
      { label: "Editors Picks", path: "/admin/editors-picks", icon: Star },
      { label: "Content Freshness", path: "/admin/content-freshness", icon: RefreshCw },
    ],
  },
  {
    title: "Engagement",
    items: [
      { label: "Comments", path: "/admin/comments", icon: MessageSquare },
      { label: "AI Comment Generator", path: "/admin/ai-comments", icon: Bot },
      { label: "Knowledge Engine", path: "/admin/knowledge-engine", icon: Brain },
    ],
  },
  {
    title: "Newsletter",
    items: [
      { label: "Manager", path: "/admin/newsletter-manager", icon: Mail },
      { label: "Analytics", path: "/admin/newsletter-analytics", icon: BarChart3 },
      { label: "Performance", path: "/admin/newsletter-performance", icon: TrendingUp },
      { label: "Unsubscribes", path: "/admin/unsubscribes", icon: UserMinus },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Site Dashboard", path: "/admin/dashboard", icon: Activity },
      { label: "Site Analytics", path: "/admin/site-analytics", icon: BarChart },
      { label: "Content Analytics", path: "/admin/analytics", icon: PieChart },
      { label: "Content Insights", path: "/admin/content-insights", icon: Lightbulb },
      { label: "404 Tracking", path: "/admin/404-analytics", icon: AlertTriangle },
    ],
  },
  {
    title: "SEO & Links",
    items: [
      { label: "SEO Tools", path: "/admin/seo-tools", icon: Search },
      { label: "Bulk SEO", path: "/admin/bulk-seo", icon: Layers },
      { label: "Internal Links", path: "/admin/internal-links", icon: LinkIcon },
      { label: "Link Health", path: "/admin/link-health", icon: HeartPulse },
      { label: "Broken Links", path: "/admin/fix-broken-links", icon: Unlink },
      { label: "Undo Links", path: "/admin/bulk-links-undo", icon: Undo },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Authors", path: "/admin/author-management", icon: Users },
      { label: "Sponsors", path: "/admin/category-sponsors", icon: Megaphone },
      { label: "Event Submissions", path: "/admin/event-submissions", icon: CalendarCheck },
      { label: "Bulk Operations", path: "/admin/bulk-operations", icon: Layers },
      { label: "Redirects", path: "/redirects", icon: ExternalLink, external: true },
    ],
  },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

function SidebarNavContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-4 px-2">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <h4 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.title}
                </h4>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground",
                          collapsed && "justify-center px-2"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.external && (
                          <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/40" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Back to site */}
      <div className="border-t border-border p-2">
        <Link
          to="/"
          onClick={onNavigate}
          title={collapsed ? "Back to Site" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Back to Site</span>}
        </Link>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card transition-[width] duration-200 shrink-0",
          collapsed ? "w-14" : "w-56"
        )}
      >
        {/* Collapse toggle */}
        <div className={cn("flex items-center border-b border-border p-2", collapsed ? "justify-center" : "justify-end")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <SidebarNavContent collapsed={collapsed} />
      </aside>

      {/* Mobile hamburger + drawer */}
      <div className="md:hidden fixed bottom-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="rounded-full shadow-lg h-12 w-12">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-card">
            <div className="p-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Admin Menu</span>
            </div>
            <SidebarNavContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

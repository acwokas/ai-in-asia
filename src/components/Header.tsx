import { Search, Menu, User, LogOut, Shield, Zap, Award, X, ChevronDown, BookOpen, Sparkles, Globe, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReadingQueue from "@/components/ReadingQueue";
import NotificationPreferences from "@/components/NotificationPreferences";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Bookmark } from "lucide-react";
import logo from "@/assets/aiinasia-logo.png";
import SearchOverlay from "@/components/SearchOverlay";

const NAV_ITEMS = [
  { to: "/category/news", label: "News" },
  { to: "/category/business", label: "Business" },
  { to: "/category/life", label: "Life" },
  { to: "/category/learn", label: "Learn" },
  { to: "/category/create", label: "Create" },
  { to: "/category/voices", label: "Voices" },
  { to: "/category/policy", label: "Policy" },
];

const TOOLS_ITEMS = [
  { to: "/guides", label: "AI Guides", description: "Practical guides to using AI effectively", icon: BookOpen },
  { to: "/prompts", label: "Prompt Library", description: "Ready-to-use prompts for every task", icon: Sparkles },
  { to: "/policy-atlas", label: "Policy Atlas", description: "Track AI regulation across Asia-Pacific", icon: Globe },
  { to: "/events", label: "Events", description: "AI conferences and meetups in Asia", icon: Calendar },
];

const Header = memo(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRole();

  const { data: userStats } = useQuery({
    queryKey: ["header-user-stats", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_stats")
        .select("points, level, streak_days")
        .eq("user_id", user!.id)
        .maybeSingle();
      return { points: data?.points ?? 0, level: data?.level ?? 'Explorer', streak_days: data?.streak_days ?? 0 };
    },
  });
  const userPoints = userStats?.points;

  // Force dark mode always
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // Cmd+K / Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const isActiveRoute = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-24 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <img src={logo} alt="AI in ASIA" className="h-20 md:h-16 w-auto" width={171} height={96} />
            </Link>
            
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main navigation">
              {NAV_ITEMS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`text-sm font-medium tracking-wide uppercase px-3 py-1.5 border-b-2 transition-all duration-200 hover:text-primary hover:border-primary ${
                    isActiveRoute(to) ? 'text-primary border-primary' : 'border-transparent text-foreground/80'
                  }`}
                >
                  {label}
                </Link>
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`text-sm font-medium tracking-wide uppercase px-3 py-1.5 border-b-2 transition-all duration-200 hover:text-primary hover:border-primary flex items-center gap-1 ${
                      TOOLS_ITEMS.some(t => isActiveRoute(t.to)) ? 'text-primary border-primary' : 'border-transparent text-foreground/80'
                    }`}
                  >
                    Tools <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-72 bg-background border border-border rounded-xl shadow-xl p-2 z-[60] animate-in fade-in-0 zoom-in-95 duration-150"
                >
                  {TOOLS_ITEMS.map(({ to, label, description, icon: Icon }) => (
                    <DropdownMenuItem key={to} asChild className="p-0 focus:bg-transparent">
                      <Link
                        to={to}
                        className="flex items-start gap-3 w-full rounded-lg px-3 py-2.5 hover:bg-muted/80 transition-colors"
                      >
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{label}</span>
                          <span className="text-xs text-muted-foreground leading-snug">{description}</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          {/* Right side — unchanged */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              {/* Mobile search button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSearchOpen(true)}
                    aria-label="Search"
                    className="flex lg:hidden h-10 w-10"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search</TooltipContent>
              </Tooltip>

              {/* Desktop search button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSearchOpen(true)}
                    aria-label="Search"
                    className="hidden lg:flex h-10 w-10"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search</TooltipContent>
              </Tooltip>

              <div className="hidden md:flex items-center gap-1">
                
                <NotificationPreferences />
                <ReadingQueue />
                
                {user ? (
                  <div className="flex items-center gap-1">
                    {typeof userPoints === 'number' && (
                      <Badge
                        variant="secondary"
                        className="hidden md:flex items-center gap-1 text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={() => navigate('/profile')}
                      >
                        <Zap className="h-3 w-3 text-primary" />
                        {userPoints}
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="User menu">
                              <User className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                            {userStats && (() => {
                              const pts = userStats.points;
                              const levels = [
                                { name: "Explorer", min: 0, max: 49, color: "bg-blue-500" },
                                { name: "Enthusiast", min: 50, max: 199, color: "bg-purple-500" },
                                { name: "Expert", min: 200, max: 499, color: "bg-orange-500" },
                                { name: "Thought Leader", min: 500, max: Infinity, color: "bg-red-500" },
                              ];
                              const current = levels.find(l => pts >= l.min && pts <= l.max) || levels[0];
                              const next = levels[levels.indexOf(current) + 1];
                              const progress = next ? Math.min(100, ((pts - current.min) / (next.min - current.min)) * 100) : 100;

                              return (
                                <div className="px-2 pb-2 pt-1 space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-block w-2 h-2 rounded-full ${current.color}`} />
                                    <span className="text-xs font-semibold text-foreground">{current.name}</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full rounded-full ${current.color} transition-all duration-500`} style={{ width: `${progress}%` }} />
                                  </div>
                                  {next ? (
                                    <p className="text-[10px] text-muted-foreground">{next.min - pts} pts to {next.name}</p>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground">Max level reached!</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">🔥 {userStats.streak_days} day streak · ⚡ {pts} pts</p>
                                </div>
                              );
                            })()}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to="/profile" className="cursor-pointer">
                                Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/profile?tab=achievements" className="cursor-pointer">
                                <Award className="mr-2 h-4 w-4" />
                                Achievements
                              </Link>
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem asChild>
                                <Link to="/admin" className="cursor-pointer text-destructive">
                                  <Shield className="mr-2 h-4 w-4" />
                                  Admin
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                              <LogOut className="mr-2 h-4 w-4" />
                              Sign Out
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TooltipTrigger>
                      <TooltipContent>Account</TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <Button variant="default" size="sm" asChild>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                )}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-10 w-10 relative"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={isMenuOpen}
                  >
                    <Menu className="h-5 w-5" />
                    {user && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Menu</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* Mobile menu backdrop */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Mobile slide-in menu */}
          <nav
            aria-label="Mobile navigation"
            className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-background border-l border-border z-50 md:hidden overflow-y-auto pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex flex-col p-5">
            {/* Close button */}
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-lg">Menu</span>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsMenuOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search */}
            <button
              onClick={() => { setIsMenuOpen(false); setIsSearchOpen(true); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-muted/50 text-muted-foreground text-sm mb-5 hover:bg-muted transition-colors"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              <span>Search articles...</span>
              <kbd className="ml-auto text-xs border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </button>

            {/* Categories */}
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Categories</span>
            <div className="flex flex-col space-y-1 mb-4">
              {NAV_ITEMS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-medium py-1.5 transition-colors ${isActiveRoute(to) ? 'text-primary' : 'hover:text-primary'}`}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="border-t border-border my-2" />

            {/* Tools */}
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 mt-2">Tools</span>
            <div className="flex flex-col space-y-1 mb-4">
              {TOOLS_ITEMS.map(({ to, label, description, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-start gap-3 py-2 hover:bg-muted/50 rounded-lg px-2 transition-colors -mx-2"
                >
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground leading-snug">{description}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="border-t border-border my-2" />

            {/* Your Account */}
            <div className="flex items-center gap-2 mb-2 mt-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Your Account</span>
              {user && userStats && (
                <span className="text-xs text-muted-foreground">⚡ {userStats.points} pts</span>
              )}
            </div>
            <div className="flex flex-col space-y-1 mb-4">
              <Link to="/saved" onClick={() => setIsMenuOpen(false)} className="text-sm py-1.5 hover:text-primary transition-colors flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Saved Articles
              </Link>
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="text-sm py-1.5 hover:text-primary transition-colors flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="text-sm py-1.5 text-destructive hover:text-destructive/80 transition-colors flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  )}
                  <button onClick={() => { signOut(); setIsMenuOpen(false); }} className="text-sm py-1.5 hover:text-primary transition-colors flex items-center gap-2 text-left">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Button variant="default" className="w-full mt-1" asChild>
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                </Button>
              )}
            </div>

            <div className="border-t border-border my-2" />

          </div>
        </nav>
      </div>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
});

Header.displayName = 'Header';

export default Header;

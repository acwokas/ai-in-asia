import { Search, Menu, User, LogOut, Shield, Bookmark, Zap, Award, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useSavedArticles } from "@/hooks/useSavedArticles";
import logo from "@/assets/aiinasia-logo.png";
import SearchOverlay from "@/components/SearchOverlay";

const Header = memo(() => {
  const [isDark] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const { savedArticles } = useSavedArticles();
  const savedCount = savedArticles.length;

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-24 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center -ml-0 md:-ml-8">
              <img src={logo} alt="AI in ASIA" className="h-20 md:h-24 w-auto" width={171} height={96} />
            </Link>
            
            <nav className="hidden md:flex items-center space-x-5">
              <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
              <Link to="/category/news" className="text-sm font-medium hover:text-primary transition-colors">News</Link>
              <Link to="/category/business" className="text-sm font-medium hover:text-primary transition-colors">Business</Link>
              <Link to="/category/life" className="text-sm font-medium hover:text-primary transition-colors">Life</Link>
              <Link to="/category/learn" className="text-sm font-medium hover:text-primary transition-colors">Learn</Link>
              <Link to="/category/create" className="text-sm font-medium hover:text-primary transition-colors">Create</Link>
              <Link to="/category/voices" className="text-sm font-medium hover:text-primary transition-colors">Voices</Link>
              <Link to="/category/policy" className="text-sm font-medium hover:text-primary transition-colors">Policy</Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-sm font-medium hover:!text-primary gap-1 px-2">
                    More <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover z-50">
                  <DropdownMenuItem asChild><Link to="/guides">Guides</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/prompts">Prompts</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/tools">Tools</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/events">Events</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/ai-policy-atlas">Policy Atlas</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to="/saved" className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1.5">
                <Bookmark className="h-4 w-4" />
                {savedCount > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full px-1.5 text-xs leading-[18px] text-center bg-primary/20 border border-primary/30 text-primary">
                    {savedCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>

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
                            {userStats && (
                              <div className="px-2 pb-2 pt-1 space-y-0.5">
                                <p className="text-xs font-medium text-foreground">{userStats.level}</p>
                                <p className="text-xs text-muted-foreground">🔥 {userStats.streak_days} day streak</p>
                                <p className="text-xs text-muted-foreground">⚡ {userStats.points} points</p>
                              </div>
                            )}
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
                    aria-label="Toggle menu"
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
              {[
                { to: "/category/news", label: "News" },
                { to: "/category/business", label: "Business" },
                { to: "/category/life", label: "Life" },
                { to: "/category/learn", label: "Learn" },
                { to: "/category/create", label: "Create" },
                { to: "/category/voices", label: "Voices" },
                { to: "/category/policy", label: "Policy" },
              ].map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setIsMenuOpen(false)} className="font-medium py-1.5 hover:text-primary transition-colors">
                  {label}
                </Link>
              ))}
            </div>

            <div className="border-t border-border my-2" />

            {/* Discover */}
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 mt-2">Discover</span>
            <div className="flex flex-col space-y-1 mb-4">
              {[
                { to: "/guides", label: "Guides" },
                { to: "/prompts", label: "Prompts" },
                { to: "/tools", label: "Tools" },
                { to: "/events", label: "Events" },
                { to: "/ai-policy-atlas", label: "Policy Atlas" },
              ].map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setIsMenuOpen(false)} className="text-sm py-1.5 hover:text-primary transition-colors">
                  {label}
                </Link>
              ))}
            </div>

            <div className="border-t border-border my-2" />

            {/* Your Account */}
            <div className="flex items-center gap-2 mb-2 mt-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Your Account</span>
              {user && userStats && (
                <span className="text-xs text-muted-foreground">— ⚡ {userStats.points} pts</span>
              )}
            </div>
            <div className="flex flex-col space-y-1 mb-4">
              <Link to="/saved" onClick={() => setIsMenuOpen(false)} className="text-sm py-1.5 hover:text-primary transition-colors flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Saved Articles
                {savedCount > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full px-1.5 text-xs leading-[18px] text-center bg-primary/20 border border-primary/30 text-primary">
                    {savedCount}
                  </span>
                )}
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

            {/* Bottom actions */}
            <div className="flex items-center gap-2 mt-2">
              <NotificationPreferences />
              <ReadingQueue />
            </div>
          </div>
        </nav>
      </div>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
});

Header.displayName = 'Header';

export default Header;

import { Search, Menu, Moon, Sun, User, LogOut, Shield, Bookmark, Zap } from "lucide-react";
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
import { useState, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useSavedArticles } from "@/hooks/useSavedArticles";
import logo from "@/assets/aiinasia-logo.png";

const Header = memo(() => {
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const { savedArticles } = useSavedArticles();
  const savedCount = savedArticles.length;

  const { data: userPoints } = useQuery({
    queryKey: ["header-user-stats", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_stats")
        .select("points")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.points ?? 0;
    },
  });
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

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
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
              <Link to="/category/news" className="text-sm font-medium hover:text-primary transition-colors">News</Link>
              <Link to="/category/business" className="text-sm font-medium hover:text-primary transition-colors">Business</Link>
              <Link to="/category/life" className="text-sm font-medium hover:text-primary transition-colors">Life</Link>
              <Link to="/category/learn" className="text-sm font-medium hover:text-primary transition-colors">Learn</Link>
              <Link to="/category/create" className="text-sm font-medium hover:text-primary transition-colors">Create</Link>
              <Link to="/category/voices" className="text-sm font-medium hover:text-primary transition-colors">Voices</Link>
              <div className="h-4 w-px bg-primary mx-2" />
              <Link to="/guides" className="text-sm font-medium hover:text-primary transition-colors">Guides</Link>
              <Link to="/prompts" className="text-sm font-medium hover:text-primary transition-colors">Prompts</Link>
              <Link to="/tools" className="text-sm font-medium hover:text-primary transition-colors">Tools</Link>
              <Link to="/events" className="text-sm font-medium hover:text-primary transition-colors">Events</Link>
              <div className="h-4 w-px bg-primary mx-2" />
              <Link to="/ai-policy-atlas" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">Policy Atlas</Link>
              <div className="h-4 w-px bg-primary mx-2" />
              <Link to="/saved" className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1.5">
                Saved
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
                    onClick={() => navigate('/search')}
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
                    onClick={() => navigate('/search')}
                    aria-label="Search"
                    className="hidden lg:flex h-10 w-10"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search</TooltipContent>
              </Tooltip>

              <div className="hidden md:flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      aria-label="Toggle theme"
                      className="h-10 w-10"
                    >
                      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isDark ? "Light mode" : "Dark mode"}</TooltipContent>
                </Tooltip>
                
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to="/profile" className="cursor-pointer">
                                Profile
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
                    className="md:hidden h-10 w-10"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Menu</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border max-h-[calc(100vh-6rem)] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="flex flex-col space-y-3">
              <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
              <Link to="/category/news" className="text-sm font-medium hover:text-primary transition-colors">News</Link>
              <Link to="/category/business" className="text-sm font-medium hover:text-primary transition-colors">Business</Link>
              <Link to="/category/life" className="text-sm font-medium hover:text-primary transition-colors">Life</Link>
              <Link to="/category/learn" className="text-sm font-medium hover:text-primary transition-colors">Learn</Link>
              <Link to="/category/create" className="text-sm font-medium hover:text-primary transition-colors">Create</Link>
              <Link to="/category/voices" className="text-sm font-medium hover:text-primary transition-colors">Voices</Link>
              <div className="h-px bg-primary my-2" />
              <Link to="/guides" className="text-sm font-medium hover:text-primary transition-colors">Guides</Link>
              <Link to="/prompts" className="text-sm font-medium hover:text-primary transition-colors">Prompts</Link>
              <Link to="/tools" className="text-sm font-medium hover:text-primary transition-colors">Tools</Link>
              <Link to="/events" className="text-sm font-medium hover:text-primary transition-colors">Events</Link>
              <div className="h-px bg-primary my-2" />
              <Link to="/ai-policy-atlas" className="text-sm font-medium hover:text-primary transition-colors">Policy Atlas</Link>
              <Link to="/saved" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Saved Articles
                {savedCount > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full px-1.5 text-xs leading-[18px] text-center bg-primary/20 border border-primary/30 text-primary">
                    {savedCount}
                  </span>
                )}
              </Link>
              <div className="h-px bg-primary my-2" />
              <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
              <form onSubmit={handleSearch} className="pt-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search articles..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
              {!user && (
                <div className="pt-2">
                  <Button variant="default" className="w-full" asChild>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                </div>
              )}
              {user && (
                <>
                  <div className="pt-2">
                    <Button variant="default" className="w-full" asChild>
                      <Link to="/profile">Profile</Link>
                    </Button>
                  </div>
                  {isAdmin && (
                    <div>
                      <Button variant="destructive" className="w-full" asChild>
                        <Link to="/admin">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin
                        </Link>
                      </Button>
                    </div>
                  )}
                  <div>
                    <Button variant="outline" className="w-full" onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <NotificationPreferences />
                <ReadingQueue />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="h-10 w-10"
                >
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;

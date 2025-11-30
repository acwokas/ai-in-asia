import { Search, Menu, Moon, Sun, User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReadingQueue from "@/components/ReadingQueue";
import NotificationPreferences from "@/components/NotificationPreferences";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import logo from "@/assets/aiinasia-logo.png";

const Header = memo(() => {
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRole();

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
              <Link to="/ai-policy-atlas" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">AI Policy Atlas</Link>
              <div className="h-4 w-px bg-primary mx-2" />
              <Link to="/prompts" className="text-sm font-medium hover:text-primary transition-colors">Prompts</Link>
              <Link to="/tools" className="text-sm font-medium hover:text-primary transition-colors">Tools</Link>
              <Link to="/events" className="text-sm font-medium hover:text-primary transition-colors">Events</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile search button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/search')}
              aria-label="Search"
              className="flex lg:hidden h-12 w-12"
            >
              <Search className="h-6 w-6" />
            </Button>

            {/* Desktop search form */}
            <form onSubmit={handleSearch} className="hidden lg:flex items-center gap-2 ml-8">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search articles..."
                  className="w-48 pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            <div className="hidden md:flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="h-12 w-12 md:h-16 md:w-16"
              >
                {isDark ? <Sun className="h-6 w-6 md:h-8 md:w-8" /> : <Moon className="h-6 w-6 md:h-8 md:w-8" />}
              </Button>
              
              <NotificationPreferences />
              <ReadingQueue />
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-12 w-12 md:h-16 md:w-16" aria-label="User menu">
                      <User className="h-6 w-6 md:h-8 md:w-8" />
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
              ) : (
                <Button variant="default" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-12 w-12"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-3">
              <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
              <Link to="/category/news" className="text-sm font-medium hover:text-primary transition-colors">News</Link>
              <Link to="/category/business" className="text-sm font-medium hover:text-primary transition-colors">Business</Link>
              <Link to="/category/life" className="text-sm font-medium hover:text-primary transition-colors">Life</Link>
              <Link to="/category/learn" className="text-sm font-medium hover:text-primary transition-colors">Learn</Link>
              <Link to="/category/create" className="text-sm font-medium hover:text-primary transition-colors">Create</Link>
              <Link to="/category/voices" className="text-sm font-medium hover:text-primary transition-colors">Voices</Link>
              <div className="h-px bg-primary my-2" />
              <Link to="/ai-policy-atlas" className="text-sm font-medium hover:text-primary transition-colors">AI Policy Atlas</Link>
              <div className="h-px bg-primary my-2" />
              <Link to="/prompts" className="text-sm font-medium hover:text-primary transition-colors">Prompts</Link>
              <Link to="/tools" className="text-sm font-medium hover:text-primary transition-colors">Tools</Link>
              <Link to="/events" className="text-sm font-medium hover:text-primary transition-colors">Events</Link>
              <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
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

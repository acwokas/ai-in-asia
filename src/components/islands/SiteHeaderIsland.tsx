import { useState, useEffect, useRef } from 'react';

interface Props {
  currentPath?: string;
}

const NAV = [
  { href: '/news',     label: 'News',     tip: 'Latest AI news from across Asia' },
  { href: '/business', label: 'Business', tip: 'AI business strategy and enterprise' },
  { href: '/life',     label: 'Life',     tip: "AI's impact on everyday life in Asia" },
  { href: '/learn',    label: 'Learn',    tip: 'Guides, courses, and how-tos' },
  { href: '/create',   label: 'Create',   tip: 'Generative AI tools and creativity' },
  { href: '/voices',   label: 'Voices',   tip: 'Opinions, analysis, and perspectives' },
];

const NAV_TOOLS = [
  { href: '/tools',             label: 'All Tools' },
  { href: '/guides',            label: 'Guides' },
  { href: '/events',            label: 'Events' },
  { href: '/tools/ai-glossary', label: 'AI Glossary' },
  { href: '/ai-companies',      label: 'AI Companies' },
];

export default function SiteHeaderIsland({ currentPath = '/' }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const ssrHeader = document.getElementById('site-header-ssr');
    if (ssrHeader) ssrHeader.style.display = 'none';

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') { setSearchOpen(false); setMenuOpen(false); setToolsOpen(false); }
    };
    document.addEventListener('keydown', onKey);

    const onClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
  };

  const isActive = (href: string) => href === '/' ? currentPath === '/' : currentPath.startsWith(href);
  const isToolsActive = NAV_TOOLS.some(n => isActive(n.href));

  const linkCls = (href: string) =>
    `whitespace-nowrap transition-colors text-sm ${isActive(href) ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`;

  if (!mounted) return null;

  return (
    <>
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <a href="/" className="shrink-0">
            <img src="/logos/aiinasia-logo.png" alt="AI in Asia" className="h-8 w-auto" />
          </a>

          <nav className="hidden lg:flex items-center gap-5 text-sm overflow-x-auto flex-1">
            {NAV.map(n => (
              <a key={n.href} href={n.href} className={linkCls(n.href)} title={n.tip}>{n.label}</a>
            ))}

            <div ref={toolsRef} className="relative">
              <button
                onClick={() => setToolsOpen(o => !o)}
                className={`whitespace-nowrap transition-colors text-sm flex items-center gap-1 cursor-pointer ${isToolsActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Tools
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: toolsOpen ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }}><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {toolsOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  {NAV_TOOLS.map(n => (
                    <a
                      key={n.href}
                      href={n.href}
                      onClick={() => setToolsOpen(false)}
                      className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {n.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Search (Cmd+K)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <a href="/newsletter" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Newsletter
            </a>
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-background border-l border-border flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <span className="font-bold text-lg">AI in Asia</span>
              <button onClick={() => setMenuOpen(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV.map(n => (
                <a key={n.href} href={n.href} className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive(n.href) ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                  {n.label}
                </a>
              ))}
              <div className="px-3 pt-3 pb-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Tools</p>
                {NAV_TOOLS.map(n => (
                  <a key={n.href} href={n.href} className={`flex items-center pl-2 py-2 rounded-lg text-sm transition-colors ${isActive(n.href) ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                    {n.label}
                  </a>
                ))}
              </div>
            </nav>
            <div className="p-4 border-t border-border/40">
              <a href="/newsletter" className="flex items-center justify-center w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                Subscribe to newsletter
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
            <form onSubmit={handleSearch}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search AI in Asia..."
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border border-border text-muted-foreground">Esc</kbd>
              </div>
            </form>
            <div className="px-4 py-3 text-xs text-muted-foreground">
              Type and press Enter to search, or{' '}
              <a href="/search" className="underline hover:text-foreground" onClick={() => setSearchOpen(false)}>
                open full search
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

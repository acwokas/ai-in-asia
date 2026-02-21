import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Sparkles, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Featured picks (Perplexity & ElevenLabs) ─────────────────
const FEATURED_PICKS = [
  {
    name: "Perplexity Comet",
    tagline: "AI-powered web browser with Pro access",
    description: "Experience Perplexity's brilliant AI-powered Comet web browser (desktop only) and get 1 month of Pro for free!",
    whyRecommend: "Perplexity has quietly become my default research tool. The Comet browser takes it further — AI-native browsing that actually changes how you interact with the web. If you haven't tried it yet, this is the best way in.",
    url: "https://pplx.ai/me55304",
    icon: Sparkles,
    category: "Research",
  },
  {
    name: "ElevenLabs",
    tagline: "Studio-quality AI voice generation",
    description: "Create studio-quality AI voices with ElevenLabs — one of the most in-demand creator tools online.",
    whyRecommend: "I've tested every major voice AI platform. ElevenLabs is in a different league for quality, control, and speed. Whether you're doing podcasts, video narration, or accessibility — this is the one.",
    url: "https://try.elevenlabs.io/hl2h6rt26ia8",
    icon: Mic,
    category: "Audio/Video",
  },
];

// ─── Curated tool picks ───────────────────────────────────────
const TOOL_PICKS = [
  // TODO: Replace placeholder editorial text with Adrian's genuine recommendation
  { name: "Claude", maker: "Anthropic", tagline: "The AI assistant that thinks before it speaks", category: "Writing", url: "https://claude.ai" },
  { name: "ChatGPT", maker: "OpenAI", tagline: "The one that started it all — still indispensable", category: "Writing", url: "https://chat.openai.com" },
  { name: "Perplexity", maker: "Perplexity AI", tagline: "Search that actually answers your questions", category: "Research", url: "https://perplexity.ai" },
  { name: "Gemini", maker: "Google", tagline: "Google's multimodal powerhouse", category: "Writing", url: "https://gemini.google.com" },
  { name: "Midjourney", maker: "Midjourney", tagline: "Still the gold standard for AI image generation", category: "Image", url: "https://midjourney.com" },
  { name: "Cursor", maker: "Cursor", tagline: "VS Code supercharged with AI — changed how I code", category: "Code", url: "https://cursor.com" },
  { name: "Lovable", maker: "Lovable", tagline: "Build full apps with AI — this site was made with it", category: "Code", url: "https://lovable.dev" },
  { name: "NotebookLM", maker: "Google", tagline: "Turn documents into conversations and podcasts", category: "Research", url: "https://notebooklm.google" },
  { name: "Gamma", maker: "Gamma", tagline: "Presentations that build themselves beautifully", category: "Productivity", url: "https://gamma.app" },
  { name: "Descript", maker: "Descript", tagline: "Edit video and audio like you're editing a document", category: "Audio/Video", url: "https://descript.com" },
  { name: "Napkin AI", maker: "Napkin AI", tagline: "Turn messy thoughts into clear visual diagrams", category: "Productivity", url: "https://napkin.ai" },
  { name: "ElevenLabs", maker: "ElevenLabs", tagline: "Voice cloning and generation that sounds real", category: "Audio/Video", url: "https://elevenlabs.io" },
];

const TOOL_CATEGORIES = ["All", "Writing", "Research", "Image", "Code", "Audio/Video", "Productivity"];

interface AdriansToolboxProps {
  searchQuery?: string;
}

const AdriansToolbox = ({ searchQuery = "" }: AdriansToolboxProps) => {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expandedPick, setExpandedPick] = useState<number | null>(null);

  const filteredTools = TOOL_PICKS.filter(tool => {
    const matchesCategory = categoryFilter === "All" || tool.category === categoryFilter;
    const matchesSearch = !searchQuery || 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredFeatured = FEATURED_PICKS.filter(pick => {
    const matchesCategory = categoryFilter === "All" || pick.category === categoryFilter;
    const matchesSearch = !searchQuery ||
      pick.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pick.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-12">
      {/* Section Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Adrian's AI Toolbox</h2>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
          Tools I actually use and recommend. No affiliate links, no sponsored placements. Just honest picks from years of daily AI use across Asia.
        </p>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {TOOL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              categoryFilter === cat
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured Picks */}
      {filteredFeatured.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFeatured.map((pick, idx) => {
            const Icon = pick.icon;
            const isExpanded = expandedPick === idx;

            return (
              <div
                key={pick.name}
                className="relative rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/5 via-card to-teal-500/[0.02] p-6 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-t-2xl" />

                <div className="flex items-start gap-4 mb-4 mt-1">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-500/15 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/30 mb-2">
                      Featured Pick
                    </span>
                    <h3 className="font-bold text-xl text-foreground">{pick.name}</h3>
                    <p className="text-sm text-muted-foreground">{pick.tagline}</p>
                  </div>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                  {pick.description}
                </p>

                {/* Why I recommend this - expandable */}
                <button
                  onClick={() => setExpandedPick(isExpanded ? null : idx)}
                  className="flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium mb-4 transition-colors"
                >
                  Why I recommend this
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isExpanded && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 pl-4 border-l-2 border-teal-500/30 italic">
                    {pick.whyRecommend}
                  </p>
                )}

                <Button className="w-full gap-2 font-semibold" asChild>
                  <a href={pick.url} target="_blank" rel="noopener noreferrer">
                    Get Started <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tool Picks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTools.map(tool => (
          <div
            key={tool.name}
            className="group relative rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/5 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-foreground text-lg group-hover:text-teal-400 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs text-muted-foreground">{tool.maker}</p>
              </div>
              <Badge variant="outline" className="text-[11px] shrink-0 text-muted-foreground">
                {tool.category}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-3 italic">
              "{tool.tagline}"
            </p>

            {/* TODO: Replace placeholder editorial text with Adrian's genuine recommendation */}
            <p className="text-sm text-muted-foreground/70 mb-4">
              Editorial recommendation coming soon. Check back shortly.
            </p>

            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
            >
              Try it <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ))}
      </div>

      {filteredTools.length === 0 && filteredFeatured.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No tools match your current filters.</p>
      )}

      {/* Bottom CTA */}
      <div className="text-center py-6 border-t border-border">
        <p className="text-muted-foreground">
          Know a tool that should be on this list? Drop a comment or reach out — always looking for recommendations from the community.
        </p>
      </div>
    </div>
  );
};

export default AdriansToolbox;

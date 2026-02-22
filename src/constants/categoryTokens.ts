// Shared design tokens for category pages

export const CATEGORY_CONFIG = {
  news: {
    accent: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.15)",
    emoji: "newspaper",
    icon: "Radar",
    label: "News",
    desc: "Breaking developments and signals from the AI landscape across Asia-Pacific",
    metaDesc: "Latest AI news, developments, and breaking stories from across Asia Pacific. Stay informed on the technology shaping the region.",
    filters: ["All", "Featured", "OpenAI", "Data & AI", "AGI", "AI Regulation"],
  },
  business: {
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.15)",
    emoji: "briefcase",
    icon: "BarChart3",
    label: "Business",
    desc: "How AI is reshaping industries across Asia-Pacific",
    metaDesc: "AI business strategy, enterprise adoption, and commercial insights for leaders across Asia Pacific.",
    filters: ["All", "AI in Asia", "AI Tools", "Future of Work", "Data Governance", "AI Implementation"],
  },
  life: {
    accent: "#c084fc",
    glow: "rgba(192, 132, 252, 0.15)",
    emoji: "globe",
    icon: "Compass",
    label: "Life",
    desc: "AI's impact on everyday life, health, culture, and society",
    metaDesc: "How AI is changing daily life, health, education, and personal productivity across Asia.",
    filters: ["All", "AI Security", "AI & Culture", "AI Relationships", "AI Shopping", "APAC Integration"],
  },
  learn: {
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.15)",
    emoji: "graduation-cap",
    icon: "BookOpen",
    label: "Learn",
    desc: "Tutorials, explainers, and guides to sharpen your AI skills",
    metaDesc: "AI tutorials, guides, and learning resources. Build practical AI skills with step-by-step content.",
    filters: ["All", "AI Productivity", "Generative AI", "ChatGPT", "AI Tools", "Beginner Guides"],
  },
  create: {
    accent: "#f97316",
    glow: "rgba(249, 115, 22, 0.15)",
    emoji: "palette",
    icon: "Wand2",
    label: "Create",
    desc: "Tools, prompts, and workflows for AI-powered creation",
    metaDesc: "AI creative tools, prompt engineering, and content creation techniques. Make better work with AI.",
    filters: ["All", "AI Prompts", "AI Art", "Design AI", "Productivity Tools", "AI Workflows"],
  },
  voices: {
    accent: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.15)",
    emoji: "mic",
    icon: "Quote",
    label: "Voices",
    desc: "Opinion, analysis, and commentary from AI practitioners and thinkers",
    metaDesc: "Opinions, interviews, and perspectives from AI leaders, founders, and practitioners across Asia.",
    filters: ["All", "Deep Dive", "Business", "Opinion", "Asia", "Heritage"],
  },
  policy: {
    accent: "#eab308",
    glow: "rgba(234, 179, 8, 0.15)",
    emoji: "scale",
    icon: "Scale",
    label: "Policy",
    desc: "AI regulation, governance frameworks, and government strategy across Asia-Pacific",
    metaDesc: "AI regulation, governance, and policy developments across Asian markets and governments.",
    filters: ["All"],
  },
} as const;

export type CategorySlug = keyof typeof CATEGORY_CONFIG;

// Shared surface / chrome tokens (dark theme)
export const TOKENS = {
  BG: "#040405",
  CARD_BG: "#0d0e12",
  SURFACE: "#111318",
  BORDER: "#1a1d25",
  MUTED: "#9ca3af",
  BRAND: "#5F72FF",
} as const;

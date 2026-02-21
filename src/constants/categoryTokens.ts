// Shared design tokens for category pages

export const CATEGORY_CONFIG = {
  news: {
    accent: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.15)",
    emoji: "📡",
    label: "News",
    desc: "Breaking developments and signals from the AI landscape across Asia-Pacific",
    filters: ["All", "Featured", "OpenAI", "Data & AI", "AGI", "AI Regulation"],
  },
  business: {
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.15)",
    emoji: "💼",
    label: "Business",
    desc: "How AI is reshaping industries across Asia-Pacific",
    filters: ["All", "AI in Asia", "AI Tools", "Future of Work", "Data Governance", "AI Implementation"],
  },
  life: {
    accent: "#a855f7",
    glow: "rgba(168, 85, 247, 0.15)",
    emoji: "🌏",
    label: "Life",
    desc: "AI's impact on everyday life, health, culture, and society",
    filters: ["All", "AI Security", "AI & Culture", "AI Relationships", "AI Shopping", "APAC Integration"],
  },
  learn: {
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.15)",
    emoji: "🎓",
    label: "Learn",
    desc: "Tutorials, explainers, and guides to sharpen your AI skills",
    filters: ["All", "AI Productivity", "Generative AI", "ChatGPT", "AI Tools", "Beginner Guides"],
  },
  create: {
    accent: "#f97316",
    glow: "rgba(249, 115, 22, 0.15)",
    emoji: "🎨",
    label: "Create",
    desc: "Tools, prompts, and workflows for AI-powered creation",
    filters: ["All", "AI Prompts", "AI Art", "Design AI", "Productivity Tools", "AI Workflows"],
  },
  voices: {
    accent: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.15)",
    emoji: "🎙️",
    label: "Voices",
    desc: "Opinion, analysis, and commentary from AI practitioners and thinkers",
    filters: ["All", "Deep Dive", "Business", "Opinion", "Asia", "Heritage"],
  },
} as const;

export type CategorySlug = keyof typeof CATEGORY_CONFIG;

// Shared surface / chrome tokens (dark theme)
export const TOKENS = {
  BG: "#040405",
  CARD_BG: "#0d0e12",
  SURFACE: "#111318",
  BORDER: "#1a1d25",
  MUTED: "#6b7280",
  BRAND: "#5F72FF",
} as const;

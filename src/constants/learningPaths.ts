export const LEARNING_PATHS: Record<string, { emoji: string; title: string; desc: string; articles: number; time: string; color: string }[]> = {
  news: [
    { emoji: "📡", title: "This Week in Asian AI", desc: "Curated weekly briefing", articles: 4, time: "15 min", color: "#3b82f6" },
    { emoji: "🏛️", title: "AI Policy Tracker", desc: "Regulation across APAC", articles: 6, time: "30 min", color: "#ef4444" },
    { emoji: "💰", title: "Funding & Deals", desc: "Investment signals", articles: 5, time: "20 min", color: "#22c55e" },
    { emoji: "🔬", title: "Research Radar", desc: "Breakthroughs that matter", articles: 4, time: "25 min", color: "#f59e0b" },
  ],
  business: [
    { emoji: "📊", title: "AI ROI Playbook", desc: "From pilot to profit", articles: 7, time: "1.5 hrs", color: "#10b981" },
    { emoji: "🏢", title: "Enterprise AI 101", desc: "Getting started right", articles: 5, time: "1 hr", color: "#3b82f6" },
    { emoji: "🌏", title: "AI in ASEAN Markets", desc: "Regional case studies", articles: 6, time: "1.5 hrs", color: "#f59e0b" },
    { emoji: "⚖️", title: "Governance Essentials", desc: "Compliance & ethics", articles: 4, time: "45 min", color: "#ef4444" },
  ],
  life: [
    { emoji: "🛡️", title: "AI Safety for Everyone", desc: "Protect yourself online", articles: 5, time: "30 min", color: "#ef4444" },
    { emoji: "🧠", title: "AI & Mental Health", desc: "Navigate responsibly", articles: 4, time: "25 min", color: "#a855f7" },
    { emoji: "🛒", title: "Smart AI Shopping", desc: "Tools that save money", articles: 3, time: "15 min", color: "#22c55e" },
    { emoji: "🎮", title: "AI in Entertainment", desc: "Games, music, film", articles: 5, time: "30 min", color: "#3b82f6" },
  ],
  learn: [
    { emoji: "🌱", title: "AI for Complete Beginners", desc: "Start from zero", articles: 6, time: "45 min", color: "#10b981" },
    { emoji: "⚡", title: "Prompt Engineering Mastery", desc: "Basic to advanced", articles: 8, time: "1.5 hrs", color: "#f59e0b" },
    { emoji: "🔧", title: "AI Tools Power User", desc: "Master ChatGPT, Claude, Gemini", articles: 5, time: "1 hr", color: "#8b5cf6" },
    { emoji: "🏢", title: "AI in Business (Asia)", desc: "Real SEA cases", articles: 7, time: "2 hrs", color: "#ef4444" },
  ],
  create: [
    { emoji: "✏️", title: "AI Writing Mastery", desc: "Content that converts", articles: 6, time: "1 hr", color: "#f97316" },
    { emoji: "🖼️", title: "AI Image Generation", desc: "Midjourney to Firefly", articles: 5, time: "45 min", color: "#ec4899" },
    { emoji: "🎬", title: "AI Video & Audio", desc: "Runway, Sora, ElevenLabs", articles: 4, time: "30 min", color: "#8b5cf6" },
    { emoji: "💼", title: "AI for Freelancers", desc: "Workflow automation", articles: 5, time: "1 hr", color: "#22c55e" },
  ],
  voices: [
    { emoji: "🗺️", title: "AI Across Asia", desc: "Country deep dives", articles: 8, time: "2 hrs", color: "#06b6d4" },
    { emoji: "⚖️", title: "Ethics & Governance", desc: "The hard questions", articles: 5, time: "1 hr", color: "#ef4444" },
    { emoji: "🔮", title: "Future Predictions", desc: "Where we're heading", articles: 4, time: "30 min", color: "#f59e0b" },
    { emoji: "💬", title: "Practitioner Stories", desc: "From the field", articles: 6, time: "1.5 hrs", color: "#22c55e" },
  ],
};

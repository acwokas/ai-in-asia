const SEARCH_HISTORY_KEY = "aiia_recent_searches";
const MAX_HISTORY = 5;

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const history = getSearchHistory().filter((h) => h.toLowerCase() !== trimmed.toLowerCase());
  history.unshift(trimmed);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

// Simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

const COMMON_AI_TERMS = [
  "artificial intelligence", "machine learning", "deep learning", "neural network",
  "ChatGPT", "OpenAI", "Google", "Gemini", "Claude", "Anthropic", "GPT",
  "large language model", "LLM", "transformer", "diffusion", "generative AI",
  "computer vision", "natural language processing", "NLP", "reinforcement learning",
  "Singapore", "Japan", "China", "India", "South Korea", "Taiwan", "Indonesia",
  "Thailand", "Vietnam", "Philippines", "Malaysia", "Australia", "Hong Kong",
  "regulation", "governance", "policy", "ethics", "safety", "alignment",
  "startup", "funding", "investment", "venture capital", "unicorn",
  "robotics", "automation", "autonomous", "self-driving", "drone",
  "healthcare", "fintech", "education", "manufacturing", "agriculture",
  "semiconductor", "chip", "GPU", "NVIDIA", "TSMC", "Samsung",
  "data privacy", "cybersecurity", "cloud computing", "edge computing",
  "metaverse", "blockchain", "cryptocurrency", "Web3",
  "prompt engineering", "fine-tuning", "RAG", "retrieval", "embedding",
  "multimodal", "agentic", "agent", "copilot", "assistant",
  "open source", "API", "benchmark", "hallucination", "bias",
  "enterprise", "SaaS", "B2B", "digital transformation",
  "responsible AI", "explainability", "transparency", "fairness",
  "Baidu", "Alibaba", "Tencent", "ByteDance", "Huawei",
  "SoftBank", "Grab", "Sea Limited", "Gojek", "Tokopedia",
  "workforce", "jobs", "employment", "skills", "training",
  "research", "paper", "model", "dataset", "training data",
  "inference", "deployment", "production", "scalability",
  "speech recognition", "text to speech", "image generation",
  "video generation", "music generation", "code generation",
  "summarization", "translation", "sentiment analysis", "classification",
];

export function findDidYouMean(query: string, extraTerms: string[] = []): string | null {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return null;

  const allTerms = [...COMMON_AI_TERMS, ...extraTerms];
  let bestMatch = "";
  let bestDist = Infinity;

  for (const term of allTerms) {
    const t = term.toLowerCase();
    if (t === q) return null; // exact match, no suggestion
    const dist = levenshtein(q, t);
    const threshold = Math.max(1, Math.floor(q.length * 0.35));
    if (dist <= threshold && dist < bestDist) {
      bestDist = dist;
      bestMatch = term;
    }
  }

  return bestMatch || null;
}

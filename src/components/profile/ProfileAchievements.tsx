import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_icon: string;
  earned_at?: string;
  category?: string | null;
  points_required?: number | null;
}

interface ProfileAchievementsProps {
  achievements: Achievement[];
  totalPoints?: number;
  memberSince?: string;
}

// ── Text palette ───────────────────────────────────────────────────────────────
const TEXT = {
  primary: '#ffffff',
  secondary: '#d0d4dc',
  tertiary: '#b0b5c0',
};

// ── Category config ────────────────────────────────────────────────────────────
const CATEGORIES: { id: string; label: string; color: string; colorLight: string; names: string[] }[] = [
  { id: 'reading', label: 'Reading', color: '#3b82f6', colorLight: '#93c5fd', names: ['First Steps', 'Knowledge Seeker', 'Dedicated Reader', 'AI Scholar', 'AI Pioneer', 'News Hound', 'Tool Explorer'] },
  { id: 'streaks', label: 'Streaks', color: '#ef4444', colorLight: '#fca5a5', names: ['Week Warrior', 'Month Master', 'Early Adopter'] },
  { id: 'community', label: 'Community', color: '#a78bfa', colorLight: '#c4b5fd', names: ['Conversationalist', 'Comment Champion', 'Conversation Master'] },
  { id: 'engagement', label: 'Engagement', color: '#10b981', colorLight: '#6ee7b7', names: ['First Bookmark', 'Bookmark Collector', 'Social Sharer', 'Social Butterfly'] },
  { id: 'profile', label: 'Profile', color: '#06b6d4', colorLight: '#67e8f9', names: ['Digital Pioneer', 'Profile Master'] },
  { id: 'levels', label: 'Levels', color: '#eab308', colorLight: '#fde047', names: ['Explorer', 'Enthusiast', 'Expert', 'Thought Leader'] },
  { id: 'special', label: 'Special', color: '#ec4899', colorLight: '#f9a8d4', names: ['Newsletter Insider', 'Asia Expert'] },
];

// ── Tier system ────────────────────────────────────────────────────────────────
const TIER_MAP: Record<string, string> = {
  'First Steps': 'bronze', 'Knowledge Seeker': 'bronze', 'Tool Explorer': 'bronze', 'Conversationalist': 'bronze', 'First Bookmark': 'bronze', 'Social Butterfly': 'bronze', 'Explorer': 'bronze',
  'Dedicated Reader': 'silver', 'News Hound': 'silver', 'Week Warrior': 'silver', 'Comment Champion': 'silver', 'Bookmark Collector': 'silver', 'Social Sharer': 'silver', 'Digital Pioneer': 'silver', 'Enthusiast': 'silver', 'Newsletter Insider': 'silver',
  'AI Scholar': 'gold', 'Month Master': 'gold', 'Conversation Master': 'gold', 'Profile Master': 'gold', 'Expert': 'gold', 'Asia Expert': 'gold',
  'AI Pioneer': 'platinum', 'Early Adopter': 'platinum', 'Thought Leader': 'platinum',
};

const TIER_STYLES: Record<string, { gradient: string; shadow: string; ring: string; label: string; labelBg: string }> = {
  bronze: { gradient: 'linear-gradient(135deg, #78716c, #a8a29e, #d6d3d1)', shadow: '0 0 20px rgba(168,162,158,0.2)', ring: 'rgba(168,162,158,0.35)', label: 'Bronze', labelBg: 'linear-gradient(135deg, #78716c, #a8a29e)' },
  silver: { gradient: 'linear-gradient(135deg, #64748b, #94a3b8, #e2e8f0)', shadow: '0 0 22px rgba(148,163,184,0.25)', ring: 'rgba(148,163,184,0.35)', label: 'Silver', labelBg: 'linear-gradient(135deg, #64748b, #94a3b8)' },
  gold: { gradient: 'linear-gradient(135deg, #b45309, #d97706, #fbbf24)', shadow: '0 0 24px rgba(251,191,36,0.2)', ring: 'rgba(251,191,36,0.3)', label: 'Gold', labelBg: 'linear-gradient(135deg, #b45309, #fbbf24)' },
  platinum: { gradient: 'linear-gradient(135deg, #0284c7, #38bdf8, #bae6fd)', shadow: '0 0 28px rgba(56,189,248,0.25)', ring: 'rgba(56,189,248,0.35)', label: 'Platinum', labelBg: 'linear-gradient(135deg, #0284c7, #7dd3fc)' },
};

// ── SVG icon paths ─────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  reading: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  streaks: 'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z',
  community: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
  engagement: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
  profile: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  levels: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  special: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
};

const BADGE_ICONS: Record<string, string> = {
  'First Steps': 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  'Knowledge Seeker': 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  'Dedicated Reader': 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342',
  'AI Scholar': 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M12 18.75l-2.25-2.25M12 18.75l2.25-2.25',
  'AI Pioneer': 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z',
  'News Hound': 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5',
  'Tool Explorer': 'M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z',
  'Week Warrior': 'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z',
  'Month Master': 'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48zM12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z',
  'Early Adopter': 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  'Conversationalist': 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  'Comment Champion': 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
  'Conversation Master': 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z',
  'First Bookmark': 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z',
  'Bookmark Collector': 'M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9',
  'Social Sharer': 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
  'Social Butterfly': 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
  'Digital Pioneer': 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  'Profile Master': 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  'Explorer': 'M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z',
  'Enthusiast': 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
  'Expert': 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.45.31m5.45-.31a6.98 6.98 0 01-2.72.556 6.98 6.98 0 01-2.73-.556',
  'Thought Leader': 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18',
  'Newsletter Insider': 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  'Asia Expert': 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
};

// ── Hint messages for locked badges ────────────────────────────────────────────
const HINT_MESSAGES: Record<string, string> = {
  'First Steps': 'Read your first article',
  'Knowledge Seeker': 'Read 10 articles',
  'Dedicated Reader': 'Read 25 articles',
  'AI Scholar': 'Read 50 articles',
  'AI Pioneer': 'Read 100 articles',
  'News Hound': 'Read 20 news articles',
  'Tool Explorer': 'Read 10 tool-related articles',
  'Week Warrior': 'Maintain a 7-day reading streak',
  'Month Master': 'Maintain a 30-day reading streak',
  'Early Adopter': 'Join in the first month',
  'Conversationalist': 'Post your first comment',
  'Comment Champion': 'Post 10 comments',
  'Conversation Master': 'Post 25 comments',
  'First Bookmark': 'Bookmark your first article',
  'Bookmark Collector': 'Bookmark 10 articles',
  'Social Sharer': 'Share your first article',
  'Social Butterfly': 'Share 10 articles',
  'Digital Pioneer': 'Complete your profile',
  'Profile Master': 'Fill in all profile fields',
  'Explorer': 'Reach 0 points',
  'Enthusiast': 'Reach 50 points',
  'Expert': 'Reach 200 points',
  'Thought Leader': 'Reach 500 points',
  'Newsletter Insider': 'Subscribe to the newsletter',
  'Asia Expert': 'Read articles from all regions',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProgressRing({ earned, total }: { earned: number; total: number }) {
  const [animPct, setAnimPct] = useState(0);
  const r = 58, stroke = 7, circ = 2 * Math.PI * r;
  useEffect(() => { const t = setTimeout(() => setAnimPct((earned / Math.max(total, 1)) * 100), 200); return () => clearTimeout(t); }, [earned, total]);
  const offset = circ - (animPct / 100) * circ;

  return (
    <div className="relative flex-shrink-0" style={{ width: 152, height: 152 }}>
      <svg width="152" height="152" viewBox="0 0 152 152">
        <defs>
          <linearGradient id="achv-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="achv-glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <circle cx="76" cy="76" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx="76" cy="76" r={r} fill="none" stroke="url(#achv-ring-grad)" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 76 76)" filter="url(#achv-glow)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize: 40, fontWeight: 800, color: TEXT.primary, lineHeight: 1, fontFamily: "'Poppins', sans-serif" }}>{earned}</span>
        <span style={{ fontSize: 14, color: TEXT.secondary, marginTop: 4, fontWeight: 500 }}>of {total}</span>
      </div>
    </div>
  );
}

function BadgeIcon({ name, tier, earned, size = 52 }: { name: string; tier: string; earned: boolean; size?: number }) {
  const s = TIER_STYLES[tier] || TIER_STYLES.bronze;
  const path = BADGE_ICONS[name] || BADGE_ICONS['Explorer'];
  const iconSz = size * 0.44;
  return (
    <div className="flex items-center justify-center flex-shrink-0 rounded-full transition-all duration-300" style={{
      width: size, height: size,
      background: earned ? s.gradient : 'rgba(255,255,255,0.04)',
      border: earned ? 'none' : '1.5px dashed rgba(255,255,255,0.15)',
      boxShadow: earned ? s.shadow : 'none',
    }}>
      <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none"
        stroke={earned ? '#fff' : 'rgba(255,255,255,0.2)'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </div>
  );
}

function MicroProgressBar({ current, goal, color }: { current: number; goal: number; color: string }) {
  const pct = Math.min((current / Math.max(goal, 1)) * 100, 100);
  return (
    <div className="flex items-center gap-2.5" style={{ marginTop: 10 }}>
      <div className="flex-1 overflow-hidden" style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}99)`, transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: 13, color: TEXT.secondary, whiteSpace: 'nowrap', fontWeight: 600 }}>{current}/{goal}</span>
    </div>
  );
}

function AchievementCard({ achievement, categoryColor, onLockedClick }: {
  achievement: Achievement; categoryColor: string; onLockedClick: (name: string) => void;
}) {
  const tier = TIER_MAP[achievement.name] || 'bronze';
  const s = TIER_STYLES[tier];
  const isEarned = !!achievement.earned_at;

  return (
    <div
      role={!isEarned ? 'button' : undefined}
      tabIndex={!isEarned ? 0 : undefined}
      className="transition-all duration-300"
      style={{
        padding: '20px 22px', borderRadius: 14,
        background: isEarned ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.015)',
        border: isEarned ? `1px solid ${s.ring}` : '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        cursor: isEarned ? 'default' : 'pointer',
        opacity: isEarned ? 1 : 0.5,
      }}
      onClick={() => !isEarned && onLockedClick(achievement.name)}
      onKeyDown={(e) => { if (!isEarned && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onLockedClick(achievement.name); } }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-2px)';
        el.style.opacity = isEarned ? '1' : '0.7';
        if (isEarned) el.style.boxShadow = s.shadow;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0)';
        el.style.opacity = isEarned ? '1' : '0.5';
        el.style.boxShadow = 'none';
      }}
    >
      <div className="flex gap-4 items-start">
        <BadgeIcon name={achievement.name} tier={tier} earned={isEarned} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span style={{ fontSize: 16, fontWeight: 700, color: isEarned ? TEXT.primary : TEXT.tertiary, fontFamily: "'Poppins', sans-serif" }}>{achievement.name}</span>
            {isEarned && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 9px', borderRadius: 6, background: s.labelBg, color: '#fff' }}>{s.label}</span>
            )}
          </div>
          <p style={{ fontSize: 14, color: TEXT.secondary, marginTop: 5, lineHeight: 1.5 }}>{achievement.description}</p>
          {isEarned ? (
            <p style={{ fontSize: 14, color: categoryColor, marginTop: 8, fontWeight: 600 }}>
              Earned {format(new Date(achievement.earned_at!), 'MMM d, yyyy')}
            </p>
          ) : (
            <MicroProgressBar current={0} goal={achievement.points_required || 1} color={categoryColor} />
          )}
        </div>
      </div>
    </div>
  );
}

function CategorySection({ cat, achievements, isOpen, onToggle, onLockedClick }: {
  cat: typeof CATEGORIES[number]; achievements: Achievement[]; isOpen: boolean; onToggle: () => void; onLockedClick: (name: string) => void;
}) {
  const earnedCount = achievements.filter(a => a.earned_at).length;
  const total = achievements.length;
  const allEarned = earnedCount === total;

  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3.5 transition-colors duration-200"
        style={{
          padding: '16px 20px', borderRadius: 14,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer', color: TEXT.primary,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
      >
        <div className="flex items-center justify-center" style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${cat.color}18`, border: `1px solid ${cat.color}30`,
        }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={cat.colorLight} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={CATEGORY_ICONS[cat.id]} />
          </svg>
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>{cat.label}</span>
        <span style={{
          fontSize: 13, fontWeight: 600, padding: '4px 14px', borderRadius: 20,
          background: allEarned ? `linear-gradient(135deg, ${cat.color}30, ${cat.color}15)` : 'rgba(255,255,255,0.06)',
          color: allEarned ? cat.colorLight : TEXT.secondary,
          border: allEarned ? `1px solid ${cat.color}40` : '1px solid transparent',
        }}>
          {earnedCount}/{total}
        </span>
        <div className="flex-1" />
        <div className="flex gap-1.5">
          {achievements.map((a) => (
            <div key={a.id} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: a.earned_at ? cat.color : 'rgba(255,255,255,0.1)',
              boxShadow: a.earned_at ? `0 0 8px ${cat.color}50` : 'none',
            }} />
          ))}
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEXT.secondary} strokeWidth="2" strokeLinecap="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', marginLeft: 6 }}>
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div style={{ maxHeight: isOpen ? 2000 : 0, overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', padding: '14px 4px 4px' }}>
          {achievements.map((a, i) => (
            <div key={a.id} style={{ opacity: 0, animation: isOpen ? `achvFadeSlideIn 0.3s ease ${i * 0.06}s forwards` : 'none' }}>
              <AchievementCard achievement={a} categoryColor={cat.colorLight} onLockedClick={onLockedClick} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const ProfileAchievements = ({ achievements, totalPoints = 0, memberSince }: ProfileAchievementsProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ reading: true, levels: true });
  const toggle = (id: string) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  const earnedCount = achievements.filter(a => a.earned_at).length;
  const totalCount = achievements.length;

  // Recently earned (top 5)
  const earnedRecent = achievements
    .filter(a => a.earned_at)
    .sort((a, b) => new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime())
    .slice(0, 5);

  // Build category data
  const categoryData = CATEGORIES.map(cat => {
    const catAchievements = cat.names
      .map(name => achievements.find(a => a.name === name))
      .filter(Boolean) as Achievement[];
    return { cat, achievements: catAchievements };
  }).filter(c => c.achievements.length > 0);

  const handleLockedClick = (name: string) => {
    const hint = HINT_MESSAGES[name] || 'Keep exploring to unlock this achievement';
    toast('How to earn this', { description: hint });
  };

  return (
    <div>
      <style>{`@keyframes achvFadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Summary Header */}
      <div className="flex items-center gap-10 mb-12" style={{
        padding: '40px 44px', borderRadius: 22,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)',
        border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(40px)',
      }}>
        <ProgressRing earned={earnedCount} total={totalCount} />
        <div>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: TEXT.primary, fontFamily: "'Poppins', sans-serif" }}>
            {earnedCount} of {totalCount} Unlocked
          </h2>
          <p style={{ fontSize: 16, color: TEXT.secondary, marginTop: 10, fontWeight: 500 }}>
            {totalPoints.toLocaleString()} total points earned
          </p>
          {memberSince && (
            <p style={{ fontSize: 15, color: TEXT.tertiary, marginTop: 4 }}>
              Member since {format(new Date(memberSince), 'MMMM yyyy')}
            </p>
          )}
          {/* Category mini-bar */}
          <div className="flex overflow-hidden" style={{ gap: 2, marginTop: 18, height: 5, borderRadius: 3, width: 240 }}>
            {categoryData.map(({ cat, achievements: catAch }) => {
              const pct = (catAch.filter(a => a.earned_at).length / Math.max(totalCount, 1)) * 100;
              return pct > 0 ? <div key={cat.id} style={{ width: `${pct}%`, height: '100%', background: cat.color, borderRadius: 3 }} /> : null;
            })}
            <div className="flex-1" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3 }} />
          </div>
        </div>
      </div>

      {/* Recently Earned */}
      {earnedRecent.length > 0 && (
        <div style={{ marginBottom: 44 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT.secondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20, fontFamily: "'Poppins', sans-serif" }}>
            Recently Earned
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {earnedRecent.map((a, i) => {
              const tier = TIER_MAP[a.name] || 'bronze';
              const catDef = CATEGORIES.find(c => c.names.includes(a.name));
              return (
                <div key={a.id} className="flex flex-col items-center flex-shrink-0" style={{
                  padding: '28px 22px 22px', borderRadius: 18, minWidth: 140,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${TIER_STYLES[tier].ring}`,
                  backdropFilter: 'blur(20px)',
                  opacity: 0, animation: `achvFadeSlideIn 0.4s ease ${i * 0.1}s forwards`,
                }}>
                  <BadgeIcon name={a.name} tier={tier} earned={true} size={60} />
                  <span className="text-center" style={{ fontSize: 14, fontWeight: 700, color: TEXT.primary, marginTop: 14, lineHeight: 1.3, maxWidth: 120, fontFamily: "'Poppins', sans-serif" }}>{a.name}</span>
                  <span style={{ fontSize: 13, color: catDef?.colorLight || TEXT.secondary, marginTop: 6, fontWeight: 500 }}>
                    {format(new Date(a.earned_at!), 'MMM d, yyyy')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {categoryData.map(({ cat, achievements: catAch }) => (
        <CategorySection
          key={cat.id}
          cat={cat}
          achievements={catAch}
          isOpen={!!openSections[cat.id]}
          onToggle={() => toggle(cat.id)}
          onLockedClick={handleLockedClick}
        />
      ))}
    </div>
  );
};

export default ProfileAchievements;

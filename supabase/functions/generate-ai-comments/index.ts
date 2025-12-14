import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Regional expressions and patterns
const regionalPatterns: Record<string, { expressions: string[]; typoChance: number; shorthandChance: number; lowercaseChance: number; emojiChance: number; mobileTypoChance: number }> = {
  singapore: {
    expressions: ['lah', 'lor', 'sia', 'hor', 'leh', 'meh', 'one', 'can'],
    typoChance: 0.18,
    shorthandChance: 0.28,
    lowercaseChance: 0.25,
    emojiChance: 0.32,
    mobileTypoChance: 0.15,
  },
  india: {
    expressions: ['yaar', 'na', 'actually', 'basically', 'only'],
    typoChance: 0.12,
    shorthandChance: 0.22,
    lowercaseChance: 0.18,
    emojiChance: 0.28,
    mobileTypoChance: 0.12,
  },
  philippines: {
    expressions: ['po', 'naman', 'talaga', 'grabe'],
    typoChance: 0.15,
    shorthandChance: 0.32,
    lowercaseChance: 0.28,
    emojiChance: 0.42,
    mobileTypoChance: 0.18,
  },
  hong_kong: {
    expressions: ['la', 'ga', 'ah'],
    typoChance: 0.18,
    shorthandChance: 0.18,
    lowercaseChance: 0.15,
    emojiChance: 0.25,
    mobileTypoChance: 0.12,
  },
  china: {
    expressions: [],
    typoChance: 0.28,
    shorthandChance: 0.12,
    lowercaseChance: 0.32,
    emojiChance: 0.38,
    mobileTypoChance: 0.2,
  },
  usa: {
    expressions: ['like', 'literally', 'honestly', 'lowkey', 'ngl', 'fr'],
    typoChance: 0.15,
    shorthandChance: 0.38,
    lowercaseChance: 0.35,
    emojiChance: 0.28,
    mobileTypoChance: 0.2,
  },
  france: {
    expressions: ['en fait', 'voilà', "c'est"],
    typoChance: 0.2,
    shorthandChance: 0.18,
    lowercaseChance: 0.22,
    emojiChance: 0.32,
    mobileTypoChance: 0.15,
  },
  uk: {
    expressions: ['quite', 'rather', 'proper', 'brilliant', 'cheers', 'mate', 'reckon'],
    typoChance: 0.12,
    shorthandChance: 0.22,
    lowercaseChance: 0.18,
    emojiChance: 0.22,
    mobileTypoChance: 0.1,
  },
  japan: {
    expressions: [],
    typoChance: 0.22,
    shorthandChance: 0.12,
    lowercaseChance: 0.28,
    emojiChance: 0.48,
    mobileTypoChance: 0.18,
  },
  korea: {
    expressions: [],
    typoChance: 0.2,
    shorthandChance: 0.18,
    lowercaseChance: 0.22,
    emojiChance: 0.42,
    mobileTypoChance: 0.15,
  },
  indonesia: {
    expressions: ['dong', 'sih', 'nih', 'deh'],
    typoChance: 0.18,
    shorthandChance: 0.28,
    lowercaseChance: 0.28,
    emojiChance: 0.38,
    mobileTypoChance: 0.18,
  },
  thailand: {
    expressions: ['krub', 'ka', 'na'],
    typoChance: 0.22,
    shorthandChance: 0.22,
    lowercaseChance: 0.28,
    emojiChance: 0.42,
    mobileTypoChance: 0.2,
  },
  vietnam: {
    expressions: [],
    typoChance: 0.25,
    shorthandChance: 0.18,
    lowercaseChance: 0.22,
    emojiChance: 0.32,
    mobileTypoChance: 0.18,
  },
  malaysia: {
    expressions: ['lah', 'mah', 'kan', 'one'],
    typoChance: 0.18,
    shorthandChance: 0.28,
    lowercaseChance: 0.22,
    emojiChance: 0.32,
    mobileTypoChance: 0.15,
  },
  west: {
    expressions: ['honestly', 'literally', 'basically'],
    typoChance: 0.12,
    shorthandChance: 0.22,
    lowercaseChance: 0.22,
    emojiChance: 0.22,
    mobileTypoChance: 0.12,
  },
};

// Common typo patterns
const typoPatterns = [
  { correct: 'the', typo: 'teh' },
  { correct: 'and', typo: 'adn' },
  { correct: 'that', typo: 'taht' },
  { correct: 'with', typo: 'wiht' },
  { correct: 'have', typo: 'ahve' },
  { correct: 'this', typo: 'tihs' },
  { correct: 'from', typo: 'form' },
  { correct: 'just', typo: 'jsut' },
  { correct: 'about', typo: 'baout' },
  { correct: 'think', typo: 'thikn' },
  { correct: 'would', typo: 'woudl' },
  { correct: 'could', typo: 'coudl' },
  { correct: 'really', typo: 'realy' },
  { correct: 'because', typo: 'becuase' },
  { correct: 'people', typo: 'poeple' },
  { correct: 'their', typo: 'thier' },
  { correct: 'which', typo: 'whcih' },
  { correct: 'being', typo: 'bieng' },
];

// Mobile autocorrect mistakes
const mobileTypos = [
  { correct: 'definitely', typo: 'defiantly' },
  { correct: 'probably', typo: 'prolly' },
  { correct: 'going to', typo: 'gonna' },
  { correct: 'want to', typo: 'wanna' },
  { correct: 'got to', typo: 'gotta' },
  { correct: 'kind of', typo: 'kinda' },
  { correct: 'sort of', typo: 'sorta' },
  { correct: 'a lot', typo: 'alot' },
  { correct: 'tomorrow', typo: 'tmrw' },
  { correct: 'something', typo: 'smth' },
];

// Shorthand replacements
const shorthandReplacements = [
  { from: /\bvery\b/gi, to: 'rly', chance: 0.3 },
  { from: /\bthough\b/gi, to: 'tho', chance: 0.4 },
  { from: /\byou\b/gi, to: 'u', chance: 0.25 },
  { from: /\byour\b/gi, to: 'ur', chance: 0.25 },
  { from: /\byou're\b/gi, to: 'ur', chance: 0.28 },
  { from: /\bwith\b/gi, to: 'w/', chance: 0.18 },
  { from: /\bthanks\b/gi, to: 'thx', chance: 0.38 },
  { from: /\bbecause\b/gi, to: 'bc', chance: 0.28 },
  { from: /\bthrough\b/gi, to: 'thru', chance: 0.32 },
  { from: /\band\b/gi, to: '&', chance: 0.22 },
  { from: /\bdefinitely\b/gi, to: 'def', chance: 0.32 },
  { from: /\bprobably\b/gi, to: 'prob', chance: 0.32 },
  { from: /\bto be honest\b/gi, to: 'tbh', chance: 0.45 },
  { from: /\bin my opinion\b/gi, to: 'imo', chance: 0.45 },
  { from: /\bi don't know\b/gi, to: 'idk', chance: 0.38 },
  { from: /\bnot gonna lie\b/gi, to: 'ngl', chance: 0.45 },
  { from: /\bright now\b/gi, to: 'rn', chance: 0.35 },
  { from: /\bpeople\b/gi, to: 'ppl', chance: 0.25 },
  { from: /\bsomething\b/gi, to: 'sth', chance: 0.18 },
  { from: /\bwithout\b/gi, to: 'w/o', chance: 0.22 },
  { from: /\bfor real\b/gi, to: 'fr', chance: 0.35 },
  { from: /\bplease\b/gi, to: 'pls', chance: 0.3 },
  { from: /\banyway\b/gi, to: 'anyways', chance: 0.4 },
];

// Missing apostrophe patterns
const apostrophePatterns = [
  { from: /\bdon't\b/gi, to: 'dont', chance: 0.38 },
  { from: /\bcan't\b/gi, to: 'cant', chance: 0.38 },
  { from: /\bwon't\b/gi, to: 'wont', chance: 0.38 },
  { from: /\bdidn't\b/gi, to: 'didnt', chance: 0.32 },
  { from: /\bisn't\b/gi, to: 'isnt', chance: 0.32 },
  { from: /\baren't\b/gi, to: 'arent', chance: 0.32 },
  { from: /\bwasn't\b/gi, to: 'wasnt', chance: 0.32 },
  { from: /\bweren't\b/gi, to: 'werent', chance: 0.32 },
  { from: /\bit's\b/gi, to: 'its', chance: 0.28 },
  { from: /\bthat's\b/gi, to: 'thats', chance: 0.28 },
  { from: /\bwhat's\b/gi, to: 'whats', chance: 0.28 },
  { from: /\bI'm\b/gi, to: 'im', chance: 0.38 },
  { from: /\bI've\b/gi, to: 'ive', chance: 0.32 },
  { from: /\bI'll\b/gi, to: 'ill', chance: 0.32 },
  { from: /\blet's\b/gi, to: 'lets', chance: 0.3 },
  { from: /\bhere's\b/gi, to: 'heres', chance: 0.3 },
];

// Emoji sets by sentiment
const positiveEmojis = ['👍', '🙌', '💯', '🔥', '✨', '👏', '🎯', '💪', '🚀', '⭐', '😊', '🤩'];
const neutralEmojis = ['🤔', '💭', '📌', '👀', '💡', '📊', '🧐', '📝', '➡️', '📱'];
const negativeEmojis = ['😬', '🙄', '😅', '🤷', '😤', '💀', '🫠', '😒'];

// Helper to add natural typos
const addTypos = (text: string, typoChance: number): string => {
  if (Math.random() > typoChance) return text;
  
  let result = text;
  const numTypos = Math.random() < 0.65 ? 1 : 2;
  
  for (let i = 0; i < numTypos; i++) {
    const typoType = Math.random();
    
    if (typoType < 0.45) {
      const pattern = typoPatterns[Math.floor(Math.random() * typoPatterns.length)];
      const regex = new RegExp(`\\b${pattern.correct}\\b`, 'i');
      if (regex.test(result)) {
        result = result.replace(regex, pattern.typo);
      }
    } else if (typoType < 0.72) {
      const words = result.split(' ');
      const randomIndex = Math.floor(Math.random() * words.length);
      const word = words[randomIndex];
      if (word.length > 4 && /^[a-zA-Z]+$/.test(word)) {
        const pos = Math.floor(Math.random() * (word.length - 1)) + 1;
        words[randomIndex] = word.slice(0, pos) + word[pos - 1] + word.slice(pos);
        result = words.join(' ');
      }
    } else {
      const words = result.split(' ');
      const randomIndex = Math.floor(Math.random() * words.length);
      const word = words[randomIndex];
      if (word.length > 5 && /^[a-zA-Z]+$/.test(word)) {
        const pos = Math.floor(Math.random() * (word.length - 2)) + 1;
        words[randomIndex] = word.slice(0, pos) + word.slice(pos + 1);
        result = words.join(' ');
      }
    }
  }
  
  return result;
};

// Helper to add mobile typos
const addMobileTypos = (text: string, mobileTypoChance: number): string => {
  if (Math.random() > mobileTypoChance) return text;
  
  let result = text;
  const pattern = mobileTypos[Math.floor(Math.random() * mobileTypos.length)];
  const regex = new RegExp(`\\b${pattern.correct}\\b`, 'gi');
  result = result.replace(regex, pattern.typo);
  
  return result;
};

// Helper to add shorthand
const addShorthand = (text: string, shorthandChance: number): string => {
  if (Math.random() > shorthandChance) return text;
  
  let result = text;
  const numReplacements = Math.random() < 0.55 ? 1 : Math.random() < 0.85 ? 2 : 3;
  const shuffled = [...shorthandReplacements].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(numReplacements, shuffled.length); i++) {
    const replacement = shuffled[i];
    if (Math.random() < replacement.chance) {
      result = result.replace(replacement.from, replacement.to as string);
    }
  }
  
  return result;
};

// Helper to remove apostrophes
const removeApostrophes = (text: string): string => {
  let result = text;
  for (const pattern of apostrophePatterns) {
    if (Math.random() < pattern.chance) {
      result = result.replace(pattern.from, pattern.to as string);
    }
  }
  return result;
};

// Helper to make text lowercase
const makeLowercase = (text: string, lowercaseChance: number): string => {
  if (Math.random() > lowercaseChance) return text;
  
  const level = Math.random();
  if (level < 0.55) {
    return text.toLowerCase();
  } else if (level < 0.8) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  } else {
    return text.split(' ').map((word, i) => 
      i === 0 ? word : (Math.random() < 0.4 ? word.toLowerCase() : word)
    ).join(' ');
  }
};

// Helper to add punctuation variations
const addPunctuationVariations = (text: string): string => {
  let result = text;
  
  if (Math.random() < 0.18) {
    result = result.replace(/!$/, '!!');
  }
  if (Math.random() < 0.12) {
    result = result.replace(/\?$/, '??');
  }
  if (Math.random() < 0.15 && !result.endsWith('...') && !result.endsWith('!') && !result.endsWith('?')) {
    result = result.replace(/\.$/, '...');
  }
  if (Math.random() < 0.25) {
    result = result.replace(/[.!?]$/, '');
  }
  
  // Random comma removal
  if (Math.random() < 0.2) {
    const commaIndex = result.indexOf(',');
    if (commaIndex > 0) {
      result = result.slice(0, commaIndex) + result.slice(commaIndex + 1);
    }
  }
  
  return result;
};

// Helper to add emojis
const addEmojis = (text: string, emojiChance: number, sentiment: 'positive' | 'neutral' | 'negative'): string => {
  if (Math.random() > emojiChance) return text;
  
  const emojiSet = sentiment === 'positive' ? positiveEmojis : 
                   sentiment === 'negative' ? negativeEmojis : neutralEmojis;
  
  const numEmojis = Math.random() < 0.72 ? 1 : 2;
  const selectedEmojis = [];
  
  for (let i = 0; i < numEmojis; i++) {
    selectedEmojis.push(emojiSet[Math.floor(Math.random() * emojiSet.length)]);
  }
  
  const position = Math.random();
  if (position < 0.72) {
    return text + ' ' + selectedEmojis.join('');
  } else if (position < 0.88) {
    return selectedEmojis.join('') + ' ' + text;
  } else {
    const sentences = text.split('. ');
    if (sentences.length > 1) {
      const insertPos = Math.floor(Math.random() * (sentences.length - 1));
      sentences[insertPos] = sentences[insertPos] + ' ' + selectedEmojis[0];
      return sentences.join('. ');
    }
    return text + ' ' + selectedEmojis.join('');
  }
};

// Main function to add all natural variations
const addNaturalVariations = (text: string, region: string): string => {
  const patterns = regionalPatterns[region] || regionalPatterns.west;
  
  let result = text;
  
  result = addTypos(result, patterns.typoChance);
  result = addMobileTypos(result, patterns.mobileTypoChance);
  result = addShorthand(result, patterns.shorthandChance);
  result = removeApostrophes(result);
  result = makeLowercase(result, patterns.lowercaseChance);
  result = addPunctuationVariations(result);
  
  const lowerText = text.toLowerCase();
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (lowerText.includes('great') || lowerText.includes('love') || lowerText.includes('amazing') || 
      lowerText.includes('excellent') || lowerText.includes('helpful') || lowerText.includes('thanks') ||
      lowerText.includes('awesome') || lowerText.includes('excited')) {
    sentiment = 'positive';
  } else if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('bad') ||
             lowerText.includes('disagree') || lowerText.includes('wrong') || lowerText.includes('concern') ||
             lowerText.includes('skeptic') || lowerText.includes('doubt') || lowerText.includes('worried')) {
    sentiment = 'negative';
  }
  
  result = addEmojis(result, patterns.emojiChance, sentiment);
  
  return result;
};

// Helper to generate comment timestamp
const generateTimestamp = (publishDate: string, updatedDate: string | null): Date => {
  const published = new Date(publishDate);
  const now = new Date();
  const articleAgeMonths = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (articleAgeMonths > 6) {
    if (Math.random() < 0.3) {
      const daysAgo = Math.floor(Math.random() * 60);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      return timestamp;
    } else {
      const weeksAfter = Math.floor(Math.random() * 12) + 1;
      const timestamp = new Date(published);
      timestamp.setDate(timestamp.getDate() + (weeksAfter * 7));
      return timestamp;
    }
  } else {
    const daysAfter = Math.floor(Math.random() * 30) + 1;
    const timestamp = new Date(published);
    timestamp.setDate(timestamp.getDate() + daysAfter);
    return timestamp;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleIds, categoryId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('articles')
      .select('id, title, excerpt, published_at, updated_at')
      .eq('status', 'published');

    if (categoryId) {
      query = query.eq('primary_category_id', categoryId);
    } else if (articleIds && articleIds.length > 0) {
      query = query.in('id', articleIds);
    }

    const { data: articles, error: articlesError } = await query;

    if (articlesError) throw articlesError;
    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No articles found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authors, error: authorsError } = await supabase
      .from('ai_comment_authors')
      .select('*');

    if (authorsError) throw authorsError;
    
    if (!authors || authors.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No AI comment authors found. Please seed the author pool first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authorsByRegion: Record<string, typeof authors> = {};
    for (const author of authors) {
      if (!authorsByRegion[author.region]) {
        authorsByRegion[author.region] = [];
      }
      authorsByRegion[author.region].push(author);
    }

    const powerUsers = authors.filter(a => a.is_power_user);
    const allAuthors = authors;

    let totalGenerated = 0;

    for (const article of articles) {
      await supabase
        .from('ai_generated_comments')
        .delete()
        .eq('article_id', article.id);

      // Variable comment count with clustering (some articles get more engagement)
      const engagementLevel = Math.random();
      let numComments: number;
      if (engagementLevel < 0.15) {
        numComments = Math.floor(Math.random() * 2) + 1; // 1-2 low engagement
      } else if (engagementLevel < 0.75) {
        numComments = Math.floor(Math.random() * 3) + 3; // 3-5 normal
      } else {
        numComments = Math.floor(Math.random() * 3) + 6; // 6-8 viral
      }

      const commentsToGenerate: any[] = [];
      const usedAuthors: string[] = [];
      const usedOpenings: string[] = []; // Track used openings to avoid repetition

      // Personas with messy, realistic styles
      const personas = [
        { type: 'enthusiast', tone: 'excited, maybe too excited, uses caps sometimes', style: 'gushing, might ramble' },
        { type: 'skeptic', tone: 'doubtful, questions everything', style: 'short sharp sentences, dismissive' },
        { type: 'insider', tone: 'knows the industry, drops hints', style: 'casual authority, name drops' },
        { type: 'newcomer', tone: 'confused, asking basic stuff', style: 'lots of questions, uncertain' },
        { type: 'critic', tone: 'finds flaws, not mean just honest', style: 'points out issues matter of factly' },
        { type: 'storyteller', tone: 'relates everything to personal experience', style: 'anecdotal, goes on tangents' },
        { type: 'joker', tone: 'cant take anything seriously', style: 'sarcastic, uses humor' },
        { type: 'pragmatist', tone: 'just wants to know if it works', style: 'practical questions, no fluff' },
        { type: 'lurker', tone: 'usually silent, felt compelled to speak', style: 'hesitant, mentions lurking' },
        { type: 'veteran', tone: 'seen it all before', style: 'references past, slightly cynical' },
        { type: 'questioner', tone: 'genuinely curious, wants to learn more', style: 'asks real questions not rhetorical' },
        { type: 'disagree-er', tone: 'politely pushes back', style: 'respectful disagreement with reasoning' },
        { type: 'sharer', tone: 'wants others to see this too', style: 'mentions sharing or forwarding' },
        { type: 'anecdote-r', tone: 'has a relevant story', style: 'personal experience that connects' },
        { type: 'reactor', tone: 'just here to react', style: 'ultra brief, gut reaction only' },
        { type: 'quoter', tone: 'highlights specific parts', style: 'paraphrases and responds' },
      ];

      // Industry jargon for AI/tech articles
      const industryJargon = [
        'fine-tuning', 'hallucinations', 'inference', 'edge deployment', 'RAG', 
        'prompt engineering', 'token limits', 'context window', 'latency',
        'multimodal', 'embeddings', 'vector db', 'GPU costs', 'scaling laws',
        'RLHF', 'few-shot', 'zero-shot', 'foundation models', 'LLMs',
        'transformer architecture', 'diffusion models', 'compute', 'throughput'
      ];

      // Ultra-short reaction options (1-3 words)
      const ultraShortReactions = [
        'Boom.', 'Oof.', 'Yikes.', 'Finally!', 'Big if true.', 'Called it.', 
        'lol what', 'oh no', 'nice', 'W', 'L', 'huge.', 'wild.', 'damn.', 
        'insane', 'no way', 'this.', 'real.', 'facts.', 'bruh.', 'yep.', 
        'nope.', 'interesting.', 'huh.', 'hmm', 'wait', 'whoa', '💀', 
        'lmaooo', 'sheesh', 'ayo?', 'bout time', 'peak', 'mid', 'massive',
        'underrated take', 'spicy', 'based', 'cap', 'no cap', 'fr fr',
        'pain.', 'RIP', 'gg', 'lets go', 'W take', 'hard agree', 'nah'
      ];

      // Opening variations to AVOID repetition
      const bannedPhrases = [
        'this is wild', 'this is crazy', 'this is huge', 'this is interesting',
        'this is insane', 'this is big', "i'm starting", "i'm trying",
        'the implications', 'game changer', 'the fact that'
      ];

      // Determine sentiment skew for this article (not always balanced)
      const sentimentSkew = Math.random();
      let dominantSentiment: 'positive' | 'negative' | 'mixed';
      if (sentimentSkew < 0.35) dominantSentiment = 'positive';
      else if (sentimentSkew < 0.55) dominantSentiment = 'negative';
      else dominantSentiment = 'mixed';

      // Track previous comments for threading
      const previousComments: { author: string; snippet: string }[] = [];

      // Simulate time-of-day for comment patterns
      const getTimeOfDayStyle = () => {
        const rand = Math.random();
        if (rand < 0.15) return { time: 'late_night', instruction: 'Write sleepier, more typos, rambling, less formal. Might mention its late' };
        if (rand < 0.35) return { time: 'morning', instruction: 'Brief, coffee-mode, getting ready for day' };
        if (rand < 0.65) return { time: 'work_hours', instruction: 'Slightly more professional, might be at work' };
        return { time: 'evening', instruction: 'Relaxed, casual, might be on phone' };
      };

      for (let i = 0; i < numComments; i++) {
        // 25% chance to use power user
        const usePowerUser = Math.random() < 0.25 && powerUsers.length > 0;
        
        // 18% chance same author comments again (repeat commenter / self-reply)
        const useRepeatAuthor = i > 0 && Math.random() < 0.18 && usedAuthors.length > 0;
        
        let selectedAuthor;
        if (useRepeatAuthor) {
          const repeatAuthorId = usedAuthors[Math.floor(Math.random() * usedAuthors.length)];
          selectedAuthor = authors.find(a => a.id === repeatAuthorId);
        } else if (usePowerUser) {
          selectedAuthor = powerUsers[Math.floor(Math.random() * powerUsers.length)];
        } else {
          const rand = Math.random();
          let region: string;
          if (rand < 0.15) region = 'singapore';
          else if (rand < 0.25) region = 'india';
          else if (rand < 0.32) region = 'philippines';
          else if (rand < 0.40) region = 'hong_kong';
          else if (rand < 0.52) region = 'china';
          else if (rand < 0.62) region = 'usa';
          else if (rand < 0.70) region = 'france';
          else if (rand < 0.76) region = 'uk';
          else if (rand < 0.82) region = 'japan';
          else if (rand < 0.87) region = 'korea';
          else if (rand < 0.91) region = 'indonesia';
          else if (rand < 0.94) region = 'thailand';
          else if (rand < 0.97) region = 'vietnam';
          else region = 'malaysia';

          const regionAuthors = authorsByRegion[region] || [];
          if (regionAuthors.length === 0) {
            selectedAuthor = allAuthors[Math.floor(Math.random() * allAuthors.length)];
          } else {
            selectedAuthor = regionAuthors[Math.floor(Math.random() * regionAuthors.length)];
          }
        }
        
        if (!selectedAuthor) continue;
        usedAuthors.push(selectedAuthor.id);

        const persona = personas[Math.floor(Math.random() * personas.length)];
        const timeStyle = getTimeOfDayStyle();

        // More varied lengths - heavier on short and ultra-short
        const lengthRand = Math.random();
        let targetLength: string;
        let isUltraShort = false;
        if (lengthRand < 0.20) {
          isUltraShort = true;
          const reaction = ultraShortReactions[Math.floor(Math.random() * ultraShortReactions.length)];
          targetLength = `ULTRA SHORT: Just write 1-3 words max like "${reaction}" - pure gut reaction`;
        } else if (lengthRand < 0.45) {
          targetLength = '4-15 words. Very brief. "love this" "wait really?" "not sure about that" "hmm interesting point"';
        } else if (lengthRand < 0.75) {
          targetLength = '15-35 words, one thought, conversational';
        } else if (lengthRand < 0.92) {
          targetLength = '35-60 words, bit more detail but still casual';
        } else {
          targetLength = '60-100 words, more detailed story or explanation';
        }

        // Build special behaviors
        let specialBehavior = '';
        const behaviorRand = Math.random();
        
        if (isUltraShort) {
          // Ultra short doesn't need special behavior
          specialBehavior = '';
        } else if (useRepeatAuthor) {
          const repeatStyles = [
            'This is a FOLLOW-UP comment. Start with "oh also" or "forgot to say" or "wait" or just add another thought',
            'This is a CORRECTION to your earlier comment. Start with "actually wait" or "nvm" or correct yourself',
            'Add a related tangent you just thought of. "oh and another thing"',
            'Come back with an update like "update: tried it" or "so i looked into this more"',
          ];
          specialBehavior = repeatStyles[Math.floor(Math.random() * repeatStyles.length)];
        } else if (behaviorRand < 0.10 && previousComments.length > 0) {
          const prevComment = previousComments[Math.floor(Math.random() * previousComments.length)];
          specialBehavior = `Reference or reply to a previous commenter. You can say things like "@${prevComment.author} totally" or "agree with above" or "what ${prevComment.author.split(' ')[0]} said" - keep it natural`;
        } else if (behaviorRand < 0.18) {
          const credentials = [
            'Mention you work in tech/AI casually like "at my company we..."',
            'Drop that youve been in the industry X years without being braggy',
            'Reference your job role naturally like "as a dev..." or "from a product perspective..."',
            'Mention a relevant personal project or side hustle',
          ];
          specialBehavior = credentials[Math.floor(Math.random() * credentials.length)];
        } else if (behaviorRand < 0.25) {
          specialBehavior = 'Mention that you usually just read/lurk but had to comment on this one. Be natural about it, not formulaic';
        } else if (behaviorRand < 0.32) {
          specialBehavior = 'Trail off or change direction mid-thought. Like you started saying something then went somewhere else. Real people do this';
        } else if (behaviorRand < 0.40) {
          const skepticStyles = [
            'Express some skepticism about AI hype or this specific claim. Not hostile, just... youve seen promises before',
            'Politely disagree with a point in the article. "interesting but I think..." or "not sure I agree about..."',
            'Play devils advocate. "but what about..." or "counterpoint:"',
          ];
          specialBehavior = skepticStyles[Math.floor(Math.random() * skepticStyles.length)];
        } else if (behaviorRand < 0.48) {
          specialBehavior = 'Go slightly off-topic or connect this to something tangentially related. Real comments wander';
        } else if (behaviorRand < 0.55) {
          const questionStyles = [
            'Ask a genuine question you want answered. "does anyone know if..." or "curious how this works with..."',
            'Ask for clarification or more details. "wait so does this mean..." or "so basically..."',
            'Ask about real-world application. "has anyone actually tried this?" or "how would this work for..."',
          ];
          specialBehavior = questionStyles[Math.floor(Math.random() * questionStyles.length)];
        } else if (behaviorRand < 0.62) {
          const anecdoteStyles = [
            'Share a brief personal experience that relates. "this happened at my company last month..."',
            'Mention trying something similar. "we tested something like this and..."',
            'Reference a conversation you had. "was just talking to a friend about this..."',
          ];
          specialBehavior = anecdoteStyles[Math.floor(Math.random() * anecdoteStyles.length)];
        } else if (behaviorRand < 0.68) {
          const socialStyles = [
            'Mention sharing. "just sent this to my team" or "forwarding to my manager lol"',
            'Reference saving/bookmarking. "bookmarking this" or "saving for later"',
            'Mention discussing elsewhere. "this is blowing up on twitter/linkedin too"',
          ];
          specialBehavior = socialStyles[Math.floor(Math.random() * socialStyles.length)];
        } else if (behaviorRand < 0.73) {
          specialBehavior = `Reference a specific part of the article naturally. Like "the part about [topic from title] really stood out" or "when they said [paraphrase]...". Dont use actual quotes just paraphrase`;
        } else if (behaviorRand < 0.78) {
          const jargonWord = industryJargon[Math.floor(Math.random() * industryJargon.length)];
          specialBehavior = `Work in "${jargonWord}" naturally like you actually know what youre talking about. Dont explain it, just use it`;
        }

        // Sentiment based on article skew
        let commentSentiment: string;
        if (dominantSentiment === 'positive') {
          commentSentiment = Math.random() < 0.65 ? 'lean positive or excited' : 'neutral or mildly questioning';
        } else if (dominantSentiment === 'negative') {
          commentSentiment = Math.random() < 0.55 ? 'skeptical or concerned' : 'cautiously optimistic';
        } else {
          const r = Math.random();
          if (r < 0.33) commentSentiment = 'positive';
          else if (r < 0.66) commentSentiment = 'skeptical or questioning';
          else commentSentiment = 'neutral, just adding info';
        }

        const articleAge = (new Date().getTime() - new Date(article.published_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
        const isOldArticle = articleAge > 12;

        // Regional language instruction
        let regionalInstruction = '';
        if (selectedAuthor.region === 'china') {
          regionalInstruction = `Write with NON-NATIVE English. Skip articles sometimes (the/a), unusual word order, literal translations. "This technology very useful for work" or "I have doubt about this approach" - NOT perfect grammar`;
        } else if (selectedAuthor.region === 'france') {
          regionalInstruction = `Maybe drop a French word (voilà, en fait). Slightly French phrasing is ok. Not perfect English`;
        } else if (selectedAuthor.region === 'singapore' || selectedAuthor.region === 'malaysia') {
          regionalInstruction = `Use Singlish naturally - "lah", "lor", "sia", "can" at end. "This one quite good lah" or "Cannot work one lor"`;
        } else if (selectedAuthor.region === 'india') {
          regionalInstruction = `Indian English patterns - "only" for emphasis, "actually" often, "na" or "yaar". "This is actually very good only" or "We should try na"`;
        }

        let temporalInstruction = '';
        if (isOldArticle && Math.random() < 0.4) {
          temporalInstruction = 'Can mention just finding this or coming back to it, but dont be formulaic about it';
        }

        // Build banned openings string from used ones
        const bannedOpeningsStr = usedOpenings.length > 0 
          ? `ALREADY USED (DO NOT START WITH): ${usedOpenings.slice(-5).join(', ')}`
          : '';

        const prompt = `You are ${selectedAuthor.name} from ${selectedAuthor.region.replace('_', ' ')}. Write a comment on this article.

Article: "${article.title}"
Summary: "${article.excerpt || ''}"

YOUR STYLE: ${persona.type} - ${persona.tone}. ${persona.style}
TIME CONTEXT: ${timeStyle.instruction}

CRITICAL VARIATION RULES - READ CAREFULLY:
${bannedOpeningsStr}
- NEVER start with: ${bannedPhrases.join(', ')}
- NEVER say "this is wild/crazy/huge/interesting/insane" - be more creative
- NEVER mention starting a company unless directly relevant
- Each comment MUST feel completely different from others
- Vary your opening word - dont start with "This" or "I" every time
- Try starting with: verbs, reactions, questions, lowercase words, single words

WRITE LIKE A REAL PERSON NOT AN AI:
- Real people dont write perfectly. Sentences run together sometimes or break off
- Start with lowercase sometimes. or dont use periods
- Fragments are fine. "Love this." "Wait what." "Hmm not sure about that part" "finally!"
- Use filler: "like", "honestly", "I mean", "so basically", "wait", "ok but", "idk"
- Some sentences just trail off...
- Typos happen. dont fix them all
- NO em dashes ever. NO semicolons. minimal commas
- NEVER end with "right?" or "isn't it?" or "don't you think?"

LENGTH: ${targetLength}
SENTIMENT: ${commentSentiment}
${regionalInstruction}
${temporalInstruction}
${specialBehavior ? `SPECIAL BEHAVIOR: ${specialBehavior}` : ''}

Comment ${i + 1} of ${numComments} - MUST be DIFFERENT from all others.

Write ONLY the comment. nothing else.`;

        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          if (!aiResponse.ok) {
            console.error('AI API error:', await aiResponse.text());
            continue;
          }

          const aiData = await aiResponse.json();
          let commentText = aiData.choices[0].message.content.trim();

          // Remove any quotes the AI might have added
          commentText = commentText.replace(/^["']|["']$/g, '');
          
          // Remove any "Comment:" prefix if AI added it
          commentText = commentText.replace(/^(Comment|Response|Reply):\s*/i, '');

          // Add natural variations based on region
          commentText = addNaturalVariations(commentText, selectedAuthor.region);

          // Track the opening to avoid repetition
          const opening = commentText.split(/[.!?\n]/)[0].toLowerCase().slice(0, 30);
          usedOpenings.push(opening);

          // Store for potential threading
          previousComments.push({
            author: selectedAuthor.name,
            snippet: commentText.slice(0, 50),
          });

          const commentDate = generateTimestamp(article.published_at, article.updated_at);

          commentsToGenerate.push({
            article_id: article.id,
            author_id: selectedAuthor.id,
            content: commentText,
            comment_date: commentDate.toISOString(),
          });

          await new Promise(resolve => setTimeout(resolve, 180));
        } catch (error) {
          console.error('Error generating comment:', error);
          continue;
        }
      }

      if (commentsToGenerate.length > 0) {
        const { error: insertError } = await supabase
          .from('ai_generated_comments')
          .insert(commentsToGenerate);

        if (insertError) {
          console.error('Error inserting comments:', insertError);
        } else {
          totalGenerated += commentsToGenerate.length;

          const authorCounts = new Map();
          for (const comment of commentsToGenerate) {
            authorCounts.set(comment.author_id, (authorCounts.get(comment.author_id) || 0) + 1);
          }

          for (const [authorId, count] of authorCounts.entries()) {
            const author = authors.find(a => a.id === authorId);
            if (author) {
              await supabase
                .from('ai_comment_authors')
                .update({ comment_count: (author.comment_count || 0) + count })
                .eq('id', authorId);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'AI comments generated successfully',
        articlesProcessed: articles.length,
        commentsGenerated: totalGenerated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating AI comments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Regional expressions and patterns - increased emoji chances to 25-50%
const regionalPatterns: Record<string, { expressions: string[]; typoChance: number; shorthandChance: number; lowercaseChance: number; emojiChance: number; mobileTypoChance: number }> = {
  singapore: {
    expressions: [], // Removed regional expressions - handled by AI prompt now
    typoChance: 0.18,
    shorthandChance: 0.28,
    lowercaseChance: 0.25,
    emojiChance: 0.38, // Increased
    mobileTypoChance: 0.15,
  },
  india: {
    expressions: [],
    typoChance: 0.12,
    shorthandChance: 0.22,
    lowercaseChance: 0.18,
    emojiChance: 0.32, // Increased
    mobileTypoChance: 0.12,
  },
  philippines: {
    expressions: [],
    typoChance: 0.15,
    shorthandChance: 0.32,
    lowercaseChance: 0.28,
    emojiChance: 0.48, // Increased
    mobileTypoChance: 0.18,
  },
  hong_kong: {
    expressions: [],
    typoChance: 0.18,
    shorthandChance: 0.18,
    lowercaseChance: 0.15,
    emojiChance: 0.30, // Increased
    mobileTypoChance: 0.12,
  },
  china: {
    expressions: [],
    typoChance: 0.28,
    shorthandChance: 0.12,
    lowercaseChance: 0.32,
    emojiChance: 0.45, // Increased
    mobileTypoChance: 0.2,
  },
  usa: {
    expressions: ['like', 'literally', 'honestly', 'lowkey', 'ngl', 'fr'],
    typoChance: 0.15,
    shorthandChance: 0.38,
    lowercaseChance: 0.35,
    emojiChance: 0.35, // Increased
    mobileTypoChance: 0.2,
  },
  france: {
    expressions: [],
    typoChance: 0.2,
    shorthandChance: 0.18,
    lowercaseChance: 0.22,
    emojiChance: 0.38, // Increased
    mobileTypoChance: 0.15,
  },
  uk: {
    expressions: ['quite', 'rather', 'reckon'],
    typoChance: 0.12,
    shorthandChance: 0.22,
    lowercaseChance: 0.18,
    emojiChance: 0.28, // Increased
    mobileTypoChance: 0.1,
  },
  japan: {
    expressions: [],
    typoChance: 0.22,
    shorthandChance: 0.12,
    lowercaseChance: 0.28,
    emojiChance: 0.55, // High - Japanese commenters use lots of emoji
    mobileTypoChance: 0.18,
  },
  korea: {
    expressions: [],
    typoChance: 0.2,
    shorthandChance: 0.18,
    lowercaseChance: 0.22,
    emojiChance: 0.50, // High
    mobileTypoChance: 0.15,
  },
  indonesia: {
    expressions: [],
    typoChance: 0.18,
    shorthandChance: 0.28,
    lowercaseChance: 0.28,
    emojiChance: 0.45, // Increased
    mobileTypoChance: 0.18,
  },
  thailand: {
    expressions: [],
    typoChance: 0.22,
    shorthandChance: 0.22,
    lowercaseChance: 0.28,
    emojiChance: 0.50, // Increased
    mobileTypoChance: 0.2,
  },
  vietnam: {
    expressions: [],
    typoChance: 0.25,
    shorthandChance: 0.18,
    lowercaseChance: 0.22,
    emojiChance: 0.38, // Increased
    mobileTypoChance: 0.18,
  },
  malaysia: {
    expressions: [], // Removed - no lah/wah
    typoChance: 0.18,
    shorthandChance: 0.28,
    lowercaseChance: 0.22,
    emojiChance: 0.38, // Increased
    mobileTypoChance: 0.15,
  },
  west: {
    expressions: ['honestly', 'literally', 'basically'],
    typoChance: 0.12,
    shorthandChance: 0.22,
    lowercaseChance: 0.22,
    emojiChance: 0.28, // Increased
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
const negativeEmojis = ['😬', '🙄', '😅', '🤷', '😤', '💀', '😩', '😒'];

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

// Strict validation patterns - if ANY of these appear, comment MUST be regenerated
const HARD_BANNED_PATTERNS = [
  // Singlish particles - absolute ban
  /\bwah+\b/i,
  /\blah+\b/i,
  /\bleh\b/i,
  /\blor\b/i,
  /\bsia\b/i,
  
  // British slang
  /\bblimey\b/i,
  /\bcrikey\b/i,
  /\binnit\b/i,
  /\bkerfuffle\b/i,
  /\bchuffed\b/i,
  /\bgutted\b/i,
  /\bcor blimey\b/i,
  /\bbloody hell\b/i,
  /\bproper\s+(good|mad|mental|wild|insane)\b/i,
  /\bcheers mate\b/i,
  
  // Asterisk emphasis
  /\*[^*]+\*/,
  
  // Tag questions
  /\bisn'?t it\??\s*$/i,
  /\bright\?\s*$/i,
  /\bdon'?t you think\??\s*$/i,
  /\bwouldn'?t you say\??\s*$/i,
  /\beh\?\s*$/i,
  /\bno\?\s*$/i,
  /\binnit\??\s*$/i,
  /\bcan or not\??\s*$/i,
  
  // AI clichés
  /\bfascinating\b/i,
  /\bintriguing\b/i,
  /\bcompelling\b/i,
  /\bthought-?provoking\b/i,
  /\bquite the\b/i,
  /\ba right\b/i,
  /\bhere'?s the kicker\b/i,
  /\bfood for thought\b/i,
  /\bgives me pause\b/i,
  /\bworth considering\b/i,
  /\bat the end of the day\b/i,
  /\bit goes without saying\b/i,
  /\bneedless to say\b/i,
  /\bsuffice it to say\b/i,
  /\bmakes me wonder\b/i,
  /\bi can'?t help but wonder\b/i,
  /\bone has to wonder\b/i,
  /\bplot twist\b/i,
  /\bthe elephant in the room\b/i,
  
  // Generic praise
  /\bfascinating read\b/i,
  /\binteresting read\b/i,
  /\bgreat read\b/i,
  /\bbrilliant read\b/i,
  /\bexcellent piece\b/i,
  /\bsolid article\b/i,
  /\bnice article\b/i,
  /\bgreat article\b/i,
  /\bthanks for sharing\b/i,
  /\breally enjoyed this\b/i,
  /\bwell written\b/i,
  /\bthis is quite\b/i,
  /\bquite timely\b/i,
  /\bsuper timely\b/i,
  /\bsuper helpful\b/i,
  /\bpretty interesting\b/i,
  /\breally interesting\b/i,
  /\bspot on\b/i,
  /\bsmashing piece\b/i,
  
  // Em dashes and en dashes (AI writing tells)
  /—/,
  /–/,
];

// Check if comment violates any hard-banned patterns
const hasViolations = (text: string): { valid: boolean; violations: string[] } => {
  const violations: string[] = [];
  for (const pattern of HARD_BANNED_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push(`"${match[0]}" matched by ${pattern.toString()}`);
    }
  }
  return { valid: violations.length === 0, violations };
};

// Hard sanitization to remove overused or banned patterns
// We completely strip or soften certain fillers and slang so they never appear in stored comments
const sanitizeComment = (text: string): string => {
  let result = text;

  // Strip overused regional fillers regardless of punctuation
  result = result.replace(/\bwa+h+\b[,!.\s]*/gi, ""); // wah, waah, wahh
  result = result.replace(/\bla+h+\b[,!.\s]*/gi, ""); // lah, laah, lahh
  result = result.replace(/\ble+h+\b[,!.\s]*/gi, ""); // leh
  result = result.replace(/\blo+r+\b[,!.\s]*/gi, ""); // lor
  result = result.replace(/\bsia\b[,!.\s]*/gi, ""); // sia

  // Remove British slang that non-UK authors shouldn't use
  result = result.replace(/\bblimey\b[,!.\s]*/gi, "");
  result = result.replace(/\bcrikey\b[,!.\s]*/gi, "");
  result = result.replace(/\bcor blimey\b[,!.\s]*/gi, "");
  result = result.replace(/\bbloody hell\b[,!.\s]*/gi, "");
  result = result.replace(/\bproper\s+(mental|mad|wild|insane|good)\b/gi, "$1");
  result = result.replace(/\b(cheers mate|cheers,?\s*mate)\b/gi, "thanks");
  result = result.replace(/\b(bloody|proper)\b\s+/gi, "");
  result = result.replace(/\bkerfuffle\b/gi, "mess");
  result = result.replace(/\bfaff\b/gi, "hassle");
  result = result.replace(/\binnit\b[,!.\s]*/gi, "");
  result = result.replace(/\bchuffed\b/gi, "pleased");
  result = result.replace(/\bgutted\b/gi, "disappointed");

  // Remove common rhetorical tag questions and agreement-seeking endings
  result = result.replace(/[,.]?\s*(isnt it|isn't it|right\?|dont you think|don't you think|wouldnt you say|wouldn't you say|no\?|eh\?|amirite|am i right|can or not)\b[?.!]*/gi, ".");
  
  // Remove AI-sounding clichés
  result = result.replace(/\bhere'?s the kicker\b/gi, "");
  result = result.replace(/\bthe kicker is\b/gi, "");
  result = result.replace(/\bat the end of the day\b/gi, "");
  result = result.replace(/\bit goes without saying\b/gi, "");
  result = result.replace(/\bneedless to say\b/gi, "");
  result = result.replace(/\bsuffice it to say\b/gi, "");
  result = result.replace(/\bfood for thought\b[,.\s]*/gi, "");
  result = result.replace(/\bgives me pause\b/gi, "");
  result = result.replace(/\bworth considering\b/gi, "");
  result = result.replace(/\bon the flip side\b/gi, "but");
  result = result.replace(/\bhaving said that\b/gi, "but");
  result = result.replace(/\bthat being said\b/gi, "but");
  result = result.replace(/\bthe elephant in the room\b/gi, "the obvious issue");
  result = result.replace(/\bthe writing on the wall\b/gi, "the signs");
  result = result.replace(/\bdiving into this\b/gi, "looking at this");
  result = result.replace(/\bunpacking this\b/gi, "looking at this");
  result = result.replace(/\bbreaking this down\b/gi, "looking at this");
  result = result.replace(/\bto be fair\b/gi, "tbf");
  result = result.replace(/\bmakes me wonder\b/gi, "wonder");
  result = result.replace(/\bi can'?t help but wonder\b/gi, "I wonder");
  result = result.replace(/\bone has to wonder\b/gi, "wonder");
  result = result.replace(/\bplot twist\b/gi, "");
  
  // Remove generic praise
  result = result.replace(/\bfascinating\s*(read|article|piece|take|point)?\b/gi, "");
  result = result.replace(/\binteresting\s*(read|article|piece|take|point)?\b/gi, "");
  result = result.replace(/\bcompelling\b/gi, "");
  result = result.replace(/\bintriguing\b/gi, "");
  result = result.replace(/\bthought-?provoking\b/gi, "");
  result = result.replace(/\bgreat read\b/gi, "");
  result = result.replace(/\bbrilliant read\b/gi, "");
  result = result.replace(/\bexcellent piece\b/gi, "");
  result = result.replace(/\bsolid article\b/gi, "");
  result = result.replace(/\bwell written\b/gi, "");
  result = result.replace(/\bgreat points\b/gi, "");
  result = result.replace(/\bthanks for sharing\b/gi, "");
  result = result.replace(/\breally enjoyed this\b/gi, "");
  result = result.replace(/\bthis was helpful\b/gi, "");
  result = result.replace(/\bquite timely\b/gi, "timely");
  result = result.replace(/\bsuper timely\b/gi, "timely");
  result = result.replace(/\bsuper helpful\b/gi, "helpful");
  result = result.replace(/\bpretty interesting\b/gi, "");
  result = result.replace(/\breally interesting\b/gi, "");
  result = result.replace(/\bspot on\b/gi, "accurate");
  result = result.replace(/\bsmashing piece\b/gi, "");
  
  // Remove pickle phrases
  result = result.replace(/\bquite the pickle\b/gi, "tricky");
  result = result.replace(/\ba right pickle\b/gi, "a mess");
  result = result.replace(/\breal pickle\b/gi, "tricky situation");
  result = result.replace(/\bin a pickle\b/gi, "in trouble");
  result = result.replace(/\bquite the\b/gi, "a");
  result = result.replace(/\ba right\b/gi, "a");
  
  // Remove all asterisk emphasis completely
  result = result.replace(/\*([^*]+)\*/g, '$1');
  
  // Remove em dashes and en dashes (AI writing tells) - replace with hyphen or comma
  result = result.replace(/\s*—\s*/g, ', ');
  result = result.replace(/\s*–\s*/g, '-');
  
  // Remove unsupported/broken Unicode characters (replacement chars, surrogate pairs that may not render)
  result = result.replace(/[\uFFFD\uFFFE\uFFFF]/g, ''); // Replacement characters
  result = result.replace(/[\u{1FAE0}-\u{1FAFF}]/gu, ''); // Remove newer emoji ranges that may not render (Unicode 14+)

  // Clean up starting patterns
  result = result.replace(/^(Ay,?\s*|Ayo,?\s*)/i, "");
  if (result.match(/^(this is|it'?s)\s+(quite|super|really|pretty)\s+/i)) {
    result = result.replace(/^(this is|it'?s)\s+(quite|super|really|pretty)\s+/i, "this is ");
  }

  // Collapse multiple spaces and tidy up stray punctuation
  result = result.replace(/\s{2,}/g, " ");
  result = result.replace(/\s+([,.!?])/g, "$1");
  result = result.replace(/^[,.\s]+/, ""); // Clean start
  result = result.replace(/[,.\s]+$/, "."); // Clean end

  return result.trim();
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
// isFirstComment: if true, generates a "live" date (past/current) so at least one comment shows immediately
// commentIndex: used to stagger future comments across days
const generateTimestamp = (publishDate: string, updatedDate: string | null, isFirstComment: boolean = false, commentIndex: number = 0): Date => {
  const now = new Date();
  
  // First comment should always be "live" - set to a past date so it displays immediately
  if (isFirstComment) {
    const hoursAgo = Math.floor(Math.random() * 48) + 1; // 1-48 hours ago
    const timestamp = new Date(now);
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    return timestamp;
  }
  
  // Non-first comments get FUTURE dates, staggered over time
  // Spread comments across the next 1-14 days with some randomness
  const baseDays = Math.floor(commentIndex / 2) + 1; // Every 2 comments adds another day base
  const randomHours = Math.floor(Math.random() * 48); // Add 0-48 hours of randomness
  
  const timestamp = new Date(now);
  timestamp.setDate(timestamp.getDate() + baseDays);
  timestamp.setHours(timestamp.getHours() + randomHours);
  
  return timestamp;
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
      console.log(`Starting comment generation for article: "${article.title}" (ID: ${article.id})`);
      
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
      
      console.log(`Generating ${numComments} comments for this article`);

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

        // Opening variations to AVOID repetition - EXPANDED LIST
        const bannedPhrases = [
          'this is wild', 'this is crazy', 'this is huge', 'this is interesting',
          'this is insane', 'this is big', "i'm starting", "i'm trying",
          'the implications', 'game changer', 'the fact that',
          'wah', 'waah', 'lah', 'fascinating read', 'interesting read', 'great read',
          'great article', 'nice article', 'good article', 'excellent article',
          'what a read', 'must read', 'amazing read', 'brilliant read',
          'isnt it', "isn't it", 'right?', 'dont you think', "don't you think",
          'would you agree', 'wouldnt you say', "wouldn't you say", 'no?',
          'this is a', 'this was a', 'this has been',
          'blimey', 'proper', 'proper mental', 'cheers mate', 'bloody',
          'innit', 'crikey', 'kerfuffle', 'quite the pickle', 'a right pickle',
          'heres the kicker', "here's the kicker", 'the kicker is',
          'makes me wonder', 'i cant help but wonder', "i can't help but wonder",
          'this is quite', 'this is fascinating', 'interesting to see',
          'at the end of the day', 'it goes without saying', 'needless to say',
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

        // Length distribution: 25% short, 50% medium, 25% long
        const lengthRand = Math.random();
        let targetLength: string;
        let isUltraShort = false;
        if (lengthRand < 0.10) {
          isUltraShort = true;
          const reaction = ultraShortReactions[Math.floor(Math.random() * ultraShortReactions.length)];
          targetLength = `ULTRA SHORT: Just write 1-3 words max like "${reaction}" - pure gut reaction`;
        } else if (lengthRand < 0.25) {
          targetLength = 'SHORT: 4-20 words max. One quick thought. "honestly not sure about this" or "wait that actually makes sense"';
        } else if (lengthRand < 0.75) {
          targetLength = 'MEDIUM: 20-60 words. One or two sentences. Conversational, not an essay.';
        } else {
          targetLength = 'LONGER: 60-120 words. Share a story or detailed perspective. Still casual, not formal.';
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
          regionalInstruction = `Write in normal casual English. Do NOT use "wah" or "lah" at all. If you add any local flavour, keep it subtle and vary it across comments.`;
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

        // SYSTEM MESSAGE: Core rules GPT-5 MUST follow (placed at END for highest attention)
        const systemPrompt = `You generate ONE realistic social media comment. Output ONLY the comment text - no quotes, no labels.

BANNED (instant fail):
- "fascinating" "intriguing" "compelling" "thought-provoking"
- "great read" "interesting read" "nice article" "thanks for sharing"
- "wah" "lah" "innit" "blimey" "kerfuffle" "cheers mate"
- "right?" "isn't it?" "don't you think?" "wouldn't you say?"
- "makes me wonder" "food for thought" "at the end of the day"
- Em dashes (—) or en dashes (–) - use commas or hyphens instead
- "This is fascinating/interesting/wild..." openings
- *asterisks* for emphasis
- Any tag questions at the end

PSYCHOLOGY (follow strictly):
1. SINGLE-REACTION: React to ONE thing only. Not the whole article. Not balanced analysis.
2. IMPERFECTION: Rough edges. Incomplete sentences. Missing punctuation. lowercase starts OK.
3. OPINION-FIRST: Your subjective take, not article merit. "idk about this" not "great points"

FORMAT:
- 75% end with statements, 25% with genuine questions (NOT rhetorical)
- Short (8-15 words), Medium (16-35), or Long (36-60) based on instruction
- Contractions natural. Fragments OK. No formal transitions.
- Would fit Reddit/LinkedIn/Twitter naturally

BEFORE OUTPUT: Check your comment. Does it contain ANY banned word/phrase? Does it start with "This is [adjective]"? Does it end with "right?" or "don't you think?"? If YES to any, rewrite.`;

        // USER MESSAGE: Only the data to process
        const userPrompt = `ARTICLE: "${article.title}"
SUMMARY: "${article.excerpt || ''}"

YOUR PERSONA: ${selectedAuthor.name} from ${selectedAuthor.region.replace('_', ' ')}
TYPE: ${persona.type} - ${persona.tone}
${regionalInstruction}
${specialBehavior ? `BEHAVIOR: ${specialBehavior}` : ''}
${temporalInstruction}
${timeStyle.instruction}

LENGTH: ${targetLength}
SENTIMENT: ${commentSentiment}
${bannedOpeningsStr ? `AVOID THESE OPENINGS (already used): ${bannedOpeningsStr}` : ''}

Write ONE comment now.`;


        // Retry loop for generating valid comments
        const MAX_RETRIES = 3;
        let commentText = '';
        let isValidComment = false;
        
        console.log(`Generating comment ${i + 1}/${numComments} for article: ${article.title}`);
        
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            // Add 60-second timeout for AI call
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
                ],
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);

            if (!aiResponse.ok) {
              const errorText = await aiResponse.text();
              console.error(`AI API error (attempt ${attempt + 1}):`, errorText);
              continue;
            }

            const aiData = await aiResponse.json();
            commentText = aiData.choices[0].message.content.trim();

            // Remove any quotes the AI might have added
            commentText = commentText.replace(/^['"]|['"]$/g, '');
            
            // Remove any "Comment:" prefix if AI added it
            commentText = commentText.replace(/^(Comment|Response|Reply):\s*/i, '');

            // Check for violations BEFORE sanitization to catch AI misbehavior
            const preCheck = hasViolations(commentText);
            if (!preCheck.valid) {
              console.log(`Attempt ${attempt + 1}: Comment has violations, regenerating. Violations: ${preCheck.violations.join(', ')}`);
              await new Promise(resolve => setTimeout(resolve, 200));
              continue;
            }

            // Add natural variations based on region
            commentText = addNaturalVariations(commentText, selectedAuthor.region);

            // Final hard sanitization for any remaining banned fillers
            commentText = sanitizeComment(commentText);

            // Double-check after sanitization
            const postCheck = hasViolations(commentText);
            if (!postCheck.valid) {
              console.log(`Attempt ${attempt + 1}: Comment still has violations after sanitization, regenerating`);
              await new Promise(resolve => setTimeout(resolve, 200));
              continue;
            }

            isValidComment = true;
            break;
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              console.error(`Attempt ${attempt + 1}: AI request timed out after 60 seconds`);
            } else {
              console.error(`Attempt ${attempt + 1} error:`, error instanceof Error ? error.message : error);
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        if (!isValidComment || !commentText) {
          console.log('Failed to generate valid comment after max retries, skipping');
          continue;
        }

        // Track the opening to avoid repetition
        let opening = commentText.split(/[.!?\n]/)[0].toLowerCase().slice(0, 30);
        if (usedOpenings.includes(opening)) {
          // Nudge duplicated openings to feel less copy-paste
          commentText = commentText.replace(/^[^.!?\n]+/, (m: string) => `honestly ${m.toLowerCase()}`);
          opening = commentText.split(/[.!?\n]/)[0].toLowerCase().slice(0, 30);
        }
        usedOpenings.push(opening);

        // Store for potential threading
        previousComments.push({
          author: selectedAuthor.name,
          snippet: commentText.slice(0, 50),
        });

        const isFirstComment = commentsToGenerate.length === 0;
        const commentDate = generateTimestamp(article.published_at, article.updated_at, isFirstComment, i);

        commentsToGenerate.push({
          article_id: article.id,
          author_id: selectedAuthor.id,
          content: commentText,
          comment_date: commentDate.toISOString(),
        });

        await new Promise(resolve => setTimeout(resolve, 180));
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

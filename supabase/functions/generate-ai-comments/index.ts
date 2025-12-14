import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Regional expressions and patterns
const regionalPatterns: Record<string, { expressions: string[]; typoChance: number; shorthandChance: number; lowercaseChance: number; emojiChance: number }> = {
  singapore: {
    expressions: ['lah', 'lor', 'sia', 'hor', 'leh', 'meh', 'one', 'can'],
    typoChance: 0.15,
    shorthandChance: 0.25,
    lowercaseChance: 0.2,
    emojiChance: 0.3,
  },
  india: {
    expressions: ['yaar', 'na', 'actually', 'basically', 'only'],
    typoChance: 0.1,
    shorthandChance: 0.2,
    lowercaseChance: 0.15,
    emojiChance: 0.25,
  },
  philippines: {
    expressions: ['po', 'naman', 'talaga', 'grabe'],
    typoChance: 0.12,
    shorthandChance: 0.3,
    lowercaseChance: 0.25,
    emojiChance: 0.4,
  },
  hong_kong: {
    expressions: ['la', 'ga', 'ah'],
    typoChance: 0.15,
    shorthandChance: 0.15,
    lowercaseChance: 0.1,
    emojiChance: 0.2,
  },
  china: {
    expressions: [], // Less native expressions, more literal translations
    typoChance: 0.25, // Higher typo chance for non-native speakers
    shorthandChance: 0.1,
    lowercaseChance: 0.3,
    emojiChance: 0.35,
  },
  usa: {
    expressions: ['like', 'literally', 'honestly', 'lowkey', 'ngl', 'fr'],
    typoChance: 0.12,
    shorthandChance: 0.35,
    lowercaseChance: 0.3,
    emojiChance: 0.25,
  },
  france: {
    expressions: ['en fait', 'quand même', 'voilà', 'c\'est'],
    typoChance: 0.18,
    shorthandChance: 0.15,
    lowercaseChance: 0.2,
    emojiChance: 0.3,
  },
  uk: {
    expressions: ['quite', 'rather', 'proper', 'brilliant', 'cheers', 'mate'],
    typoChance: 0.1,
    shorthandChance: 0.2,
    lowercaseChance: 0.15,
    emojiChance: 0.2,
  },
  japan: {
    expressions: [],
    typoChance: 0.2,
    shorthandChance: 0.1,
    lowercaseChance: 0.25,
    emojiChance: 0.45,
  },
  korea: {
    expressions: [],
    typoChance: 0.18,
    shorthandChance: 0.15,
    lowercaseChance: 0.2,
    emojiChance: 0.4,
  },
  indonesia: {
    expressions: ['dong', 'sih', 'nih', 'deh'],
    typoChance: 0.15,
    shorthandChance: 0.25,
    lowercaseChance: 0.25,
    emojiChance: 0.35,
  },
  thailand: {
    expressions: ['krub', 'ka', 'na'],
    typoChance: 0.2,
    shorthandChance: 0.2,
    lowercaseChance: 0.25,
    emojiChance: 0.4,
  },
  vietnam: {
    expressions: [],
    typoChance: 0.22,
    shorthandChance: 0.15,
    lowercaseChance: 0.2,
    emojiChance: 0.3,
  },
  malaysia: {
    expressions: ['lah', 'mah', 'kan', 'one'],
    typoChance: 0.15,
    shorthandChance: 0.25,
    lowercaseChance: 0.2,
    emojiChance: 0.3,
  },
  west: {
    expressions: ['honestly', 'literally', 'basically'],
    typoChance: 0.1,
    shorthandChance: 0.2,
    lowercaseChance: 0.2,
    emojiChance: 0.2,
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
];

// Shorthand replacements
const shorthandReplacements = [
  { from: /\bvery\b/gi, to: 'rly', chance: 0.3 },
  { from: /\bthough\b/gi, to: 'tho', chance: 0.4 },
  { from: /\byou\b/gi, to: 'u', chance: 0.2 },
  { from: /\byour\b/gi, to: 'ur', chance: 0.2 },
  { from: /\byou're\b/gi, to: 'ur', chance: 0.25 },
  { from: /\bwith\b/gi, to: 'w/', chance: 0.15 },
  { from: /\bthanks\b/gi, to: 'thx', chance: 0.35 },
  { from: /\bbecause\b/gi, to: 'bc', chance: 0.25 },
  { from: /\bthrough\b/gi, to: 'thru', chance: 0.3 },
  { from: /\band\b/gi, to: '&', chance: 0.2 },
  { from: /\bdefinitely\b/gi, to: 'def', chance: 0.3 },
  { from: /\bprobably\b/gi, to: 'prob', chance: 0.3 },
  { from: /\bto be honest\b/gi, to: 'tbh', chance: 0.4 },
  { from: /\bin my opinion\b/gi, to: 'imo', chance: 0.4 },
  { from: /\bi don't know\b/gi, to: 'idk', chance: 0.35 },
  { from: /\bnot gonna lie\b/gi, to: 'ngl', chance: 0.4 },
  { from: /\bright now\b/gi, to: 'rn', chance: 0.3 },
  { from: /\bpeople\b/gi, to: 'ppl', chance: 0.2 },
  { from: /\bsomething\b/gi, to: 'sth', chance: 0.15 },
  { from: /\bwithout\b/gi, to: 'w/o', chance: 0.2 },
  { from: /\bpretty much\b/gi, to: 'p much', chance: 0.25 },
  { from: /\bfor real\b/gi, to: 'fr', chance: 0.3 },
];

// Missing apostrophe patterns
const apostrophePatterns = [
  { from: /\bdon't\b/gi, to: 'dont', chance: 0.35 },
  { from: /\bcan't\b/gi, to: 'cant', chance: 0.35 },
  { from: /\bwon't\b/gi, to: 'wont', chance: 0.35 },
  { from: /\bdidn't\b/gi, to: 'didnt', chance: 0.3 },
  { from: /\bisn't\b/gi, to: 'isnt', chance: 0.3 },
  { from: /\baren't\b/gi, to: 'arent', chance: 0.3 },
  { from: /\bwasn't\b/gi, to: 'wasnt', chance: 0.3 },
  { from: /\bweren't\b/gi, to: 'werent', chance: 0.3 },
  { from: /\bit's\b/gi, to: 'its', chance: 0.25 },
  { from: /\bthat's\b/gi, to: 'thats', chance: 0.25 },
  { from: /\bwhat's\b/gi, to: 'whats', chance: 0.25 },
  { from: /\bI'm\b/gi, to: 'im', chance: 0.35 },
  { from: /\bI've\b/gi, to: 'ive', chance: 0.3 },
  { from: /\bI'll\b/gi, to: 'ill', chance: 0.3 },
];

// Emoji sets by sentiment
const positiveEmojis = ['👍', '🙌', '💯', '🔥', '✨', '👏', '🎯', '💪', '🚀', '⭐'];
const neutralEmojis = ['🤔', '💭', '📌', '👀', '💡', '📊', '🧐', '📝'];
const negativeEmojis = ['😬', '🙄', '😅', '🤷', '😤'];

// Helper to add natural typos
const addTypos = (text: string, typoChance: number): string => {
  if (Math.random() > typoChance) return text;
  
  let result = text;
  const numTypos = Math.random() < 0.7 ? 1 : 2;
  
  for (let i = 0; i < numTypos; i++) {
    // Random typo type
    const typoType = Math.random();
    
    if (typoType < 0.4) {
      // Use predefined typo patterns
      const pattern = typoPatterns[Math.floor(Math.random() * typoPatterns.length)];
      const regex = new RegExp(`\\b${pattern.correct}\\b`, 'i');
      if (regex.test(result)) {
        result = result.replace(regex, pattern.typo);
      }
    } else if (typoType < 0.7) {
      // Double a letter
      const words = result.split(' ');
      const randomIndex = Math.floor(Math.random() * words.length);
      const word = words[randomIndex];
      if (word.length > 4) {
        const pos = Math.floor(Math.random() * (word.length - 1)) + 1;
        words[randomIndex] = word.slice(0, pos) + word[pos - 1] + word.slice(pos);
        result = words.join(' ');
      }
    } else {
      // Skip a letter
      const words = result.split(' ');
      const randomIndex = Math.floor(Math.random() * words.length);
      const word = words[randomIndex];
      if (word.length > 5) {
        const pos = Math.floor(Math.random() * (word.length - 2)) + 1;
        words[randomIndex] = word.slice(0, pos) + word.slice(pos + 1);
        result = words.join(' ');
      }
    }
  }
  
  return result;
};

// Helper to add shorthand
const addShorthand = (text: string, shorthandChance: number): string => {
  if (Math.random() > shorthandChance) return text;
  
  let result = text;
  const numReplacements = Math.random() < 0.6 ? 1 : Math.random() < 0.9 ? 2 : 3;
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
  
  // Different levels of lowercase
  const level = Math.random();
  if (level < 0.5) {
    // Full lowercase
    return text.toLowerCase();
  } else if (level < 0.8) {
    // Lowercase except first letter
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  } else {
    // Random capitalization dropped
    return text.split('').map(char => 
      Math.random() < 0.3 ? char.toLowerCase() : char
    ).join('');
  }
};

// Helper to add punctuation variations
const addPunctuationVariations = (text: string): string => {
  let result = text;
  
  // Double punctuation
  if (Math.random() < 0.15) {
    result = result.replace(/!$/, '!!');
  }
  if (Math.random() < 0.1) {
    result = result.replace(/\?$/, '??');
  }
  
  // Trailing ellipsis
  if (Math.random() < 0.12 && !result.endsWith('...') && !result.endsWith('!') && !result.endsWith('?')) {
    result = result.replace(/\.$/, '...');
  }
  
  // Missing final punctuation
  if (Math.random() < 0.2) {
    result = result.replace(/[.!?]$/, '');
  }
  
  return result;
};

// Helper to add emojis
const addEmojis = (text: string, emojiChance: number, sentiment: 'positive' | 'neutral' | 'negative'): string => {
  if (Math.random() > emojiChance) return text;
  
  const emojiSet = sentiment === 'positive' ? positiveEmojis : 
                   sentiment === 'negative' ? negativeEmojis : neutralEmojis;
  
  const numEmojis = Math.random() < 0.7 ? 1 : 2;
  const selectedEmojis = [];
  
  for (let i = 0; i < numEmojis; i++) {
    selectedEmojis.push(emojiSet[Math.floor(Math.random() * emojiSet.length)]);
  }
  
  // Position: end, beginning, or inline
  const position = Math.random();
  if (position < 0.7) {
    return text + ' ' + selectedEmojis.join('');
  } else if (position < 0.85) {
    return selectedEmojis.join('') + ' ' + text;
  } else {
    // Inline
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
  
  // Apply variations in order
  result = addTypos(result, patterns.typoChance);
  result = addShorthand(result, patterns.shorthandChance);
  result = removeApostrophes(result);
  result = makeLowercase(result, patterns.lowercaseChance);
  result = addPunctuationVariations(result);
  
  // Determine sentiment for emoji selection
  const lowerText = text.toLowerCase();
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (lowerText.includes('great') || lowerText.includes('love') || lowerText.includes('amazing') || 
      lowerText.includes('excellent') || lowerText.includes('helpful') || lowerText.includes('thanks')) {
    sentiment = 'positive';
  } else if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('bad') ||
             lowerText.includes('disagree') || lowerText.includes('wrong') || lowerText.includes('concern')) {
    sentiment = 'negative';
  }
  
  result = addEmojis(result, patterns.emojiChance, sentiment);
  
  return result;
};

// Helper to generate comment timestamp
const generateTimestamp = (publishDate: string, updatedDate: string | null): Date => {
  const published = new Date(publishDate);
  const updated = updatedDate ? new Date(updatedDate) : published;
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

    // Fetch articles
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

    // Fetch all authors
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

    // Group authors by region
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
      // Delete existing AI comments for this article
      await supabase
        .from('ai_generated_comments')
        .delete()
        .eq('article_id', article.id);

      // Determine number of comments (2-4 default, with 20% chance of 5-6)
      const numComments = Math.random() < 0.2 
        ? Math.floor(Math.random() * 2) + 5
        : Math.floor(Math.random() * 3) + 2;

      const commentsToGenerate = [];

      // Comment personas for variety
      const personas = [
        { type: 'enthusiast', tone: 'excited and supportive' },
        { type: 'skeptic', tone: 'questioning and analytical' },
        { type: 'insider', tone: 'knowledgeable, shares industry experience' },
        { type: 'newcomer', tone: 'curious, asks basic questions' },
        { type: 'critic', tone: 'constructive criticism, points out issues' },
        { type: 'storyteller', tone: 'shares personal anecdotes' },
        { type: 'joker', tone: 'light-hearted, uses humor' },
        { type: 'pragmatist', tone: 'practical, focuses on applications' },
      ];

      for (let i = 0; i < numComments; i++) {
        // 30% chance to use power user
        const usePowerUser = Math.random() < 0.3 && powerUsers.length > 0;
        
        let selectedAuthor;
        if (usePowerUser) {
          selectedAuthor = powerUsers[Math.floor(Math.random() * powerUsers.length)];
        } else {
          // Select author based on regional distribution weighted toward Asia
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
        
        if (!selectedAuthor) {
          console.error('Failed to select author');
          continue;
        }

        // Select random persona
        const persona = personas[Math.floor(Math.random() * personas.length)];

        // Determine comment length (25% short, 50% medium, 25% long)
        const lengthRand = Math.random();
        let targetLength: string;
        if (lengthRand < 0.25) targetLength = '10-30 words, can be a fragment or one-liner';
        else if (lengthRand < 0.75) targetLength = '30-60 words';
        else targetLength = '60-100 words';

        // Check if article is old
        const articleAge = (new Date().getTime() - new Date(article.published_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
        const isOldArticle = articleAge > 12;

        // Build regional language instruction
        const regionPatterns = regionalPatterns[selectedAuthor.region] || regionalPatterns.west;
        let regionalInstruction = '';
        
        if (selectedAuthor.region === 'china') {
          regionalInstruction = `Write with slightly awkward English phrasing typical of non-native speakers. May use literal translations, occasionally miss articles (a/the), or have unusual word order. Examples: "This technology is very useful for my work situation" or "I have concern about this approach"`;
        } else if (selectedAuthor.region === 'france') {
          regionalInstruction = `Occasionally include a French word or expression (en fait, voilà, c'est vrai). May have slight French-influenced phrasing.`;
        } else if (selectedAuthor.region === 'singapore' || selectedAuthor.region === 'malaysia') {
          regionalInstruction = `May naturally use Singlish expressions like "lah", "lor", "sia" at end of sentences. Example: "This one quite good lah" or "Not sure if can work lor"`;
        } else if (selectedAuthor.region === 'india') {
          regionalInstruction = `May use Indian English patterns like "only" for emphasis, "actually" frequently, or expressions like "yaar". Example: "This is actually very good only" or "We should try this na"`;
        }

        // Vary temporal handling for old articles
        let temporalInstruction = '';
        if (isOldArticle) {
          const temporalVariations = [
            'Subtly reference that some time has passed but avoid clichés',
            "Don't mention the article age at all",
            'Casually note you just discovered this topic',
            '',
          ];
          temporalInstruction = temporalVariations[Math.floor(Math.random() * temporalVariations.length)];
        }

        // Generate comment using Lovable AI
        const prompt = `You are ${selectedAuthor.name}, a ${persona.type} reader from ${selectedAuthor.region.replace('_', ' ')}. Your tone is ${persona.tone}.

Write a comment on this article:
Title: "${article.title}"
Summary: "${article.excerpt || 'No summary available'}"

CRITICAL AUTHENTICITY REQUIREMENTS:
- Write like a REAL person typing quickly online, NOT a polished essay
- Use casual, conversational language with natural imperfections
- Sentence fragments are OK. Run-on sentences happen too.
- Don't always use perfect grammar or punctuation
- Some comments can be just reactions like "wow this is huge" or "finally someone talking about this"
- Mix short punchy sentences with longer rambling ones
- Can start sentences with "And", "But", "So", "Like"
- DON'T sound like ChatGPT or formal writing
- NO em dashes, NO semicolons, minimal commas
- NEVER end with question tags like "isn't it?", "right?", "don't you think?"

${regionalInstruction}

Style:
- Length: ${targetLength}
- Persona: ${persona.type} - ${persona.tone}
${temporalInstruction ? `- ${temporalInstruction}` : ''}

VARIETY (comment ${i + 1} of ${numComments}):
- Each comment must feel like a different person wrote it
- Vary: sentence structure, vocabulary, formality level, punctuation style
- Some people use all lowercase
- Some people dont use apostrophes  
- Some people use abbreviations like "tbh" "imo" "ngl" "rn"
- Some people add emojis 🔥 or 👍

Write ONLY the comment text, nothing else.`;

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

          // Add natural variations based on region
          commentText = addNaturalVariations(commentText, selectedAuthor.region);

          // Generate timestamp
          const commentDate = generateTimestamp(article.published_at, article.updated_at);

          commentsToGenerate.push({
            article_id: article.id,
            author_id: selectedAuthor.id,
            content: commentText,
            comment_date: commentDate.toISOString(),
          });

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error) {
          console.error('Error generating comment:', error);
          continue;
        }
      }

      // Insert all comments for this article
      if (commentsToGenerate.length > 0) {
        const { error: insertError } = await supabase
          .from('ai_generated_comments')
          .insert(commentsToGenerate);

        if (insertError) {
          console.error('Error inserting comments:', insertError);
        } else {
          totalGenerated += commentsToGenerate.length;

          // Update author comment counts
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

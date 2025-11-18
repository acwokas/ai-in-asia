import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityMetrics {
  articleId: string;
  articleTitle: string;
  commentCount: number;
  qualityScore: number;
  issues: string[];
  endingSimilarity: number;
  phraseRepetition: number;
  structureSimilarity: number;
  lengthVariation: number;
}

// Extract last 3 words of text (common endings)
const getEnding = (text: string): string => {
  const words = text.trim().replace(/[.!?]$/, '').split(/\s+/);
  return words.slice(-3).join(' ').toLowerCase();
};

// Calculate similarity between two strings (simple Jaccard similarity)
const calculateSimilarity = (str1: string, str2: string): number => {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
};

// Detect common phrases (2-4 word sequences)
const extractPhrases = (text: string): string[] => {
  const words = text.toLowerCase().split(/\s+/);
  const phrases: string[] = [];
  
  for (let len = 2; len <= 4; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      phrases.push(words.slice(i, i + len).join(' '));
    }
  }
  
  return phrases;
};

// Analyze comments for a single article
const analyzeArticleComments = (comments: any[]): QualityMetrics => {
  if (comments.length < 2) {
    return {
      articleId: comments[0]?.article_id || '',
      articleTitle: '',
      commentCount: comments.length,
      qualityScore: 100,
      issues: comments.length === 0 ? ['No comments'] : [],
      endingSimilarity: 0,
      phraseRepetition: 0,
      structureSimilarity: 0,
      lengthVariation: 100,
    };
  }

  const texts = comments.map(c => c.content);
  const issues: string[] = [];

  // 1. Check ending similarity
  const endings = texts.map(getEnding);
  const uniqueEndings = new Set(endings);
  const endingSimilarity = Math.round((1 - uniqueEndings.size / endings.length) * 100);
  
  if (endingSimilarity > 50) {
    issues.push(`High ending similarity (${endingSimilarity}%)`);
  }

  // Check for specific problematic endings
  const questionTags = ['isn\'t it', 'right?', 'don\'t you', 'no?', 'yeah?'];
  const questionTagCount = endings.filter(e => 
    questionTags.some(tag => e.includes(tag))
  ).length;
  
  if (questionTagCount > 1) {
    issues.push(`${questionTagCount} comments use question tags`);
  }

  // 2. Check phrase repetition
  const allPhrases = texts.flatMap(extractPhrases);
  const phraseCounts = new Map<string, number>();
  
  allPhrases.forEach(phrase => {
    phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
  });
  
  const repeatedPhrases = Array.from(phraseCounts.entries())
    .filter(([_, count]) => count > 2)
    .sort((a, b) => b[1] - a[1]);
  
  const phraseRepetition = Math.min(100, repeatedPhrases.length * 20);
  
  if (repeatedPhrases.length > 0) {
    issues.push(`${repeatedPhrases.length} phrases repeated 3+ times`);
  }

  // 3. Check structural similarity (overall text similarity)
  let totalSimilarity = 0;
  let comparisons = 0;
  
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      totalSimilarity += calculateSimilarity(texts[i], texts[j]);
      comparisons++;
    }
  }
  
  const structureSimilarity = Math.round((totalSimilarity / comparisons) * 100);
  
  if (structureSimilarity > 40) {
    issues.push(`High structural similarity (${structureSimilarity}%)`);
  }

  // 4. Check length variation
  const lengths = texts.map(t => t.split(/\s+/).length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const lengthVariation = Math.round(Math.min(100, (stdDev / avgLength) * 100));
  
  if (lengthVariation < 20) {
    issues.push(`Low length variation (${lengthVariation}%)`);
  }

  // Calculate overall quality score (0-100, higher is better)
  const qualityScore = Math.round(
    (100 - endingSimilarity) * 0.3 +
    (100 - phraseRepetition) * 0.3 +
    (100 - structureSimilarity) * 0.2 +
    lengthVariation * 0.2
  );

  return {
    articleId: comments[0].article_id,
    articleTitle: '',
    commentCount: comments.length,
    qualityScore,
    issues,
    endingSimilarity,
    phraseRepetition,
    structureSimilarity,
    lengthVariation,
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all articles with AI comments
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        ai_generated_comments (
          id,
          content,
          article_id
        )
      `)
      .eq('status', 'published');

    if (articlesError) throw articlesError;

    // Analyze each article
    const results: QualityMetrics[] = [];
    
    for (const article of articles || []) {
      if (article.ai_generated_comments && article.ai_generated_comments.length > 0) {
        const metrics = analyzeArticleComments(article.ai_generated_comments);
        metrics.articleTitle = article.title;
        results.push(metrics);
      }
    }

    // Sort by quality score (lowest first - these need attention)
    results.sort((a, b) => a.qualityScore - b.qualityScore);

    // Flag articles with quality score below 60
    const flaggedArticles = results.filter(r => r.qualityScore < 60);

    return new Response(
      JSON.stringify({
        totalArticles: results.length,
        flaggedArticles: flaggedArticles.length,
        results,
        summary: {
          excellent: results.filter(r => r.qualityScore >= 80).length,
          good: results.filter(r => r.qualityScore >= 60 && r.qualityScore < 80).length,
          needsImprovement: results.filter(r => r.qualityScore < 60).length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing comment quality:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

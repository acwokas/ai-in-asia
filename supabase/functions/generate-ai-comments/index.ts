import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to add natural typos and shorthand
const addNaturalVariations = (text: string): string => {
  const variations = [
    { from: /\bvery\b/gi, to: 'rly', chance: 0.1 },
    { from: /\bthough\b/gi, to: 'tho', chance: 0.15 },
    { from: /\byou\b/gi, to: 'u', chance: 0.05 },
    { from: /\bwith\b/gi, to: 'w/', chance: 0.1 },
    { from: /\bthanks\b/gi, to: 'thx', chance: 0.15 },
    { from: /\bbecause\b/gi, to: 'bc', chance: 0.1 },
    { from: /\bthrough\b/gi, to: 'thru', chance: 0.1 },
    { from: /\band\b/gi, to: '&', chance: 0.15 },
    { from: /\bdefinitely\b/gi, to: 'def', chance: 0.1 },
    { from: /\bprobably\b/gi, to: 'prob', chance: 0.1 },
  ];

  let result = text;
  for (const variation of variations) {
    if (Math.random() < variation.chance) {
      result = result.replace(variation.from, variation.to as string);
    }
  }

  // Add occasional typos (doubled letters, missing letters)
  if (Math.random() < 0.1) {
    const words = result.split(' ');
    const randomIndex = Math.floor(Math.random() * words.length);
    const word = words[randomIndex];
    if (word.length > 4) {
      const pos = Math.floor(Math.random() * word.length);
      if (Math.random() < 0.5) {
        // Double a letter
        words[randomIndex] = word.slice(0, pos) + word[pos] + word.slice(pos);
      } else {
        // Skip a letter
        words[randomIndex] = word.slice(0, pos) + word.slice(pos + 1);
      }
    }
    result = words.join(' ');
  }

  return result;
};

// Helper to generate comment timestamp
const generateTimestamp = (publishDate: string, updatedDate: string | null): Date => {
  const published = new Date(publishDate);
  const updated = updatedDate ? new Date(updatedDate) : published;
  const now = new Date();
  const articleAgeMonths = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (articleAgeMonths > 6) {
    // Old article: mix of old comments near publish date and recent ones
    if (Math.random() < 0.3) {
      // Recent comment (within last 60 days)
      const daysAgo = Math.floor(Math.random() * 60);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      return timestamp;
    } else {
      // Old comment (weeks after publish)
      const weeksAfter = Math.floor(Math.random() * 12) + 1; // 1-12 weeks
      const timestamp = new Date(published);
      timestamp.setDate(timestamp.getDate() + (weeksAfter * 7));
      return timestamp;
    }
  } else {
    // Recent article: comments in days after publish
    const daysAfter = Math.floor(Math.random() * 30) + 1; // 1-30 days
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

    // Fetch all authors grouped by region and power user status
    const { data: authors, error: authorsError } = await supabase
      .from('ai_comment_authors')
      .select('*');

    if (authorsError) throw authorsError;

    const authorsByRegion = {
      singapore: authors.filter(a => a.region === 'singapore'),
      india: authors.filter(a => a.region === 'india'),
      philippines: authors.filter(a => a.region === 'philippines'),
      china_hk: authors.filter(a => a.region === 'china_hk'),
      west: authors.filter(a => a.region === 'west'),
    };

    const powerUsers = authors.filter(a => a.is_power_user);

    let totalGenerated = 0;

    for (const article of articles) {
      // Delete existing AI comments for this article
      await supabase
        .from('ai_generated_comments')
        .delete()
        .eq('article_id', article.id);

      // Determine number of comments (2-4 default, with 20% chance of 5-6)
      const numComments = Math.random() < 0.2 
        ? Math.floor(Math.random() * 2) + 5  // 5-6
        : Math.floor(Math.random() * 3) + 2; // 2-4

      const commentsToGenerate = [];

      for (let i = 0; i < numComments; i++) {
        // 30% chance to use power user
        const usePowerUser = Math.random() < 0.3 && powerUsers.length > 0;
        
        let selectedAuthor;
        if (usePowerUser) {
          selectedAuthor = powerUsers[Math.floor(Math.random() * powerUsers.length)];
        } else {
          // Select author based on regional distribution
          const rand = Math.random();
          let region: keyof typeof authorsByRegion;
          if (rand < 0.4) region = 'singapore';
          else if (rand < 0.6) region = 'india';
          else if (rand < 0.7) region = 'philippines';
          else if (rand < 0.8) region = 'china_hk';
          else region = 'west';

          const regionAuthors = authorsByRegion[region];
          selectedAuthor = regionAuthors[Math.floor(Math.random() * regionAuthors.length)];
        }

        // Determine comment length (20% short, 60% medium, 20% long)
        const lengthRand = Math.random();
        let targetLength: string;
        if (lengthRand < 0.2) targetLength = '15-40 words';
        else if (lengthRand < 0.8) targetLength = '40-80 words';
        else targetLength = '80-120 words';

        // Check if article is old
        const articleAge = (new Date().getTime() - new Date(article.published_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
        const isOldArticle = articleAge > 12;

        // Generate comment using Lovable AI
        const prompt = `You are ${selectedAuthor.name}, a reader from ${selectedAuthor.region.replace('_', ' ')}. Write a natural, authentic comment on this article.

Article: "${article.title}"
Summary: "${article.excerpt || 'No summary available'}"

Requirements:
- Length: ${targetLength}
- ${isOldArticle ? 'This article is over a year old. Acknowledge this but mention its continued relevance.' : 'This is a recent article.'}
- Be specific and relevant to the article topic
- Add a thought, question, or personal perspective
- Use ${selectedAuthor.region === 'west' ? 'British or American' : 'a mix of British and American'} English spelling
- Sound natural and conversational
- Include regional phrasing if appropriate (subtle, not stereotypical)
- NO em rules, NO hyphens for emphasis
- NO promotional content
- NO contradicting the article's facts
- Mix of constructive, neutral, or mildly critical tone

Write ONLY the comment text, no metadata.`;

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
              temperature: 0.9,
            }),
          });

          if (!aiResponse.ok) {
            console.error('AI API error:', await aiResponse.text());
            continue;
          }

          const aiData = await aiResponse.json();
          let commentText = aiData.choices[0].message.content.trim();

          // Add natural variations
          commentText = addNaturalVariations(commentText);

          // Generate timestamp
          const commentDate = generateTimestamp(article.published_at, article.updated_at);

          commentsToGenerate.push({
            article_id: article.id,
            author_id: selectedAuthor.id,
            content: commentText,
            comment_date: commentDate.toISOString(),
          });

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
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

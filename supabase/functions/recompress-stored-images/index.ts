import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function compressImage(imageBuffer: ArrayBuffer, originalSize: number): Promise<{ buffer: Uint8Array; sizeReduction: number }> {
  try {
    // Skip compression for small images (under 50KB)
    if (originalSize < 50 * 1024) {
      return { buffer: new Uint8Array(imageBuffer), sizeReduction: 0 };
    }

    const image = await Image.decode(new Uint8Array(imageBuffer));
    
    // Resize if too large (max 1920x1080)
    const maxWidth = 1920;
    const maxHeight = 1080;
    
    if (image.width > maxWidth || image.height > maxHeight) {
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
      const newWidth = Math.floor(image.width * ratio);
      const newHeight = Math.floor(image.height * ratio);
      image.resize(newWidth, newHeight);
    }
    
    // Encode as JPEG for compression (quality 85)
    const compressedBuffer = await image.encodeJPEG(85);
    
    // Calculate size reduction
    const sizeReduction = originalSize - compressedBuffer.length;
    
    // Only use compressed if it's actually smaller
    if (sizeReduction > 0) {
      return { buffer: compressedBuffer, sizeReduction };
    }
    
    return { buffer: new Uint8Array(imageBuffer), sizeReduction: 0 };
  } catch (error) {
    console.error('Compression failed:', error);
    return { buffer: new Uint8Array(imageBuffer), sizeReduction: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleIds } = await req.json();

    if (!articleIds || !Array.isArray(articleIds)) {
      throw new Error('articleIds array is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = [];

    for (const articleId of articleIds) {
      console.log(`\n=== Processing article: ${articleId} ===`);
      
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('id, title, content')
        .eq('id', articleId)
        .single();

      if (fetchError || !article) {
        results.push({
          articleId,
          status: 'error',
          error: `Failed to fetch article: ${fetchError?.message}`,
        });
        continue;
      }

      let imagesProcessed = 0;
      let totalSavings = 0;
      const errors: string[] = [];

      // Extract image URLs from content
      const content = JSON.stringify(article.content);
      const imageUrlRegex = /https:\/\/[^"\s]+\/storage\/v1\/object\/public\/article-images\/[^"\s]+/g;
      const imageUrls = content.match(imageUrlRegex) || [];
      const uniqueUrls = [...new Set(imageUrls)];

      console.log(`Found ${uniqueUrls.length} unique storage images`);

      for (const imageUrl of uniqueUrls) {
        try {
          // Extract the file path from the URL
          const urlParts = imageUrl.split('/article-images/');
          if (urlParts.length !== 2) {
            errors.push(`Invalid URL format: ${imageUrl}`);
            continue;
          }
          const filePath = decodeURIComponent(urlParts[1]);

          // Download the image from Supabase storage
          const { data: imageData, error: downloadError } = await supabase.storage
            .from('article-images')
            .download(filePath);

          if (downloadError || !imageData) {
            errors.push(`Failed to download ${filePath}: ${downloadError?.message}`);
            continue;
          }

          const imageBuffer = await imageData.arrayBuffer();
          const originalSize = imageBuffer.byteLength;
          
          console.log(`Processing image: ${(originalSize / 1024).toFixed(2)}KB`);

          // Compress the image
          const { buffer: compressedBuffer, sizeReduction } = await compressImage(imageBuffer, originalSize);

          if (sizeReduction > 0) {
            // Upload the compressed version (overwrite the original)
            const { error: uploadError } = await supabase.storage
              .from('article-images')
              .upload(filePath, compressedBuffer, {
                contentType: 'image/jpeg',
                upsert: true, // Overwrite the existing file
              });

            if (uploadError) {
              errors.push(`Upload failed for ${filePath}: ${uploadError.message}`);
              continue;
            }

            imagesProcessed++;
            totalSavings += sizeReduction;
            console.log(`Compressed: ${(sizeReduction / 1024).toFixed(2)}KB saved`);
          } else {
            console.log('No compression benefit, skipping');
          }
        } catch (error: any) {
          errors.push(`Error processing image: ${error.message}`);
        }
      }

      results.push({
        articleId,
        articleTitle: article.title,
        status: 'success',
        imagesFound: uniqueUrls.length,
        imagesProcessed,
        totalSavingsKB: Math.round(totalSavings / 1024),
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          totalArticles: articleIds.length,
          totalImagesProcessed: results.reduce((sum, r) => sum + (r.imagesProcessed || 0), 0),
          totalSavingsKB: results.reduce((sum, r) => sum + (r.totalSavingsKB || 0), 0),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

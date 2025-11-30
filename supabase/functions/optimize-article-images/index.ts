import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageOptimizationResult {
  articleId: string;
  articleTitle: string;
  imagesFound: number;
  imagesOptimized: number;
  errors: string[];
  originalSizeKB: number;
  optimizedSizeKB: number;
}

async function compressImage(imageBuffer: ArrayBuffer, format: string, originalSize: number): Promise<{ buffer: Uint8Array; format: string }> {
  try {
    // Skip compression for small images (under 100KB)
    if (originalSize < 100 * 1024) {
      return { buffer: new Uint8Array(imageBuffer), format };
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
    
    // If compressed size is larger than original, use original
    if (compressedBuffer.length > originalSize) {
      return { buffer: new Uint8Array(imageBuffer), format };
    }
    
    return { buffer: compressedBuffer, format: 'jpeg' };
  } catch (error) {
    console.error('Compression failed, using original:', error);
    return { buffer: new Uint8Array(imageBuffer), format };
  }
}

async function extractAndOptimizeImages(
  content: any,
  supabase: any,
  articleId: string
): Promise<{ newContent: any; stats: { found: number; optimized: number; originalSize: number; optimizedSize: number; errors: string[] } }> {
  let imageCount = 0;
  let optimizedCount = 0;
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  const errors: string[] = [];

  // Convert content to string for processing
  let contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  
  // Find all base64 images: data:image/[format];base64,[data]
  const base64Regex = /data:image\/(png|jpg|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)/g;
  const matches = [...contentStr.matchAll(base64Regex)];
  
  console.log(`Found ${matches.length} base64 images in article ${articleId}`);
  
  for (const match of matches) {
    imageCount++;
    const fullMatch = match[0];
    const format = match[1];
    const base64Data = match[2];
    
    try {
      // Convert base64 to buffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const originalSize = bytes.length;
      totalOriginalSize += originalSize;
      
      console.log(`Processing image ${imageCount}: ${(originalSize / 1024).toFixed(2)}KB`);
      
      // Compress the image
      const { buffer: finalBuffer, format: outputFormat } = await compressImage(
        bytes.buffer,
        format,
        originalSize
      );
      
      const optimizedSize = finalBuffer.byteLength;
      console.log(`Compressed to: ${(optimizedSize / 1024).toFixed(2)}KB (${Math.round((1 - optimizedSize / originalSize) * 100)}% reduction)`);
      totalOptimizedSize += optimizedSize;
      
      // Generate filename
      const timestamp = Date.now();
      const fileExt = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
      const fileName = `optimized-${articleId}-${imageCount}-${timestamp}.${fileExt}`;
      const filePath = `content/${fileName}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, finalBuffer, {
          contentType: `image/${outputFormat}`,
          upsert: false,
        });
      
      if (uploadError) {
        console.error(`Upload error for image ${imageCount}:`, uploadError);
        errors.push(`Failed to upload image ${imageCount}: ${uploadError.message}`);
        continue;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);
      
      console.log(`Uploaded image ${imageCount} to: ${publicUrl}`);
      
      // Replace in content
      contentStr = contentStr.replace(fullMatch, publicUrl);
      optimizedCount++;
      
    } catch (err) {
      const error = err as Error;
      console.error(`Error processing image ${imageCount}:`, error);
      errors.push(`Failed to process image ${imageCount}: ${error.message}`);
    }
  }
  
  // Convert content back to original format
  let newContent: any;
  try {
    newContent = typeof content === 'string' ? contentStr : JSON.parse(contentStr);
  } catch {
    newContent = contentStr;
  }
  
  return {
    newContent,
    stats: {
      found: imageCount,
      optimized: optimizedCount,
      originalSize: totalOriginalSize,
      optimizedSize: totalOptimizedSize,
      errors,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { articleIds } = await req.json();

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      throw new Error('articleIds array is required');
    }

    console.log(`Processing ${articleIds.length} articles for image optimization`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: ImageOptimizationResult[] = [];

    // Process each article
    for (const articleId of articleIds) {
      console.log(`\n=== Processing article: ${articleId} ===`);
      
      try {
        // Fetch article
        const { data: article, error: fetchError } = await supabase
          .from('articles')
          .select('id, title, content')
          .eq('id', articleId)
          .single();

        if (fetchError || !article) {
          console.error(`Failed to fetch article ${articleId}:`, fetchError);
          results.push({
            articleId,
            articleTitle: 'Unknown',
            imagesFound: 0,
            imagesOptimized: 0,
            errors: [`Failed to fetch article: ${fetchError?.message || 'Not found'}`],
            originalSizeKB: 0,
            optimizedSizeKB: 0,
          });
          continue;
        }

        // Extract and optimize images
        const { newContent, stats } = await extractAndOptimizeImages(
          article.content,
          supabase,
          articleId
        );

        // Update article if images were optimized
        if (stats.optimized > 0) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ content: newContent })
            .eq('id', articleId);

          if (updateError) {
            console.error(`Failed to update article ${articleId}:`, updateError);
            stats.errors.push(`Failed to update article: ${updateError.message}`);
          } else {
            console.log(`Successfully updated article ${articleId} with ${stats.optimized} optimized images`);
          }
        }

        results.push({
          articleId,
          articleTitle: article.title,
          imagesFound: stats.found,
          imagesOptimized: stats.optimized,
          errors: stats.errors,
          originalSizeKB: Math.round(stats.originalSize / 1024),
          optimizedSizeKB: Math.round(stats.optimizedSize / 1024),
        });

      } catch (err) {
        const error = err as Error;
        console.error(`Error processing article ${articleId}:`, error);
        results.push({
          articleId,
          articleTitle: 'Error',
          imagesFound: 0,
          imagesOptimized: 0,
          errors: [error.message],
          originalSizeKB: 0,
          optimizedSizeKB: 0,
        });
      }
    }

    console.log('\n=== Optimization Complete ===');
    console.log(`Total articles processed: ${results.length}`);
    console.log(`Total images found: ${results.reduce((sum, r) => sum + r.imagesFound, 0)}`);
    console.log(`Total images optimized: ${results.reduce((sum, r) => sum + r.imagesOptimized, 0)}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          articlesProcessed: results.length,
          totalImagesFound: results.reduce((sum, r) => sum + r.imagesFound, 0),
          totalImagesOptimized: results.reduce((sum, r) => sum + r.imagesOptimized, 0),
          totalOriginalSizeKB: results.reduce((sum, r) => sum + r.originalSizeKB, 0),
          totalOptimizedSizeKB: results.reduce((sum, r) => sum + r.optimizedSizeKB, 0),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    const error = err as Error;
    console.error('Error in optimize-article-images:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

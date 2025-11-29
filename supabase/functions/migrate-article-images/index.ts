import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TopListItem {
  id: string;
  title: string;
  prompt: string;
  image_urls?: string[];
  [key: string]: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sourceArticleId, targetArticleId } = await req.json();

    console.log('Fetching source article:', sourceArticleId);
    
    // Fetch the original article content
    const { data: sourceArticle, error: fetchError } = await supabase
      .from('articles')
      .select('content')
      .eq('id', sourceArticleId)
      .single();

    if (fetchError || !sourceArticle) {
      throw new Error(`Failed to fetch source article: ${fetchError?.message}`);
    }

    // Extract base64 images from HTML content
    const contentHtml = typeof sourceArticle.content === 'string' 
      ? sourceArticle.content 
      : JSON.stringify(sourceArticle.content);
    
    console.log('Extracting base64 images from content...');
    
    // Match img tags with base64 data
    const base64ImageRegex = /<img\s+src="data:image\/(png|jpeg|jpg|webp);base64,([^"]+)"/gi;
    const matches = [...contentHtml.matchAll(base64ImageRegex)];
    
    console.log(`Found ${matches.length} base64 images`);

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No base64 images found in source article' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Upload each image and collect URLs
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const imageFormat = match[1]; // png, jpeg, jpg, webp
      const base64Data = match[2];
      
      console.log(`Processing image ${i + 1}/${matches.length} (format: ${imageFormat})`);
      
      try {
        // Convert base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        
        // Generate filename
        const timestamp = Date.now();
        const fileName = `portrait-prompt-${i + 1}-${timestamp}.${imageFormat === 'jpeg' ? 'jpg' : imageFormat}`;
        const filePath = fileName;
        
        console.log(`Uploading ${fileName}...`);
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('article-images')
          .upload(filePath, bytes, {
            contentType: `image/${imageFormat}`,
            upsert: false
          });

        if (uploadError) {
          console.error(`Upload error for image ${i + 1}:`, uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('article-images')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
        console.log(`Successfully uploaded image ${i + 1}: ${publicUrl}`);
        
      } catch (error) {
        console.error(`Failed to process image ${i + 1}:`, error);
        // Continue with other images even if one fails
      }
    }

    console.log(`Successfully uploaded ${uploadedUrls.length} images`);

    // Fetch the target Top Lists article
    const { data: targetArticle, error: targetFetchError } = await supabase
      .from('articles')
      .select('top_list_items')
      .eq('id', targetArticleId)
      .single();

    if (targetFetchError || !targetArticle) {
      throw new Error(`Failed to fetch target article: ${targetFetchError?.message}`);
    }

    // Update each item with its corresponding image
    const topListItems = targetArticle.top_list_items as TopListItem[];
    
    if (!topListItems || topListItems.length === 0) {
      throw new Error('No top list items found in target article');
    }

    console.log(`Updating ${topListItems.length} list items with image URLs...`);
    
    const updatedItems = topListItems.map((item, index) => {
      if (index < uploadedUrls.length) {
        return {
          ...item,
          image_urls: [uploadedUrls[index]]
        };
      }
      return item;
    });

    // Update the article
    const { error: updateError } = await supabase
      .from('articles')
      .update({ 
        top_list_items: updatedItems,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetArticleId);

    if (updateError) {
      throw new Error(`Failed to update target article: ${updateError.message}`);
    }

    console.log('Successfully updated Top Lists article with image URLs');

    return new Response(
      JSON.stringify({ 
        success: true, 
        imagesUploaded: uploadedUrls.length,
        imageUrls: uploadedUrls,
        message: `Successfully migrated ${uploadedUrls.length} images` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in migrate-article-images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Image optimization utilities for Supabase Storage and static assets
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Generates an optimized Supabase Storage image URL with transformations
 * Supabase supports image transformations via query parameters
 */
export function getOptimizedSupabaseImage(
  url: string,
  options: ImageTransformOptions = {}
): string {
  if (!url || !url.includes('supabase.co/storage')) {
    return url;
  }

  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    resize = 'cover',
  } = options;

  // Build transformation URL
  const urlObj = new URL(url);
  const params = new URLSearchParams();

  if (width) params.set('width', width.toString());
  if (height) params.set('height', height.toString());
  params.set('quality', quality.toString());
  params.set('format', format);
  params.set('resize', resize);

  urlObj.search = params.toString();
  return urlObj.toString();
}

/**
 * Generates srcset for responsive images
 */
export function generateResponsiveSrcSet(
  url: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  if (!url.includes('supabase.co/storage')) {
    return '';
  }

  return widths
    .map((width) => {
      const optimizedUrl = getOptimizedSupabaseImage(url, { width });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Get optimized avatar image
 */
export function getOptimizedAvatar(url: string, size: number = 160): string {
  return getOptimizedSupabaseImage(url, {
    width: size,
    height: size,
    quality: 85,
    format: 'webp',
    resize: 'cover',
  });
}

/**
 * Get optimized article thumbnail
 */
export function getOptimizedThumbnail(
  url: string,
  width: number = 400,
  height: number = 300
): string {
  return getOptimizedSupabaseImage(url, {
    width,
    height,
    quality: 80,
    format: 'webp',
    resize: 'cover',
  });
}

/**
 * Get optimized hero/featured image
 */
export function getOptimizedHeroImage(
  url: string,
  width: number = 1280
): string {
  return getOptimizedSupabaseImage(url, {
    width,
    quality: 85,
    format: 'webp',
  });
}

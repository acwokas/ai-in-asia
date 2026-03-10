/**
 * OG image specs for social sharing (WhatsApp, Facebook, LinkedIn, Twitter).
 * Always JPEG, 1200×630, ≤250 KB.
 */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
const OG_MAX_SIZE_BYTES = 250 * 1024; // 250 KB

/**
 * Convert any image File/Blob into a WhatsApp-friendly OG JPEG.
 * Returns a File named `{baseName}-og.jpg`, always ≤250 KB.
 */
export const compressForOG = async (
  source: File | Blob,
  baseName: string,
): Promise<File> => {
  const bitmap = await createImageBitmap(source);

  const canvas = document.createElement('canvas');
  canvas.width = OG_IMAGE_WIDTH;
  canvas.height = OG_IMAGE_HEIGHT;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill white background (replaces any transparency)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT);

  // Cover-fit: scale to fill 1200×630, center-crop any overflow
  const srcRatio = bitmap.width / bitmap.height;
  const dstRatio = OG_IMAGE_WIDTH / OG_IMAGE_HEIGHT;
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (srcRatio > dstRatio) {
    // Source is wider — crop sides
    sw = bitmap.height * dstRatio;
    sx = (bitmap.width - sw) / 2;
  } else {
    // Source is taller — crop top/bottom
    sh = bitmap.width / dstRatio;
    sy = (bitmap.height - sh) / 2;
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT);

  // Encode as JPEG, reducing quality until ≤250 KB
  let quality = 0.82;
  let blob: Blob | null = null;
  while (quality >= 0.3) {
    blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && blob.size <= OG_MAX_SIZE_BYTES) break;
    quality -= 0.08;
  }
  if (!blob) throw new Error('Failed to generate OG image');

  return new File([blob], `${baseName}-og.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
};

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    maxSizeMB = 1,
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Detect if image has transparency by checking file type
        const isPNG = file.type === 'image/png';
        const isGIF = file.type === 'image/gif';
        const isWebP = file.type === 'image/webp';
        const hasTransparency = isPNG || isGIF || isWebP;
        
        // For non-transparent formats, fill with white background
        if (!hasTransparency) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        // For transparent formats, don't fill - let transparency be preserved
        
        ctx.drawImage(img, 0, 0, width, height);

        // Use PNG for transparent images, JPEG for others
        const outputFormat = hasTransparency ? 'image/png' : 'image/jpeg';
        const fileExtension = hasTransparency ? '.png' : '.jpg';

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Check if compressed size is acceptable
            const sizeMB = blob.size / (1024 * 1024);
            
            if (sizeMB > maxSizeMB && quality > 0.3) {
              // Try again with lower quality
              const newQuality = Math.max(0.3, quality - 0.1);
              compressImage(file, { ...options, quality: newQuality })
                .then(resolve)
                .catch(reject);
              return;
            }

            // Create new file from blob, preserving original extension if PNG
            const newFileName = file.name.replace(/\.[^/.]+$/, fileExtension);
            const compressedFile = new File(
              [blob],
              newFileName,
              {
                type: outputFormat,
                lastModified: Date.now(),
              }
            );

            resolve(compressedFile);
          },
          outputFormat,
          hasTransparency ? 1 : quality // PNG uses lossless compression, so quality doesn't matter
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

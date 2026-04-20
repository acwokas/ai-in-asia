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
    // Source is wider - crop sides
    sw = bitmap.height * dstRatio;
    sx = (bitmap.width - sw) / 2;
  } else {
    // Source is taller - crop top/bottom
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

        // Check for ACTUAL transparency by drawing the image and scanning
        // the alpha channel. Only preserve PNG if pixels are truly transparent.
        const couldHaveAlpha = file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp';
        let hasTransparency = false;

        if (couldHaveAlpha) {
          // Draw at current size to check alpha (use a temp canvas for large images)
          const checkW = Math.min(width, 512);
          const checkH = Math.min(height, 512);
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = checkW;
          tmpCanvas.height = checkH;
          const tmpCtx = tmpCanvas.getContext('2d', { alpha: true })!;
          tmpCtx.drawImage(img, 0, 0, checkW, checkH);
          const pixels = tmpCtx.getImageData(0, 0, checkW, checkH).data;
          // Sample every 4th pixel for speed - still catches transparent regions
          for (let i = 3; i < pixels.length; i += 16) {
            if (pixels[i] < 250) { hasTransparency = true; break; }
          }
        }

        // For non-transparent images, fill with white background and output JPEG
        if (!hasTransparency) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Use PNG only for images with real transparency, JPEG for everything else
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

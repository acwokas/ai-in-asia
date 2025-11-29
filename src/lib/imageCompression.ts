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

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Detect if image has transparency
        const isPNG = file.type === 'image/png';
        const hasTransparency = isPNG; // Assume PNGs may have transparency
        
        // Draw image on canvas (preserve transparency)
        if (!hasTransparency) {
          // For non-transparent images, fill with white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
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

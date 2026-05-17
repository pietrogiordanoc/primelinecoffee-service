import imageCompression from 'browser-image-compression';
import type { OptimizedPhoto, PhotoOptimizationSettings } from '@/types';

const DEFAULT_SETTINGS: PhotoOptimizationSettings = {
  max_width: 1500,
  max_height: 1500,
  quality: 0.75,
  max_size_mb: 1,
};

/**
 * Optimize image file for web and email delivery
 */
export async function optimizeImage(
  file: File,
  settings: Partial<PhotoOptimizationSettings> = {}
): Promise<OptimizedPhoto> {
  const config = { ...DEFAULT_SETTINGS, ...settings };

  try {
    // Main image - WebP format for better compression
    const options = {
      maxSizeMB: 0.1, // 100KB max for main image
      maxWidthOrHeight: Math.max(config.max_width, config.max_height),
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.7,
    };

    const compressedFile = await imageCompression(file, options);
    
    // Create optimized image URL
    const url = URL.createObjectURL(compressedFile);
    
    // Generate thumbnail - super small
    const thumbnailOptions = {
      maxSizeMB: 0.02, // 20KB max for thumbnail
      maxWidthOrHeight: 200,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.6,
    };
    
    const thumbnailFile = await imageCompression(file, thumbnailOptions);
    const thumbnail = URL.createObjectURL(thumbnailFile);

    return {
      file: compressedFile,
      url,
      thumbnail,
      thumbnailFile,
      originalSize: file.size,
      optimizedSize: compressedFile.size,
    };
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw new Error('Failed to optimize image');
  }
}

/**
 * Optimize multiple images in batch
 */
export async function optimizeImages(
  files: File[],
  settings: Partial<PhotoOptimizationSettings> = {},
  onProgress?: (progress: number) => void
): Promise<OptimizedPhoto[]> {
  const optimized: OptimizedPhoto[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      const result = await optimizeImage(file, settings);
      optimized.push(result);
      
      if (onProgress) {
        onProgress(((i + 1) / files.length) * 100);
      }
    } catch (error) {
      console.error(`Failed to optimize ${file.name}:`, error);
    }
  }
  
  return optimized;
}

/**
 * Calculate total size of files
 */
export function calculateTotalSize(files: File[] | OptimizedPhoto[]): number {
  return files.reduce((total, file) => {
    if (file instanceof File) {
      return total + file.size;
    }
    return total + file.optimizedSize;
  }, 0);
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if total file size exceeds email attachment limit
 */
export function exceedsEmailLimit(
  files: File[] | OptimizedPhoto[],
  limitMB = 12
): boolean {
  const totalBytes = calculateTotalSize(files);
  const totalMB = totalBytes / (1024 * 1024);
  return totalMB > limitMB;
}

/**
 * Validate image file type
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  return validTypes.includes(file.type.toLowerCase());
}

/**
 * Convert File to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

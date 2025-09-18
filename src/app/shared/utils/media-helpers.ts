/**
 * Media Helper Utilities
 * 
 * This file contains utility functions for media processing, validation,
 * and optimization used by the Media Library Service.
 */

import { MediaValidationResult, MediaMetadata } from '../types/media';

/**
 * Aspect ratio validation result
 */
export interface AspectRatioValidation {
  isValid: boolean;
  actualRatio: number;
  expectedRatio: number;
  tolerance: number;
  message: string;
}

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
];

/**
 * Maximum file size for uploads (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum file size for thumbnails (1MB)
 */
export const MAX_THUMBNAIL_SIZE = 1024 * 1024;

/**
 * Default thumbnail dimensions
 */
export const THUMBNAIL_DIMENSIONS = {
  width: 200,
  height: 200
};

/**
 * Minimum aspect ratio for landscape images (width > height)
 */
export const MIN_LANDSCAPE_RATIO = 1.0; // width must be greater than height

/**
 * Recommended aspect ratio for specials media (16:9)
 */
export const RECOMMENDED_ASPECT_RATIO = 16 / 9; // 1.777...

/**
 * Validates a file for upload to the media library
 * @param file The file to validate
 * @param validateAspectRatio Whether to validate aspect ratio (default: false)
 * @returns Promise resolving to validation result with errors and warnings
 */
export async function validateMediaFile(file: File, validateAspectRatio: boolean = false): Promise<MediaValidationResult> {
  const result: MediaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    optimizations: []
  };

  // Check file type
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    result.isValid = false;
    result.errors.push(`Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    result.isValid = false;
    result.errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)})`);
  } else if (file.size > MAX_THUMBNAIL_SIZE) {
    result.warnings.push(`Large file size (${formatFileSize(file.size)}). Consider optimizing for better performance.`);
    result.optimizations.push('Consider compressing the image to reduce file size');
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    result.isValid = false;
    result.errors.push('File must have a valid name');
  }

  // Check for special characters in filename
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(file.name)) {
    result.warnings.push('Filename contains special characters that may cause issues');
    result.optimizations.push('Consider renaming the file to remove special characters');
  }

  // Validate aspect ratio if requested and file is an image
  if (validateAspectRatio && file.type.startsWith('image/')) {
    try {
      const aspectRatioValidation = await validateImageAspectRatio(file);
      if (!aspectRatioValidation.isValid) {
        result.isValid = false;
        result.errors.push(aspectRatioValidation.message);
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push('Failed to validate image aspect ratio');
    }
  }

  return result;
}

/**
 * Extracts metadata from an image file
 * @param file The image file to analyze
 * @returns Promise resolving to image metadata
 */
export function extractImageMetadata(file: File): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const metadata: MediaMetadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        format: file.type.split('/')[1]?.toUpperCase(),
        quality: 100
      };

      resolve(metadata);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for metadata extraction'));
    };

    img.src = url;
  });
}

/**
 * Generates a thumbnail from an image file
 * @param file The image file to create thumbnail from
 * @param maxWidth Maximum width for thumbnail
 * @param maxHeight Maximum height for thumbnail
 * @param quality JPEG quality (0-100)
 * @returns Promise resolving to thumbnail blob
 */
export function generateThumbnail(
  file: File,
  maxWidth: number = THUMBNAIL_DIMENSIONS.width,
  maxHeight: number = THUMBNAIL_DIMENSIONS.height,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate thumbnail dimensions while maintaining aspect ratio
      const { width, height } = calculateThumbnailDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxWidth,
        maxHeight
      );

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw image on canvas with new dimensions
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnail generation'));
    };

    img.src = url;
  });
}

/**
 * Calculates thumbnail dimensions while maintaining aspect ratio
 * @param originalWidth Original image width
 * @param originalHeight Original image height
 * @param maxWidth Maximum allowed width
 * @param maxHeight Maximum allowed height
 * @returns Object with calculated width and height
 */
export function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = maxWidth;
  let height = maxWidth / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * Formats file size in human-readable format
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates a unique filename for storage
 * @param originalName Original filename
 * @param userId User ID for organization
 * @returns Unique filename
 */
export function generateUniqueFileName(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || 'jpg';
  
  return `${userId}_${timestamp}_${randomString}.${extension}`;
}

/**
 * Generates a thumbnail filename
 * @param originalFileName Original filename
 * @returns Thumbnail filename
 */
export function generateThumbnailFileName(originalFileName: string): string {
  const nameWithoutExt = originalFileName.split('.').slice(0, -1).join('.');
  const extension = originalFileName.split('.').pop() || 'jpg';
  
  return `${nameWithoutExt}_thumb.${extension}`;
}

/**
 * Checks if a file is an image
 * @param file The file to check
 * @returns True if the file is an image
 */
export function isImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Optimizes image quality based on file size
 * @param fileSize Current file size in bytes
 * @returns Suggested JPEG quality (0-100)
 */
export function getOptimalQuality(fileSize: number): number {
  if (fileSize > 5 * 1024 * 1024) return 0.6; // > 5MB
  if (fileSize > 2 * 1024 * 1024) return 0.7; // > 2MB
  if (fileSize > 1024 * 1024) return 0.8;     // > 1MB
  return 0.9; // < 1MB
}

/**
 * Sanitizes a filename for safe storage
 * @param filename Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .replace(/_{2,}/g, '_')        // Replace multiple underscores with single
    .toLowerCase();                 // Convert to lowercase
}

/**
 * Validates image aspect ratio for specials media (must be landscape)
 * @param file The image file to validate
 * @returns Promise resolving to aspect ratio validation result
 */
export function validateImageAspectRatio(file: File): Promise<AspectRatioValidation> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const actualRatio = img.width / img.height;
      const minLandscapeRatio = MIN_LANDSCAPE_RATIO;
      
      // Check if image is landscape (width > height)
      const isValid = actualRatio > minLandscapeRatio;
      
      let message = '';
      if (!isValid) {
        if (actualRatio === 1.0) {
          message = `Image must be landscape (wider than tall). Current: ${img.width}x${img.height} (square). Please use a landscape image.`;
        } else {
          message = `Image must be landscape (wider than tall). Current: ${img.width}x${img.height} (portrait). Please use a landscape image.`;
        }
      }
      
      resolve({
        isValid,
        actualRatio,
        expectedRatio: minLandscapeRatio,
        tolerance: 0, // No tolerance needed for landscape check
        message
      });
    };
    
    img.onerror = () => {
      resolve({
        isValid: false,
        actualRatio: 0,
        expectedRatio: MIN_LANDSCAPE_RATIO,
        tolerance: 0,
        message: 'Unable to read image dimensions. Please ensure the file is a valid image.'
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Gets recommended dimensions for a given height to achieve 16:9 aspect ratio
 * @param currentHeight Current image height
 * @returns Object with recommended width and height
 */
export function getRecommendedDimensions(currentHeight: number): { width: number; height: number } {
  return {
    width: Math.round(currentHeight * RECOMMENDED_ASPECT_RATIO),
    height: currentHeight
  };
}

 
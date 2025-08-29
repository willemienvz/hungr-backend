/**
 * Media Library Types and Interfaces
 * 
 * This file contains all TypeScript interfaces and types for the Media Library Service.
 * These types define the structure for media items, usage tracking, and upload operations.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Represents a media item in the library with comprehensive metadata
 */
export interface MediaItem {
  /** Unique identifier for the media item */
  id: string;
  
  /** Generated filename for storage */
  fileName: string;
  
  /** Original filename from user upload */
  originalName: string;
  
  /** File size in bytes */
  fileSize: number;
  
  /** MIME type of the file */
  mimeType: string;
  
  /** Public URL for accessing the media file */
  url: string;
  
  /** Optional thumbnail URL for faster loading */
  thumbnailUrl?: string;
  
  /** Timestamp when the file was uploaded */
  uploadedAt: Date;
  
  /** User ID who uploaded the file */
  uploadedBy: string;
  
  /** Array of usage records tracking where this media is used */
  usage: MediaUsage[];
  
  /** Optional category for organization */
  category?: string;
  
  /** Optional description of the media item */
  description?: string;
  
  /** Whether the media is publicly accessible */
  isPublic: boolean;
  
  /** Additional metadata extracted from the image */
  metadata?: MediaMetadata;
}

/**
 * Metadata extracted from image files
 */
export interface MediaMetadata {
  /** Image width in pixels */
  width?: number;
  
  /** Image height in pixels */
  height?: number;
  
  /** Aspect ratio (width/height) */
  aspectRatio?: number;
  
  /** Color profile information */
  colorProfile?: string;
  
  /** Image format (JPEG, PNG, WebP, etc.) */
  format?: string;
  
  /** Compression quality if applicable */
  quality?: number;
}

/**
 * Tracks where a media item is being used across the application
 */
export interface MediaUsage {
  /** Type of component using the media */
  componentType: 'special' | 'branding' | 'menuItem' | 'other';
  
  /** Unique identifier of the component */
  componentId: string;
  
  /** Human-readable name of the component */
  componentName: string;
  
  /** When the media was first used in this component */
  usageDate: Date;
  
  /** Optional field name within the component (e.g., 'logo', 'image', 'background') */
  fieldName?: string;
}

/**
 * Request object for uploading new media
 */
export interface MediaUploadRequest {
  /** The file to upload */
  file: File;
  
  /** Optional category for organization */
  category?: string;
  
  /** Optional description of the media */
  description?: string;
  
  /** Whether the media should be publicly accessible */
  isPublic?: boolean;
  
  /** Type of component initiating the upload */
  componentType?: string;
  
  /** ID of the component initiating the upload */
  componentId?: string;

  /** Optional field name within the component (e.g., 'logo', 'image') */
  fieldName?: string;
}

/**
 * Response wrapper for media library operations
 */
export interface MediaLibraryResponse<T = MediaItem | MediaItem[]> {
  /** Whether the operation was successful */
  success: boolean;
  
  /** The data returned from the operation */
  data?: T;
  
  /** Error message if the operation failed */
  error?: string;
  
  /** Success message or additional information */
  message?: string;
}

/**
 * Filters for querying media items
 */
export interface MediaFilters {
  /** Filter by category */
  category?: string;
  
  /** Filter by component type */
  componentType?: string;
  
  /** Filter by upload date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Filter by file size range (in bytes) */
  fileSizeRange?: {
    min: number;
    max: number;
  };
  
  /** Filter by MIME type */
  mimeType?: string;
  
  /** Whether to include only public or private items */
  isPublic?: boolean;
  
  /** Search query for filename or description */
  searchQuery?: string;
  
  /** Pagination parameters */
  pagination?: {
    page: number;
    limit: number;
  };
}

/**
 * Analytics data for media library
 */
export interface MediaAnalytics {
  /** Total number of media items */
  totalItems: number;
  
  /** Total storage usage in bytes */
  totalStorageBytes: number;
  
  /** Storage usage by category */
  storageByCategory: Record<string, number>;
  
  /** Most used media items */
  mostUsedItems: Array<{
    mediaId: string;
    usageCount: number;
    lastUsed: Date;
  }>;
  
  /** Upload activity over time */
  uploadActivity: Array<{
    date: Date;
    count: number;
    totalSize: number;
  }>;
  
  /** File type distribution */
  fileTypeDistribution: Record<string, number>;
}

/**
 * Storage usage information
 */
export interface StorageUsage {
  /** Total storage used in bytes */
  totalBytes: number;
  
  /** Storage used by media type */
  byType: Record<string, number>;
  
  /** Storage used by user */
  byUser: Record<string, number>;
  
  /** Available storage quota */
  quotaBytes?: number;
  
  /** Percentage of quota used */
  quotaPercentage?: number;
}

/**
 * Media item for Firestore storage (with Timestamp instead of Date)
 */
export interface MediaDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
  usage: MediaUsageDocument[];
  category?: string;
  description?: string;
  isPublic: boolean;
  metadata?: MediaMetadata;
}

/**
 * Media usage document for Firestore storage
 */
export interface MediaUsageDocument {
  id: string;
  mediaId: string;
  componentType: string;
  componentId: string;
  componentName: string;
  usageDate: Timestamp;
  fieldName?: string;
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  /** Upload progress percentage (0-100) */
  progress: number;
  
  /** Current upload state */
  state: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  
  /** Current bytes uploaded */
  bytesTransferred: number;
  
  /** Total bytes to upload */
  totalBytes: number;
  
  /** Error message if upload failed */
  error?: string;
}

/**
 * Media validation result
 */
export interface MediaValidationResult {
  /** Whether the file is valid */
  isValid: boolean;
  
  /** Array of validation errors */
  errors: string[];
  
  /** Array of validation warnings */
  warnings: string[];
  
  /** Suggested optimizations */
  optimizations?: string[];
} 
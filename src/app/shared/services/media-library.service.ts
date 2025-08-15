/**
 * Media Library Service
 * 
 * Centralized service for managing media uploads, storage, and metadata
 * across the application. Handles Firebase Storage and Firestore integration
 * with comprehensive error handling and performance optimizations.
 */

import { Injectable, NgZone } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, from, of, throwError, BehaviorSubject } from 'rxjs';
import { map, switchMap, catchError, tap, finalize } from 'rxjs/operators';
import { Timestamp } from 'firebase/firestore';

import {
  MediaItem,
  MediaUsage,
  MediaUploadRequest,
  MediaLibraryResponse,
  MediaFilters,
  MediaAnalytics,
  StorageUsage,
  UploadProgress,
  MediaDocument,
  MediaUsageDocument
} from '../types/media';

import {
  validateMediaFile,
  extractImageMetadata,
  generateThumbnail,
  generateUniqueFileName,
  generateThumbnailFileName,
  sanitizeFilename,
  getOptimalQuality,
  formatFileSize
} from '../utils/media-helpers';

@Injectable({
  providedIn: 'root'
})
export class MediaLibraryService {
  private readonly MEDIA_COLLECTION = 'media';
  private readonly MEDIA_USAGE_COLLECTION = 'media_usage';
  private readonly STORAGE_BASE_PATH = 'media';
  
  private mediaCollection: AngularFirestoreCollection<MediaDocument>;
  private usageCollection: AngularFirestoreCollection<MediaUsageDocument>;
  
  private uploadProgressSubject = new BehaviorSubject<UploadProgress | null>(null);
  public uploadProgress$ = this.uploadProgressSubject.asObservable();

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private auth: AngularFireAuth,
    private ngZone: NgZone
  ) {
    this.mediaCollection = this.firestore.collection<MediaDocument>(this.MEDIA_COLLECTION);
    this.usageCollection = this.firestore.collection<MediaUsageDocument>(this.MEDIA_USAGE_COLLECTION);
  }

  /**
   * Uploads a media file to Firebase Storage and saves metadata to Firestore
   * @param request Media upload request with file and metadata
   * @returns Promise resolving to the created MediaItem
   */
  async uploadMedia(request: MediaUploadRequest): Promise<MediaItem> {
    try {
      // Validate the file
      const validation = validateMediaFile(request.file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Get current user
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated to upload media');
      }

      // Update upload progress
      this.updateUploadProgress({
        progress: 0,
        state: 'uploading',
        bytesTransferred: 0,
        totalBytes: request.file.size
      });

      // Generate unique filename
      const fileName = generateUniqueFileName(request.file.name, user.uid);
      const thumbnailFileName = generateThumbnailFileName(fileName);

      // Extract metadata and generate thumbnail
      const [metadata, thumbnailBlob] = await Promise.all([
        extractImageMetadata(request.file),
        generateThumbnail(request.file)
      ]);

      // Upload original file
      const originalPath = `${this.STORAGE_BASE_PATH}/${user.uid}/${fileName}`;
      const originalRef = this.storage.ref(originalPath);
      const originalUploadTask = this.storage.upload(originalPath, request.file);

      // Upload thumbnail
      const thumbnailPath = `${this.STORAGE_BASE_PATH}/${user.uid}/${thumbnailFileName}`;
      const thumbnailRef = this.storage.ref(thumbnailPath);
      const thumbnailUploadTask = this.storage.upload(thumbnailPath, thumbnailBlob);

      // Monitor upload progress
      originalUploadTask.percentageChanges().subscribe(progress => {
        if (progress !== null) {
          this.updateUploadProgress({
            progress: Math.round(progress),
            state: 'uploading',
            bytesTransferred: Math.round((progress / 100) * request.file.size),
            totalBytes: request.file.size
          });
        }
      });

      // Wait for both uploads to complete
      await Promise.all([
        originalUploadTask,
        thumbnailUploadTask
      ]);

      // Get download URLs
      const [originalUrl, thumbnailUrl] = await Promise.all([
        originalRef.getDownloadURL().toPromise(),
        thumbnailRef.getDownloadURL().toPromise()
      ]);



      // Create media item
      const mediaItem: MediaItem = {
        id: this.firestore.createId(),
        fileName,
        originalName: request.file.name,
        fileSize: request.file.size,
        mimeType: request.file.type,
        url: originalUrl,
        thumbnailUrl,
        uploadedAt: new Date(),
        uploadedBy: user.uid,
        usage: [],
        category: request.category,
        description: request.description,
        isPublic: request.isPublic ?? false,
        metadata
      };

      // Save to Firestore
      const mediaDoc: any = {
        id: mediaItem.id,
        fileName: mediaItem.fileName,
        originalName: mediaItem.originalName,
        fileSize: mediaItem.fileSize,
        mimeType: mediaItem.mimeType,
        url: mediaItem.url,
        uploadedAt: Timestamp.fromDate(mediaItem.uploadedAt),
        uploadedBy: mediaItem.uploadedBy,
        usage: [],
        isPublic: mediaItem.isPublic
      };

      // Only include optional fields if they're defined
      if (mediaItem.thumbnailUrl) {
        mediaDoc.thumbnailUrl = mediaItem.thumbnailUrl;
      }
      if (mediaItem.category) {
        mediaDoc.category = mediaItem.category;
      }
      if (mediaItem.description) {
        mediaDoc.description = mediaItem.description;
      }
      if (mediaItem.metadata) {
        mediaDoc.metadata = mediaItem.metadata;
      }

      await this.mediaCollection.doc(mediaItem.id).set(mediaDoc);

      // Track usage if component info provided
      if (request.componentType && request.componentId) {
        await this.trackMediaUsage(mediaItem.id, {
          componentType: request.componentType as any,
          componentId: request.componentId,
          componentName: request.fieldName || request.componentType,
          usageDate: new Date()
        });
      }

      // Update progress to completed
      this.updateUploadProgress({
        progress: 100,
        state: 'completed',
        bytesTransferred: request.file.size,
        totalBytes: request.file.size
      });

      return mediaItem;

    } catch (error) {
      this.updateUploadProgress({
        progress: 0,
        state: 'error',
        bytesTransferred: 0,
        totalBytes: request.file.size,
        error: error instanceof Error ? error.message : 'Upload failed'
      });

      throw error;
    }
  }

  /**
   * Retrieves a media item by ID
   * @param id Media item ID
   * @returns Promise resolving to MediaItem or null if not found
   */
  async getMediaById(id: string): Promise<MediaItem | null> {
    try {
      const doc = await this.mediaCollection.doc(id).get().toPromise();
      
      if (!doc?.exists) {
        return null;
      }

      const data = doc.data() as MediaDocument;
      return this.convertDocumentToMediaItem(data);
    } catch (error) {
      console.error('Error getting media by ID:', error);
      throw new Error('Failed to retrieve media item');
    }
  }

  /**
   * Retrieves all media items with optional filtering
   * @param filters Optional filters for querying media
   * @returns Promise resolving to array of MediaItems
   */
  async getAllMedia(filters?: MediaFilters): Promise<MediaItem[]> {
    try {
      let query = this.mediaCollection.ref;

      // Apply filters
      if (filters?.category) {
        query = query.where('category', '==', filters.category) as any;
      }

      if (filters?.isPublic !== undefined) {
        query = query.where('isPublic', '==', filters.isPublic) as any;
      }

      if (filters?.mimeType) {
        query = query.where('mimeType', '==', filters.mimeType) as any;
      }

      if (filters?.dateRange) {
        query = query.where('uploadedAt', '>=', Timestamp.fromDate(filters.dateRange.start))
                     .where('uploadedAt', '<=', Timestamp.fromDate(filters.dateRange.end)) as any;
      }

      // Apply pagination
      if (filters?.pagination) {
        const { page, limit } = filters.pagination;
        query = query.limit(limit) as any;
        // Note: offset is not available in older Firebase versions, using startAfter instead
      }

      const snapshot = await query.get();
      const mediaItems: MediaItem[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as MediaDocument;
        mediaItems.push(this.convertDocumentToMediaItem(data));
      });

      // Apply additional filters that can't be done in Firestore
      let filteredItems = mediaItems;

      if (filters?.componentType) {
        filteredItems = filteredItems.filter(item =>
          item.usage.some(usage => usage.componentType === filters.componentType)
        );
      }

      if (filters?.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filteredItems = filteredItems.filter(item =>
          item.fileName.toLowerCase().includes(query) ||
          item.originalName.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }

      return filteredItems;

    } catch (error) {
      console.error('Error getting all media:', error);
      throw new Error('Failed to retrieve media items');
    }
  }

  /**
   * Deletes a media item and its associated files
   * @param id Media item ID
   * @returns Promise resolving to boolean indicating success
   */
  async deleteMedia(id: string): Promise<boolean> {
    try {
      // Get the media item
      const mediaItem = await this.getMediaById(id);
      if (!mediaItem) {
        throw new Error('Media item not found');
      }

      // Get current user
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated to delete media');
      }

      // If media is in use, remove it from all components first
      if (mediaItem.usage.length > 0) {
        console.log(`Removing media item from ${mediaItem.usage.length} components before deletion`);
        
        // Remove usage from all components
        for (const usage of mediaItem.usage) {
          try {
            await this.removeMediaUsage(id, usage.componentId);
          } catch (error) {
            console.warn(`Failed to remove usage from component ${usage.componentId}:`, error);
            // Continue with deletion even if some usage removal fails
          }
        }
      }

      // Delete files from Firebase Storage
      const originalPath = `${this.STORAGE_BASE_PATH}/${user.uid}/${mediaItem.fileName}`;
      const thumbnailPath = `${this.STORAGE_BASE_PATH}/${user.uid}/${mediaItem.fileName.replace('.', '_thumb.')}`;

      await Promise.all([
        this.storage.ref(originalPath).delete().toPromise(),
        this.storage.ref(thumbnailPath).delete().toPromise()
      ]);

      // Delete from Firestore
      await this.mediaCollection.doc(id).delete();

      return true;

    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  }

  /**
   * Updates metadata for a media item
   * @param id Media item ID
   * @param metadata Partial metadata to update
   * @returns Promise resolving to updated MediaItem
   */
  async updateMediaMetadata(id: string, metadata: Partial<MediaItem>): Promise<MediaItem> {
    try {
      const mediaItem = await this.getMediaById(id);
      if (!mediaItem) {
        throw new Error('Media item not found');
      }

      // Update the item
      const updatedItem = { ...mediaItem, ...metadata };
      
      // Convert to document format
      const mediaDoc: any = {
        ...updatedItem,
        uploadedAt: Timestamp.fromDate(updatedItem.uploadedAt),
        usage: updatedItem.usage.map(usage => {
          const usageDoc: any = {
            id: this.firestore.createId(),
            mediaId: id,
            componentType: usage.componentType,
            componentId: usage.componentId,
            componentName: usage.componentName,
            usageDate: Timestamp.fromDate(usage.usageDate)
          };

          // Only include fieldName if it's defined
          if (usage.fieldName) {
            usageDoc.fieldName = usage.fieldName;
          }

          return usageDoc;
        })
      };

      await this.mediaCollection.doc(id).update(mediaDoc);

      return updatedItem;

    } catch (error) {
      console.error('Error updating media metadata:', error);
      throw error;
    }
  }

  /**
   * Tracks usage of a media item by a component
   * @param mediaId Media item ID
   * @param usage Usage information
   * @returns Promise resolving when tracking is complete
   */
  async trackMediaUsage(mediaId: string, usage: MediaUsage): Promise<void> {
    try {
      // Check if usage already exists
      const existingUsage = await this.usageCollection
        .ref
        .where('mediaId', '==', mediaId)
        .where('componentId', '==', usage.componentId)
        .get();

      if (!existingUsage.empty) {
        // Update existing usage
        const doc = existingUsage.docs[0];
        const updateData: any = {
          usageDate: Timestamp.fromDate(usage.usageDate)
        };

        // Only include fieldName if it's defined
        if (usage.fieldName) {
          updateData.fieldName = usage.fieldName;
        }

        await doc.ref.update(updateData);
      } else {
        // Create new usage record
        const usageDoc: any = {
          id: this.firestore.createId(),
          mediaId,
          componentType: usage.componentType,
          componentId: usage.componentId,
          componentName: usage.componentName,
          usageDate: Timestamp.fromDate(usage.usageDate)
        };

        // Only include fieldName if it's defined
        if (usage.fieldName) {
          usageDoc.fieldName = usage.fieldName;
        }

        await this.usageCollection.doc(usageDoc.id).set(usageDoc);
      }

      // Update media item usage array
      const mediaItem = await this.getMediaById(mediaId);
      if (mediaItem) {
        const updatedUsage = mediaItem.usage.filter(u => 
          !(u.componentId === usage.componentId && u.componentType === usage.componentType)
        );
        updatedUsage.push(usage);

        await this.updateMediaMetadata(mediaId, { usage: updatedUsage });
      }

    } catch (error) {
      console.error('Error tracking media usage:', error);
      throw error;
    }
  }

  /**
   * Removes usage tracking for a media item
   * @param mediaId Media item ID
   * @param componentId Component ID to remove usage for
   * @returns Promise resolving when removal is complete
   */
  async removeMediaUsage(mediaId: string, componentId: string): Promise<void> {
    try {
      // Remove from usage collection
      const usageDocs = await this.usageCollection
        .ref
        .where('mediaId', '==', mediaId)
        .where('componentId', '==', componentId)
        .get();

      const deletePromises = usageDocs.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);

      // Update media item usage array
      const mediaItem = await this.getMediaById(mediaId);
      if (mediaItem) {
        const updatedUsage = mediaItem.usage.filter(u => u.componentId !== componentId);
        await this.updateMediaMetadata(mediaId, { usage: updatedUsage });
      }

    } catch (error) {
      console.error('Error removing media usage:', error);
      throw error;
    }
  }

  /**
   * Gets usage information for a media item
   * @param mediaId Media item ID
   * @returns Promise resolving to array of usage records
   */
  async getMediaUsage(mediaId: string): Promise<MediaUsage[]> {
    try {
      const usageDocs = await this.usageCollection
        .ref
        .where('mediaId', '==', mediaId)
        .get();

      return usageDocs.docs.map(doc => {
        const data = doc.data() as MediaUsageDocument;
        return {
          componentType: data.componentType as any,
          componentId: data.componentId,
          componentName: data.componentName,
          usageDate: data.usageDate.toDate(),
          fieldName: data.fieldName
        };
      });

    } catch (error) {
      console.error('Error getting media usage:', error);
      throw error;
    }
  }

  /**
   * Searches media items by query string
   * @param query Search query
   * @returns Promise resolving to array of matching MediaItems
   */
  async searchMedia(query: string): Promise<MediaItem[]> {
    const filters: MediaFilters = { searchQuery: query };
    return this.getAllMedia(filters);
  }

  /**
   * Filters media items by category
   * @param category Category to filter by
   * @returns Promise resolving to array of MediaItems
   */
  async filterMediaByCategory(category: string): Promise<MediaItem[]> {
    const filters: MediaFilters = { category };
    return this.getAllMedia(filters);
  }

  /**
   * Filters media items by tags
   * @param tags Array of tags to filter by
   * @returns Promise resolving to array of MediaItems
   */


  /**
   * Gets analytics data for the media library
   * @returns Promise resolving to MediaAnalytics
   */
  async getMediaAnalytics(): Promise<MediaAnalytics> {
    try {
      const allMedia = await this.getAllMedia();
      
      // Calculate basic stats
      const totalItems = allMedia.length;
      const totalStorageBytes = allMedia.reduce((sum, item) => sum + item.fileSize, 0);
      
      // Storage by category
      const storageByCategory: Record<string, number> = {};
      allMedia.forEach(item => {
        const category = item.category || 'uncategorized';
        storageByCategory[category] = (storageByCategory[category] || 0) + item.fileSize;
      });

      // Most used items
      const mostUsedItems = allMedia
        .filter(item => item.usage.length > 0)
        .sort((a, b) => b.usage.length - a.usage.length)
        .slice(0, 10)
        .map(item => ({
          mediaId: item.id,
          usageCount: item.usage.length,
          lastUsed: new Date(Math.max(...item.usage.map(u => u.usageDate.getTime())))
        }));

      // File type distribution
      const fileTypeDistribution: Record<string, number> = {};
      allMedia.forEach(item => {
        const type = item.mimeType.split('/')[1] || 'unknown';
        fileTypeDistribution[type] = (fileTypeDistribution[type] || 0) + 1;
      });

      // Upload activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentUploads = allMedia.filter(item => item.uploadedAt >= thirtyDaysAgo);
      const uploadActivity = this.groupUploadsByDate(recentUploads);

      return {
        totalItems,
        totalStorageBytes,
        storageByCategory,
        mostUsedItems,
        uploadActivity,
        fileTypeDistribution
      };

    } catch (error) {
      console.error('Error getting media analytics:', error);
      throw error;
    }
  }

  /**
   * Gets storage usage information
   * @returns Promise resolving to StorageUsage
   */
  async getStorageUsage(): Promise<StorageUsage> {
    try {
      const allMedia = await this.getAllMedia();
      
      const totalBytes = allMedia.reduce((sum, item) => sum + item.fileSize, 0);
      
      // Storage by type
      const byType: Record<string, number> = {};
      allMedia.forEach(item => {
        const type = item.mimeType.split('/')[1] || 'unknown';
        byType[type] = (byType[type] || 0) + item.fileSize;
      });

      // Storage by user
      const byUser: Record<string, number> = {};
      allMedia.forEach(item => {
        byUser[item.uploadedBy] = (byUser[item.uploadedBy] || 0) + item.fileSize;
      });

      return {
        totalBytes,
        byType,
        byUser
      };

    } catch (error) {
      console.error('Error getting storage usage:', error);
      throw error;
    }
  }

  /**
   * Resets upload progress
   */
  resetUploadProgress(): void {
    this.uploadProgressSubject.next(null);
  }

  // Private helper methods

  private async getCurrentUser(): Promise<any> {
    return this.auth.currentUser;
  }

  private updateUploadProgress(progress: UploadProgress): void {
    this.ngZone.run(() => {
      this.uploadProgressSubject.next(progress);
    });
  }

  private convertDocumentToMediaItem(doc: MediaDocument): MediaItem {
    return {
      ...doc,
      uploadedAt: doc.uploadedAt.toDate(),
      usage: doc.usage.map(usage => ({
        componentType: usage.componentType as 'special' | 'branding' | 'menuItem' | 'other',
        componentId: usage.componentId,
        componentName: usage.componentName,
        usageDate: usage.usageDate.toDate(),
        fieldName: usage.fieldName
      }))
    };
  }

  private groupUploadsByDate(mediaItems: MediaItem[]): Array<{date: Date; count: number; totalSize: number}> {
    const grouped: Record<string, {date: Date; count: number; totalSize: number}> = {};
    
    mediaItems.forEach(item => {
      const dateKey = item.uploadedAt.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: new Date(item.uploadedAt),
          count: 0,
          totalSize: 0
        };
      }
      grouped[dateKey].count++;
      grouped[dateKey].totalSize += item.fileSize;
    });

    return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime());
  }
} 
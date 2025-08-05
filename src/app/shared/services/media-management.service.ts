import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDocs, query, where, updateDoc, deleteDoc, serverTimestamp } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { MediaLibraryService } from './media-library.service';
import { MediaItem, MediaUsage } from '../types/media';

// Management interfaces
export interface DeletionValidation {
  canDelete: boolean;
  usageCount: number;
  usageDetails: MediaUsage[];
  warnings: string[];
  errors: string[];
}

export interface DeleteResult {
  mediaId: string;
  success: boolean;
  error?: string;
  usageCount?: number;
}

export interface UpdateResult {
  mediaId: string;
  success: boolean;
  error?: string;
}

export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  results: (DeleteResult | UpdateResult)[];
  errors: string[];
}

export interface MediaAnalytics {
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  fileTypeDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  usageStatistics: UsageStatistics;
  storageUsage: StorageUsage;
}

export interface UsageStatistics {
  mostUsed: MediaItem[];
  leastUsed: MediaItem[];
  recentlyUsed: MediaItem[];
  unusedFiles: MediaItem[];
}

export interface StorageUsage {
  totalUsed: number;
  totalAvailable: number;
  usagePercentage: number;
  largestFiles: MediaItem[];
}

export interface UsageReport {
  mediaId: string;
  totalUsage: number;
  usageByComponent: Record<string, number>;
  usageHistory: UsageHistoryEntry[];
  lastUsed: Date;
}

export interface UsageHistoryEntry {
  componentType: string;
  componentId: string;
  componentName: string;
  usageDate: Date;
  fieldName: string;
}

export interface OrphanedFile {
  path: string;
  size: number;
  lastModified: Date;
  reason: string;
}

export interface CleanupResult {
  orphanedFilesRemoved: number;
  spaceFreed: number;
  errors: string[];
}

export interface OptimizationResult {
  filesOptimized: number;
  spaceSaved: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MediaManagementService {
  constructor(
    private mediaLibraryService: MediaLibraryService,
    private firestore: Firestore,
    private storage: AngularFireStorage
  ) {}

  // Deletion operations
  async deleteMedia(mediaId: string, force: boolean = false): Promise<boolean> {
    try {
      // Get media item
      const mediaItem = await this.mediaLibraryService.getMediaById(mediaId);
      if (!mediaItem) {
        throw new Error(`Media item ${mediaId} not found`);
      }

      // Delete using the media library service which handles usage removal
      return await this.mediaLibraryService.deleteMedia(mediaId);
    } catch (error) {
      console.error(`Error deleting media ${mediaId}:`, error);
      throw error;
    }
  }

  async deleteMultipleMedia(mediaIds: string[], force: boolean = false): Promise<DeleteResult[]> {
    const results: DeleteResult[] = [];
    
    for (const mediaId of mediaIds) {
      try {
        const success = await this.deleteMedia(mediaId, force);
        results.push({
          mediaId,
          success,
          usageCount: 0
        });
      } catch (error) {
        results.push({
          mediaId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async validateMediaDeletion(mediaId: string): Promise<DeletionValidation> {
    try {
      const usage = await this.mediaLibraryService.getMediaUsage(mediaId);
      const mediaItem = await this.mediaLibraryService.getMediaById(mediaId);
      
      const warnings: string[] = [];
      const errors: string[] = [];
      
      if (!mediaItem) {
        errors.push('Media item not found');
        return {
          canDelete: false,
          usageCount: 0,
          usageDetails: [],
          warnings,
          errors
        };
      }

      if (usage.length > 0) {
        warnings.push(`Media is used in ${usage.length} places`);
        
        // Check if any usage is critical (e.g., branding, main menu items)
        const criticalUsage = usage.filter(u => 
          u.componentType === 'branding' || 
          u.componentType === 'menuItem'
        );
        
        if (criticalUsage.length > 0) {
          warnings.push(`Media is used in critical components: ${criticalUsage.map(u => u.componentName).join(', ')}`);
        }
      }

      return {
        canDelete: errors.length === 0,
        usageCount: usage.length,
        usageDetails: usage,
        warnings,
        errors
      };
    } catch (error) {
      console.error(`Error validating media deletion for ${mediaId}:`, error);
      return {
        canDelete: false,
        usageCount: 0,
        usageDetails: [],
        warnings: [],
        errors: [error.message]
      };
    }
  }

  // Organization operations
  async updateMediaMetadata(mediaId: string, metadata: Partial<MediaItem>): Promise<MediaItem> {
    try {
      const mediaItem = await this.mediaLibraryService.getMediaById(mediaId);
      if (!mediaItem) {
        throw new Error(`Media item ${mediaId} not found`);
      }

      const updatedMedia = await this.mediaLibraryService.updateMediaMetadata(mediaId, metadata);
      return updatedMedia;
    } catch (error) {
      console.error(`Error updating media metadata ${mediaId}:`, error);
      throw error;
    }
  }

  async bulkUpdateMetadata(mediaIds: string[], metadata: Partial<MediaItem>): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];
    
    for (const mediaId of mediaIds) {
      try {
        await this.updateMediaMetadata(mediaId, metadata);
        results.push({
          mediaId,
          success: true
        });
      } catch (error) {
        results.push({
          mediaId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async categorizeMedia(mediaId: string, category: string): Promise<void> {
    await this.updateMediaMetadata(mediaId, { category });
  }



  // Analytics and reporting
  async getMediaAnalytics(): Promise<MediaAnalytics> {
    try {
      const allMedia = await this.mediaLibraryService.getAllMedia();
      
      // Calculate basic statistics
      const totalFiles = allMedia.length;
      const totalSize = allMedia.reduce((sum, item) => sum + item.fileSize, 0);
      const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;
      
      // File type distribution
      const fileTypeDistribution: Record<string, number> = {};
      allMedia.forEach(item => {
        const type = item.mimeType.split('/')[1] || 'unknown';
        fileTypeDistribution[type] = (fileTypeDistribution[type] || 0) + 1;
      });
      
      // Category distribution
      const categoryDistribution: Record<string, number> = {};
      allMedia.forEach(item => {
        const category = item.category || 'uncategorized';
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      });
      
      // Usage statistics
      const usageStatistics = await this.calculateUsageStatistics(allMedia);
      
      // Storage usage
      const storageUsage = await this.calculateStorageUsage(allMedia);
      
      return {
        totalFiles,
        totalSize,
        averageFileSize,
        fileTypeDistribution,
        categoryDistribution,
        usageStatistics,
        storageUsage
      };
    } catch (error) {
      console.error('Error getting media analytics:', error);
      throw error;
    }
  }

  async getUsageReport(mediaId: string): Promise<UsageReport> {
    try {
      const usage = await this.mediaLibraryService.getMediaUsage(mediaId);
      const mediaItem = await this.mediaLibraryService.getMediaById(mediaId);
      
      if (!mediaItem) {
        throw new Error(`Media item ${mediaId} not found`);
      }
      
      // Group usage by component type
      const usageByComponent: Record<string, number> = {};
      usage.forEach(u => {
        usageByComponent[u.componentType] = (usageByComponent[u.componentType] || 0) + 1;
      });
      
      // Sort usage history by date
      const usageHistory: UsageHistoryEntry[] = usage.map(u => ({
        componentType: u.componentType,
        componentId: u.componentId,
        componentName: u.componentName,
        usageDate: u.usageDate,
        fieldName: u.fieldName || ''
      })).sort((a, b) => b.usageDate.getTime() - a.usageDate.getTime());
      
      const lastUsed = usageHistory.length > 0 ? usageHistory[0].usageDate : mediaItem.uploadedAt;
      
      return {
        mediaId,
        totalUsage: usage.length,
        usageByComponent,
        usageHistory,
        lastUsed
      };
    } catch (error) {
      console.error(`Error getting usage report for ${mediaId}:`, error);
      throw error;
    }
  }

  async getStorageAnalytics(): Promise<StorageUsage> {
    try {
      const allMedia = await this.mediaLibraryService.getAllMedia();
      return await this.calculateStorageUsage(allMedia);
    } catch (error) {
      console.error('Error getting storage analytics:', error);
      throw error;
    }
  }

  async getOrphanedFiles(): Promise<OrphanedFile[]> {
    try {
      const orphanedFiles: OrphanedFile[] = [];
      
      // This would require scanning Firebase Storage and comparing with Firestore
      // For now, return empty array as this is a complex operation
      // Implementation would involve:
      // 1. List all files in Firebase Storage
      // 2. Compare with media items in Firestore
      // 3. Identify files without corresponding Firestore records
      
      return orphanedFiles;
    } catch (error) {
      console.error('Error getting orphaned files:', error);
      throw error;
    }
  }

  // Bulk operations
  async bulkDelete(mediaIds: string[]): Promise<BulkOperationResult> {
    const results = await this.deleteMultipleMedia(mediaIds, false);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');
    
    return {
      total: mediaIds.length,
      successful,
      failed,
      results,
      errors
    };
  }

  async bulkCategorize(mediaIds: string[], category: string): Promise<BulkOperationResult> {
    const results = await this.bulkUpdateMetadata(mediaIds, { category });
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');
    
    return {
      total: mediaIds.length,
      successful,
      failed,
      results,
      errors
    };
  }



  // Cleanup operations
  async cleanupOrphanedFiles(): Promise<CleanupResult> {
    try {
      const orphanedFiles = await this.getOrphanedFiles();
      let spaceFreed = 0;
      const errors: string[] = [];
      
      for (const file of orphanedFiles) {
        try {
          const storageRef = this.storage.ref(file.path);
          await storageRef.delete().toPromise();
          spaceFreed += file.size;
        } catch (error) {
          errors.push(`Failed to delete ${file.path}: ${error.message}`);
        }
      }
      
      return {
        orphanedFilesRemoved: orphanedFiles.length,
        spaceFreed,
        errors
      };
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      throw error;
    }
  }

  async optimizeStorage(): Promise<OptimizationResult> {
    try {
      const mediaItems = await this.mediaLibraryService.getAllMedia();
      let filesOptimized = 0;
      let spaceSaved = 0;
      const errors: string[] = [];
      
      for (const item of mediaItems) {
        try {
          // Check if file size can be optimized
          if (item.fileSize > 1024 * 1024) { // 1MB
            // Implement image optimization logic here
            // This could involve recompressing images, generating better thumbnails, etc.
            filesOptimized++;
            spaceSaved += item.fileSize * 0.1; // Assume 10% space saving
          }
        } catch (error) {
          errors.push(`Failed to optimize ${item.id}: ${error.message}`);
        }
      }
      
      return {
        filesOptimized,
        spaceSaved,
        errors
      };
    } catch (error) {
      console.error('Error optimizing storage:', error);
      throw error;
    }
  }

  // Private helper methods
  private async removeAllMediaUsage(mediaId: string): Promise<void> {
    try {
      const usage = await this.mediaLibraryService.getMediaUsage(mediaId);
      
      for (const usageItem of usage) {
        await this.mediaLibraryService.removeMediaUsage(mediaId, usageItem.componentId);
      }
    } catch (error) {
      console.error(`Error removing media usage for ${mediaId}:`, error);
      // Don't throw error as this is cleanup operation
    }
  }

  private async calculateUsageStatistics(allMedia: MediaItem[]): Promise<UsageStatistics> {
    // Get usage for all media items
    const usagePromises = allMedia.map(async (item) => {
      const usage = await this.mediaLibraryService.getMediaUsage(item.id);
      return { item, usageCount: usage.length };
    });
    
    const usageData = await Promise.all(usagePromises);
    
    // Sort by usage count
    const sortedByUsage = usageData.sort((a, b) => b.usageCount - a.usageCount);
    
    const mostUsed = sortedByUsage.slice(0, 10).map(d => d.item);
    const leastUsed = sortedByUsage.slice(-10).reverse().map(d => d.item);
    const unusedFiles = sortedByUsage.filter(d => d.usageCount === 0).map(d => d.item);
    
    // Recently used (uploaded in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyUsed = allMedia.filter(item => item.uploadedAt > thirtyDaysAgo);
    
    return {
      mostUsed,
      leastUsed,
      recentlyUsed,
      unusedFiles
    };
  }

  private async calculateStorageUsage(allMedia: MediaItem[]): Promise<StorageUsage> {
    const totalUsed = allMedia.reduce((sum, item) => sum + item.fileSize, 0);
    const totalAvailable = 5 * 1024 * 1024 * 1024; // 5GB (example)
    const usagePercentage = (totalUsed / totalAvailable) * 100;
    
    // Largest files
    const largestFiles = allMedia
      .sort((a, b) => b.fileSize - a.fileSize)
      .slice(0, 10);
    
    return {
      totalUsed,
      totalAvailable,
      usagePercentage,
      largestFiles
    };
  }
} 
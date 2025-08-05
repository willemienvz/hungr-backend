import { TestBed } from '@angular/core/testing';
import { MediaManagementService } from './media-management.service';
import { MediaLibraryService } from './media-library.service';
import { Firestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { MediaItem, MediaUsage } from '../types/media';

describe('MediaManagementService', () => {
  let service: MediaManagementService;
  let mediaLibraryServiceSpy: jasmine.SpyObj<MediaLibraryService>;
  let firestoreSpy: jasmine.SpyObj<Firestore>;
  let storageSpy: jasmine.SpyObj<AngularFireStorage>;

  const mockMediaItem: MediaItem = {
    id: 'test-id',
    fileName: 'test.jpg',
    originalName: 'test.jpg',
    fileSize: 1024,
    mimeType: 'image/jpeg',
    url: 'https://example.com/test.jpg',
    thumbnailUrl: 'https://example.com/test-thumb.jpg',
    uploadedAt: new Date(),
    uploadedBy: 'test-user',
    usage: [],
    tags: [],
    category: 'test',
    description: 'Test image',
    isPublic: true
  };

  const mockUsage: MediaUsage = {
    componentType: 'branding',
    componentId: 'branding-1',
    componentName: 'Test Branding',
    usageDate: new Date(),
    fieldName: 'logo'
  };

  beforeEach(() => {
    const mediaLibrarySpy = jasmine.createSpyObj('MediaLibraryService', [
      'getMediaById',
      'getAllMedia',
      'getMediaUsage',
      'updateMediaMetadata',
      'removeMediaUsage'
    ]);
    const firestoreSpyObj = jasmine.createSpyObj('Firestore', ['collection', 'doc']);
    const storageSpyObj = jasmine.createSpyObj('AngularFireStorage', ['ref']);

    TestBed.configureTestingModule({
      providers: [
        MediaManagementService,
        { provide: MediaLibraryService, useValue: mediaLibrarySpy },
        { provide: Firestore, useValue: firestoreSpyObj },
        { provide: AngularFireStorage, useValue: storageSpyObj }
      ]
    });

    service = TestBed.inject(MediaManagementService);
    mediaLibraryServiceSpy = TestBed.inject(MediaLibraryService) as jasmine.SpyObj<MediaLibraryService>;
    firestoreSpy = TestBed.inject(Firestore) as jasmine.SpyObj<Firestore>;
    storageSpy = TestBed.inject(AngularFireStorage) as jasmine.SpyObj<AngularFireStorage>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateMediaDeletion', () => {
    it('should return validation result for media deletion', async () => {
      mediaLibraryServiceSpy.getMediaUsage.and.returnValue(Promise.resolve([mockUsage]));
      mediaLibraryServiceSpy.getMediaById.and.returnValue(Promise.resolve(mockMediaItem));

      const result = await service.validateMediaDeletion('test-id');

      expect(result.canDelete).toBe(false);
      expect(result.usageCount).toBe(1);
      expect(result.usageDetails).toEqual([mockUsage]);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return canDelete true for unused media', async () => {
      mediaLibraryServiceSpy.getMediaUsage.and.returnValue(Promise.resolve([]));
      mediaLibraryServiceSpy.getMediaById.and.returnValue(Promise.resolve(mockMediaItem));

      const result = await service.validateMediaDeletion('test-id');

      expect(result.canDelete).toBe(true);
      expect(result.usageCount).toBe(0);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('updateMediaMetadata', () => {
    it('should update media metadata', async () => {
      const updatedMedia = { ...mockMediaItem, category: 'updated-category' };
      mediaLibraryServiceSpy.getMediaById.and.returnValue(Promise.resolve(mockMediaItem));
      mediaLibraryServiceSpy.updateMediaMetadata.and.returnValue(Promise.resolve(updatedMedia));

      const result = await service.updateMediaMetadata('test-id', { category: 'updated-category' });

      expect(result).toEqual(updatedMedia);
      expect(mediaLibraryServiceSpy.updateMediaMetadata).toHaveBeenCalledWith('test-id', { category: 'updated-category' });
    });
  });

  describe('bulkUpdateMetadata', () => {
    it('should update multiple media items metadata', async () => {
      const updatedMedia = { ...mockMediaItem, category: 'updated-category' };
      mediaLibraryServiceSpy.getMediaById.and.returnValue(Promise.resolve(mockMediaItem));
      mediaLibraryServiceSpy.updateMediaMetadata.and.returnValue(Promise.resolve(updatedMedia));

      const results = await service.bulkUpdateMetadata(['test-id-1', 'test-id-2'], { category: 'updated-category' });

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('getMediaAnalytics', () => {
    it('should return media analytics', async () => {
      const mockMediaItems = [mockMediaItem, { ...mockMediaItem, id: 'test-id-2' }];
      mediaLibraryServiceSpy.getAllMedia.and.returnValue(Promise.resolve(mockMediaItems));
      mediaLibraryServiceSpy.getMediaUsage.and.returnValue(Promise.resolve([]));

      const analytics = await service.getMediaAnalytics();

      expect(analytics.totalFiles).toBe(2);
      expect(analytics.totalSize).toBe(2048);
      expect(analytics.averageFileSize).toBe(1024);
      expect(analytics.fileTypeDistribution['jpeg']).toBe(2);
      expect(analytics.categoryDistribution['test']).toBe(2);
    });
  });

  describe('getUsageReport', () => {
    it('should return usage report for media item', async () => {
      mediaLibraryServiceSpy.getMediaUsage.and.returnValue(Promise.resolve([mockUsage]));
      mediaLibraryServiceSpy.getMediaById.and.returnValue(Promise.resolve(mockMediaItem));

      const report = await service.getUsageReport('test-id');

      expect(report.mediaId).toBe('test-id');
      expect(report.totalUsage).toBe(1);
      expect(report.usageByComponent['branding']).toBe(1);
      expect(report.usageHistory.length).toBe(1);
    });
  });

  describe('bulkDelete', () => {
    it('should perform bulk delete operation', async () => {
      // Mock the internal methods
      spyOn(service, 'deleteMultipleMedia').and.returnValue(Promise.resolve([
        { mediaId: 'test-id-1', success: true },
        { mediaId: 'test-id-2', success: false, error: 'Test error' }
      ]));

      const result = await service.bulkDelete(['test-id-1', 'test-id-2']);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });

  describe('bulkCategorize', () => {
    it('should perform bulk categorize operation', async () => {
      spyOn(service, 'bulkUpdateMetadata').and.returnValue(Promise.resolve([
        { mediaId: 'test-id-1', success: true },
        { mediaId: 'test-id-2', success: true }
      ]));

      const result = await service.bulkCategorize(['test-id-1', 'test-id-2'], 'new-category');

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('bulkTag', () => {
    it('should perform bulk tag operation', async () => {
      spyOn(service, 'bulkUpdateMetadata').and.returnValue(Promise.resolve([
        { mediaId: 'test-id-1', success: true },
        { mediaId: 'test-id-2', success: true }
      ]));

      const result = await service.bulkTag(['test-id-1', 'test-id-2'], ['tag1', 'tag2']);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('cleanupOrphanedFiles', () => {
    it('should return cleanup result', async () => {
      spyOn(service, 'getOrphanedFiles').and.returnValue(Promise.resolve([]));

      const result = await service.cleanupOrphanedFiles();

      expect(result.orphanedFilesRemoved).toBe(0);
      expect(result.spaceFreed).toBe(0);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('optimizeStorage', () => {
    it('should return optimization result', async () => {
      const mockMediaItems = [
        { ...mockMediaItem, fileSize: 2 * 1024 * 1024 }, // 2MB file
        { ...mockMediaItem, id: 'test-id-2', fileSize: 512 * 1024 } // 512KB file
      ];
      mediaLibraryServiceSpy.getAllMedia.and.returnValue(Promise.resolve(mockMediaItems));

      const result = await service.optimizeStorage();

      expect(result.filesOptimized).toBe(1);
      expect(result.spaceSaved).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('categorizeMedia', () => {
    it('should categorize media item', async () => {
      spyOn(service, 'updateMediaMetadata').and.returnValue(Promise.resolve(mockMediaItem));

      await service.categorizeMedia('test-id', 'new-category');

      expect(service.updateMediaMetadata).toHaveBeenCalledWith('test-id', { category: 'new-category' });
    });
  });

  describe('tagMedia', () => {
    it('should tag media item', async () => {
      spyOn(service, 'updateMediaMetadata').and.returnValue(Promise.resolve(mockMediaItem));

      await service.tagMedia('test-id', ['tag1', 'tag2']);

      expect(service.updateMediaMetadata).toHaveBeenCalledWith('test-id', { tags: ['tag1', 'tag2'] });
    });
  });

  describe('getStorageAnalytics', () => {
    it('should return storage analytics', async () => {
      const mockMediaItems = [mockMediaItem];
      mediaLibraryServiceSpy.getAllMedia.and.returnValue(Promise.resolve(mockMediaItems));

      const analytics = await service.getStorageAnalytics();

      expect(analytics.totalUsed).toBe(1024);
      expect(analytics.totalAvailable).toBe(5 * 1024 * 1024 * 1024);
      expect(analytics.usagePercentage).toBeGreaterThan(0);
      expect(analytics.largestFiles.length).toBe(1);
    });
  });
}); 
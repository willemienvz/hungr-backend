import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatDialogModule } from '@angular/material/dialog';
import { ToastrModule } from 'ngx-toastr';
import { of } from 'rxjs';

import { BrandingComponent } from './branding.component';
import { MediaUploadModalService } from '../../../shared/services/media-upload-modal.service';
import { MediaLibraryService } from '../../../shared/services/media-library.service';

describe('BrandingComponent', () => {
  let component: BrandingComponent;
  let fixture: ComponentFixture<BrandingComponent>;
  let mediaUploadModalService: jasmine.SpyObj<MediaUploadModalService>;
  let mediaLibraryService: jasmine.SpyObj<MediaLibraryService>;

  beforeEach(async () => {
    const mediaUploadModalSpy = jasmine.createSpyObj('MediaUploadModalService', ['openLogoUpload']);
    const mediaLibrarySpy = jasmine.createSpyObj('MediaLibraryService', ['trackMediaUsage', 'getMediaById']);

    await TestBed.configureTestingModule({
      declarations: [BrandingComponent],
      imports: [
        AngularFireModule.initializeApp({}),
        AngularFirestoreModule,
        AngularFireStorageModule,
        MatDialogModule,
        ToastrModule.forRoot()
      ],
      providers: [
        { provide: MediaUploadModalService, useValue: mediaUploadModalSpy },
        { provide: MediaLibraryService, useValue: mediaLibrarySpy }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BrandingComponent);
    component = fixture.componentInstance;
    mediaUploadModalService = TestBed.inject(MediaUploadModalService) as jasmine.SpyObj<MediaUploadModalService>;
    mediaLibraryService = TestBed.inject(MediaLibraryService) as jasmine.SpyObj<MediaLibraryService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Media Library Integration', () => {
    it('should open media upload modal when openImageUploadModal is called', () => {
      const mockDialogRef = { afterClosed: () => of(null) };
      mediaUploadModalService.openLogoUpload.and.returnValue(mockDialogRef as any);

      component.openImageUploadModal();

      expect(mediaUploadModalService.openLogoUpload).toHaveBeenCalledWith('branding');
    });

    it('should handle logo upload with media library integration', async () => {
      const mockMediaItem = {
        id: 'test-media-id',
        url: 'https://example.com/logo.png',
        fileName: 'logo.png',
        originalName: 'logo.png',
        fileSize: 1024,
        mimeType: 'image/png',
        uploadedAt: new Date(),
        uploadedBy: 'test-user',
        usage: [],
        tags: ['logo', 'branding'],
        category: 'branding',
        description: 'Company logo',
        isPublic: true
      };

      mediaLibraryService.trackMediaUsage.and.returnValue(Promise.resolve());

      // Use any to bypass private method access for testing
      await (component as any).onLogoUploaded(mockMediaItem);

      expect(component.imageUrl).toBe(mockMediaItem.url);
      expect(mediaLibraryService.trackMediaUsage).toHaveBeenCalledWith(mockMediaItem.id, {
        componentType: 'branding',
        componentId: 'logo',
        componentName: 'Branding',
        usageDate: jasmine.any(Date),
        fieldName: 'logo'
      });
    });

    it('should save logo with media library integration', async () => {
      const mockMediaItem = {
        id: 'test-media-id',
        url: 'https://example.com/logo.png',
        fileName: 'logo.png',
        originalName: 'logo.png',
        fileSize: 1024,
        mimeType: 'image/png',
        uploadedAt: new Date(),
        uploadedBy: 'test-user',
        usage: [],
        tags: [],
        category: 'branding',
        description: 'Logo',
        isPublic: true
      };

      component.OwnerID = 'test-owner';
      component.lastSavedDocId = 'test-doc-id';

      spyOn(component['firestore'].collection('branding').doc('test-doc-id'), 'update').and.returnValue(Promise.resolve() as any);

      await component.saveLogoWithMediaLibrary(mockMediaItem);

      expect(component['firestore'].collection('branding').doc('test-doc-id').update).toHaveBeenCalledWith({
        imageUrl: mockMediaItem.url,
        logoMediaId: mockMediaItem.id,
        parentID: 'test-owner'
      });
    });

    it('should remove logo with media library integration', async () => {
      component.OwnerID = 'test-owner';
      component.lastSavedDocId = 'test-doc-id';

      spyOn(component['firestore'].collection('branding').doc('test-doc-id'), 'update').and.returnValue(Promise.resolve() as any);

      await component.removeLogoWithMediaLibrary();

      expect(component.imageUrl).toBe('');
      expect(component['firestore'].collection('branding').doc('test-doc-id').update).toHaveBeenCalledWith({
        imageUrl: '',
        logoMediaId: null,
        parentID: 'test-owner'
      });
    });

    it('should load branding data with media library integration', async () => {
      const mockBrandingData = {
        logoMediaId: 'test-media-id',
        imageUrl: 'https://example.com/logo.png',
        backgroundColor: '#FFFFFF'
      };

      const mockMediaItem = {
        id: 'test-media-id',
        url: 'https://example.com/logo.png',
        fileName: 'logo.png',
        originalName: 'logo.png',
        fileSize: 1024,
        mimeType: 'image/png',
        uploadedAt: new Date(),
        uploadedBy: 'test-user',
        usage: [],
        tags: [],
        category: 'branding',
        description: 'Logo',
        isPublic: true
      };

      mediaLibraryService.getMediaById.and.returnValue(Promise.resolve(mockMediaItem));

      spyOn(component, 'loadBrandingSettings');
      spyOn(component, 'storeOriginalSettings');

      // Mock the Firestore query
      const mockQuerySnapshot = {
        empty: false,
        docs: [{
          id: 'test-doc-id',
          data: () => mockBrandingData
        }]
      };

      spyOn(component['firestore'].collection('branding'), 'get').and.returnValue({
        toPromise: () => Promise.resolve(mockQuerySnapshot)
      } as any);

      await component.fetchBrandingData();

      expect(mediaLibraryService.getMediaById).toHaveBeenCalledWith('test-media-id');
      expect(component.loadBrandingSettings).toHaveBeenCalledWith(jasmine.objectContaining({
        logoMediaId: 'test-media-id',
        logoMediaItem: mockMediaItem,
        imageUrl: 'https://example.com/logo.png'
      }));
    });

    it('should handle media library errors gracefully', async () => {
      const mockBrandingData = {
        logoMediaId: 'invalid-media-id',
        imageUrl: 'https://example.com/logo.png'
      };

      mediaLibraryService.getMediaById.and.returnValue(Promise.reject(new Error('Media not found')));

      spyOn(component, 'loadBrandingSettings');
      spyOn(console, 'warn');

      // Mock the Firestore query
      const mockQuerySnapshot = {
        empty: false,
        docs: [{
          id: 'test-doc-id',
          data: () => mockBrandingData
        }]
      };

      spyOn(component['firestore'].collection('branding'), 'get').and.returnValue({
        toPromise: () => Promise.resolve(mockQuerySnapshot)
      } as any);

      await component.fetchBrandingData();

      expect(console.warn).toHaveBeenCalledWith('Media item not found for branding logo:', jasmine.any(Error));
      expect(component.loadBrandingSettings).toHaveBeenCalledWith(jasmine.objectContaining({
        imageUrl: ''
      }));
    });
  });
});

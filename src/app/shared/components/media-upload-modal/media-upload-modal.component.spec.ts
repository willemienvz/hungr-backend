import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule, FormBuilder } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { MediaUploadModalComponent, MediaUploadModalConfig } from './media-upload-modal.component';
import { MediaLibraryService } from '../../services/media-library.service';
import { MediaItem } from '../../types/media';
import { FileSizePipe } from '../../pipes/file-size.pipe';

describe('MediaUploadModalComponent', () => {
  let component: MediaUploadModalComponent;
  let fixture: ComponentFixture<MediaUploadModalComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<MediaUploadModalComponent>>;
  let mockMediaLibraryService: jasmine.SpyObj<MediaLibraryService>;

  const mockMediaItem: MediaItem = {
    id: 'test-id',
    fileName: 'test-image.jpg',
    originalName: 'test-image.jpg',
    fileSize: 1024 * 1024,
    mimeType: 'image/jpeg',
    url: 'https://example.com/test-image.jpg',
    uploadedAt: new Date(),
    uploadedBy: 'test-user',
    usage: [],
    isPublic: true
  };

  const mockConfig: MediaUploadModalConfig = {
    componentType: 'test',
    componentId: 'test-id',
    fieldName: 'image',
    allowedTypes: ['image/png', 'image/jpeg'],
    maxFileSize: 5 * 1024 * 1024,
    allowMultiple: false,
    maxFiles: 1
  };

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockMediaLibraryService = jasmine.createSpyObj('MediaLibraryService', [
      'uploadMedia',
      'getAllMedia',
      'searchMedia',
      'uploadProgress$'
    ]);

    mockMediaLibraryService.uploadProgress$ = of(null);
    mockMediaLibraryService.getAllMedia.and.returnValue(Promise.resolve([mockMediaItem]));
    mockMediaLibraryService.searchMedia.and.returnValue(Promise.resolve([mockMediaItem]));

    await TestBed.configureTestingModule({
      declarations: [
        MediaUploadModalComponent,
        FileSizePipe
      ],
      imports: [
        ReactiveFormsModule,
        FormsModule,
        MatDialogModule,
        MatTabsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatChipsModule,
        MatIconModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatProgressBarModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockConfig },
        { provide: MediaLibraryService, useValue: mockMediaLibraryService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MediaUploadModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.activeTab).toBe(0);
    expect(component.selectedFile).toBeNull();
    expect(component.previewUrl).toBeNull();
    expect(component.uploading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.isDragOver).toBeFalse();
    expect(component.isLegacyMode).toBeFalse();
  });

  it('should load media library on init', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(mockMediaLibraryService.getAllMedia).toHaveBeenCalled();
    expect(component.mediaItems).toEqual([mockMediaItem]);
    
    // Clean up
    component.ngOnDestroy();
  }));

  it('should handle file selection', fakeAsync(() => {
    const mockFile = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
    const mockEvent = { target: { files: [mockFile] } };

    // Mock the validateImageDimensions method to return valid result
    spyOn(component as any, 'validateImageDimensions').and.returnValue(
      Promise.resolve({ valid: true })
    );

    // Mock FileReader
    const mockFileReader = {
      onload: null as any,
      readAsDataURL: jasmine.createSpy('readAsDataURL').and.callFake(() => {
        setTimeout(() => {
          mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });
        }, 0);
      })
    };
    spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

    component.onFileSelected(mockEvent as any);
    tick(100); // Wait for FileReader to complete

    expect(component.selectedFile).toEqual(mockFile);
    expect(component.previewUrl).toBeTruthy();
  }));

  it('should validate file type correctly', () => {
    const validFile = new File(['test'], 'test.png', { type: 'image/png' });
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    const validResult = component['validateFile'](validFile);
    const invalidResult = component['validateFile'](invalidFile);

    expect(validResult.valid).toBeTrue();
    expect(invalidResult.valid).toBeFalse();
    expect(invalidResult.error).toContain('Invalid file type');
  });

  it('should validate file size correctly', () => {
    const smallFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    // Temporarily set a small max file size for testing
    component.validationConfig.maxFileSize = 1024;

    const smallResult = component['validateFile'](smallFile);
    const largeResult = component['validateFile'](largeFile);

    expect(smallResult.valid).toBeTrue();
    expect(largeResult.valid).toBeFalse();
    expect(largeResult.error).toContain('File size too large');
  });

  it('should handle drag and drop events', () => {
    const mockDragEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
      dataTransfer: {
        files: [new File(['test'], 'test.jpg', { type: 'image/jpeg' })]
      }
    };

    component.onDragOver(mockDragEvent as any);
    expect(component.isDragOver).toBeTrue();

    component.onDragLeave(mockDragEvent as any);
    expect(component.isDragOver).toBeFalse();

    component.onFileDropped(mockDragEvent as any);
    expect(component.isDragOver).toBeFalse();
  });

  it('should handle file removal', () => {
    component.selectedFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    component.previewUrl = 'data:image/jpeg;base64,test';
    component.imageDimensions = { width: 100, height: 100 };

    component.removeFile();

    expect(component.selectedFile).toBeNull();
    expect(component.previewUrl).toBeNull();
    expect(component.imageDimensions).toBeNull();
    expect(component.error).toBeNull();
  });


  it('should handle category change', () => {
    const customCategoryControl = component.uploadForm.get('customCategory');
    
    // Initially disabled
    expect(customCategoryControl?.disabled).toBeTrue();

    // Enable when custom category is selected
    component.uploadForm.patchValue({ category: 'custom' });
    component.onCategoryChange();
    expect(customCategoryControl?.enabled).toBeTrue();

    // Disable when other category is selected
    component.uploadForm.patchValue({ category: 'Logos' });
    component.onCategoryChange();
    expect(customCategoryControl?.disabled).toBeTrue();
  });

  it('should search media library', fakeAsync(() => {
    // Initialize the component first
    component.ngOnInit();
    tick();
    
    // Reset the spy to clear previous calls
    mockMediaLibraryService.searchMedia.calls.reset();
    
    component.searchQuery = 'test';
    component.onSearchChange('test');
    tick(300); // Wait for debounce

    expect(mockMediaLibraryService.searchMedia).toHaveBeenCalledWith('test');
    expect(component.mediaItems).toEqual([mockMediaItem]);
  }));

  it('should select existing media', () => {
    component.selectExistingMedia(mockMediaItem);

    expect(component.selectedMediaItem).toEqual(mockMediaItem);
    expect(mockDialogRef.close).toHaveBeenCalledWith(mockMediaItem);
  });

  it('should upload media successfully', fakeAsync(() => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    component.selectedFile = mockFile;
    component.uploadForm.patchValue({
      category: 'Test',
      description: 'Test description'
    });

    mockMediaLibraryService.uploadMedia.and.returnValue(Promise.resolve(mockMediaItem));

    component.uploadMedia();
    tick();

    expect(mockMediaLibraryService.uploadMedia).toHaveBeenCalledWith({
      file: mockFile,
      category: 'Test',
      description: 'Test description',
      isPublic: true,
      componentType: 'test',
      componentId: 'test-id'
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith(mockMediaItem);
  }));

  it('should handle upload errors', fakeAsync(() => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    component.selectedFile = mockFile;
    component.uploadForm.patchValue({
      category: 'Test',
      description: ''
    });

    mockMediaLibraryService.uploadMedia.and.returnValue(Promise.reject(new Error('Upload failed')));

    component.uploadMedia();
    tick();

    expect(component.error).toBe('Upload failed');
    expect(component.uploading).toBeFalse();
  }));

  it('should close modal', () => {
    component.closeModal();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should handle legacy mode initialization', () => {
    const legacyData = {
      config: {
        title: 'Legacy Upload',
        formats: ['PNG', 'JPG'],
        maxFileSize: 500,
        dimensions: '150x50',
        allowedMimeTypes: ['image/png', 'image/jpeg'],
        allowMultiple: false,
        maxFiles: 1
      },
      currentImageUrl: 'https://example.com/existing.jpg'
    };

    // Create a new component instance with legacy data
    const legacyComponent = new MediaUploadModalComponent(
      mockDialogRef,
      legacyData,
      TestBed.inject(FormBuilder),
      mockMediaLibraryService
    );

    expect(legacyComponent.isLegacyMode).toBeTrue();
    expect(legacyComponent.existingImageUrls).toEqual(['https://example.com/existing.jpg']);
  });

  it('should handle legacy file processing', fakeAsync(() => {
    component.isLegacyMode = true;
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockEvent = { target: { files: [mockFile] } };

    // Mock FileReader
    const mockFileReader = {
      onload: null as any,
      readAsDataURL: jasmine.createSpy('readAsDataURL').and.callFake(() => {
        setTimeout(() => {
          mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test' } });
        }, 0);
      })
    };
    spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

    component.onFileSelected(mockEvent as any);
    tick(100); // Wait for FileReader to complete

    expect(component.selectedFiles).toContain(mockFile);
    expect(component.previewUrls.length).toBe(1);
  }));

  it('should handle legacy image removal', () => {
    component.isLegacyMode = true;
    component.selectedFiles = [new File(['test'], 'test.jpg', { type: 'image/jpeg' })];
    component.previewUrls = ['data:image/jpeg;base64,test'];
    component.existingImageUrls = ['https://example.com/existing.jpg'];

    component.onRemoveImage(0); // Remove new image
    expect(component.selectedFiles.length).toBe(0);
    expect(component.previewUrls.length).toBe(0);

    component.onRemoveImage(0); // Remove existing image
    expect(component.existingImageUrls.length).toBe(0);
  });

  it('should handle legacy save action', () => {
    component.isLegacyMode = true;
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    component.selectedFiles = [mockFile];
    component.existingImageUrls = ['https://example.com/existing.jpg'];

    component.onSave();

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      files: [mockFile],
      imageUrls: ['https://example.com/existing.jpg'],
      action: 'save'
    });
  });

  it('should compute format string correctly', () => {
    component.validationConfig.allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    expect(component.formatString).toBe('PNG / JPEG / WEBP');
  });

  it('should compute legacy properties correctly', () => {
    component.isLegacyMode = true;
    component.selectedFiles = [new File(['test'], 'test.jpg', { type: 'image/jpeg' })];
    component.previewUrls = ['data:image/jpeg;base64,test'];
    component.existingImageUrls = ['https://example.com/existing.jpg'];

    expect(component.hasImages).toBeTrue();
    expect(component.hasNewImages).toBeTrue();
    expect(component.allImages.length).toBe(2);
    expect(component.allImages[0].isNew).toBeTrue();
    expect(component.allImages[1].isNew).toBeFalse();
  });

  it('should handle dimension validation', fakeAsync(() => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    component.validationConfig.requiredDimensions = { width: 150, height: 50 };

    // Mock image dimensions
    spyOn(component as any, 'validateImageDimensions').and.returnValue(
      Promise.resolve({ valid: false, error: 'Dimensions must be 150x50px' })
    );

    component['processFile'](mockFile);
    tick();

    expect(component.error).toBe('Dimensions must be 150x50px');
  }));

  it('should handle search debouncing', fakeAsync(() => {
    // Initialize the component first
    component.ngOnInit();
    tick();
    
    // Reset the spy to clear previous calls
    mockMediaLibraryService.searchMedia.calls.reset();
    
    component.onSearchChange('test1');
    component.onSearchChange('test2');
    component.onSearchChange('test3');
    
    tick(100); // Before debounce time
    expect(mockMediaLibraryService.searchMedia).not.toHaveBeenCalled();
    
    tick(200); // After debounce time
    expect(mockMediaLibraryService.searchMedia).toHaveBeenCalledWith('test3');
  }));

  it('should cleanup on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  describe('Media Item Validation', () => {
    const validMediaItem: MediaItem = {
      id: 'valid-id',
      fileName: 'valid-image.jpg',
      originalName: 'valid-image.jpg',
      fileSize: 1024 * 1024, // 1MB
      mimeType: 'image/jpeg',
      url: 'https://example.com/valid-image.jpg',
      uploadedAt: new Date(),
      uploadedBy: 'test-user',
      usage: [],
      isPublic: true,
      metadata: {
        width: 150,
        height: 50
      }
    };

    const invalidMediaItem: MediaItem = {
      id: 'invalid-id',
      fileName: 'invalid-image.jpg',
      originalName: 'invalid-image.jpg',
      fileSize: 10 * 1024 * 1024, // 10MB
      mimeType: 'image/gif',
      url: 'https://example.com/invalid-image.jpg',
      uploadedAt: new Date(),
      uploadedBy: 'test-user',
      usage: [],
      isPublic: true,
      metadata: {
        width: 200,
        height: 100
      }
    };

    beforeEach(() => {
      component.validationConfig = {
        allowedTypes: ['image/png', 'image/jpeg'],
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxDimensions: { width: 1920, height: 1080 },
        minDimensions: { width: 100, height: 100 },
        requiredDimensions: { width: 150, height: 50 }
      };
    });

    it('should validate media item as valid when all criteria are met', () => {
      const result = component.isMediaItemValid(validMediaItem);
      expect(result).toBeTrue();
    });

    it('should validate media item as invalid when file type is not allowed', () => {
      const result = component.isMediaItemValid(invalidMediaItem);
      expect(result).toBeFalse();
    });

    it('should validate media item as invalid when file size exceeds limit', () => {
      const largeMediaItem = { ...validMediaItem, fileSize: 10 * 1024 * 1024 };
      const result = component.isMediaItemValid(largeMediaItem);
      expect(result).toBeFalse();
    });

    it('should validate media item as invalid when dimensions do not match required dimensions', () => {
      const wrongDimensionsMediaItem = { 
        ...validMediaItem, 
        metadata: { width: 200, height: 100 } 
      };
      const result = component.isMediaItemValid(wrongDimensionsMediaItem);
      expect(result).toBeFalse();
    });

    it('should validate media item as invalid when dimensions exceed maximum', () => {
      const oversizedMediaItem = { 
        ...validMediaItem, 
        metadata: { width: 2000, height: 1500 } 
      };
      const result = component.isMediaItemValid(oversizedMediaItem);
      expect(result).toBeFalse();
    });

    it('should return appropriate validation message for invalid file type', () => {
      const message = component.getValidationMessage(invalidMediaItem);
      expect(message).toContain('File type image/gif not allowed');
      expect(message).toContain('Allowed: image/png, image/jpeg');
    });

    it('should return appropriate validation message for file size', () => {
      const largeMediaItem = { ...validMediaItem, fileSize: 10 * 1024 * 1024 };
      const message = component.getValidationMessage(largeMediaItem);
      expect(message).toContain('File size 10.0MB exceeds maximum 5.0MB');
    });

    it('should return appropriate validation message for wrong dimensions', () => {
      const wrongDimensionsMediaItem = { 
        ...validMediaItem, 
        metadata: { width: 200, height: 100 } 
      };
      const message = component.getValidationMessage(wrongDimensionsMediaItem);
      expect(message).toContain('Dimensions 200x100px don\'t match required 150x50px');
    });

    it('should return appropriate validation message for oversized dimensions', () => {
      const oversizedMediaItem = { 
        ...validMediaItem, 
        metadata: { width: 2000, height: 1500 } 
      };
      const message = component.getValidationMessage(oversizedMediaItem);
      expect(message).toContain('Dimensions 2000x1500px exceed maximum 1920x1080px');
    });

    it('should return multiple validation messages for multiple issues', () => {
      const message = component.getValidationMessage(invalidMediaItem);
      expect(message).toContain('File type image/gif not allowed');
      expect(message).toContain('File size 10.0MB exceeds maximum 5.0MB');
      expect(message).toContain('Dimensions 200x100px don\'t match required 150x50px');
    });

    it('should handle media item without metadata gracefully', () => {
      const mediaItemWithoutMetadata = { ...validMediaItem, metadata: undefined };
      const result = component.isMediaItemValid(mediaItemWithoutMetadata);
      expect(result).toBeTrue(); // Should be valid if no dimension requirements
    });

    it('should handle validation config without required dimensions', () => {
      component.validationConfig.requiredDimensions = null;
      const wrongDimensionsMediaItem = { 
        ...validMediaItem, 
        metadata: { width: 200, height: 100 } 
      };
      const result = component.isMediaItemValid(wrongDimensionsMediaItem);
      expect(result).toBeTrue(); // Should be valid if no required dimensions
    });
  });

  describe('Media Selection with Validation', () => {
    const validMediaItem: MediaItem = {
      id: 'valid-id',
      fileName: 'valid-image.jpg',
      originalName: 'valid-image.jpg',
      fileSize: 1024 * 1024,
      mimeType: 'image/jpeg',
      url: 'https://example.com/valid-image.jpg',
      uploadedAt: new Date(),
      uploadedBy: 'test-user',
      usage: [],
      isPublic: true,
      metadata: { width: 150, height: 50 }
    };

    const invalidMediaItem: MediaItem = {
      id: 'invalid-id',
      fileName: 'invalid-image.jpg',
      originalName: 'invalid-image.jpg',
      fileSize: 10 * 1024 * 1024,
      mimeType: 'image/gif',
      url: 'https://example.com/invalid-image.jpg',
      uploadedAt: new Date(),
      uploadedBy: 'test-user',
      usage: [],
      isPublic: true,
      metadata: { width: 200, height: 100 }
    };

    beforeEach(() => {
      component.validationConfig = {
        allowedTypes: ['image/png', 'image/jpeg'],
        maxFileSize: 5 * 1024 * 1024,
        maxDimensions: { width: 1920, height: 1080 },
        minDimensions: { width: 100, height: 100 },
        requiredDimensions: { width: 150, height: 50 }
      };
    });

    it('should select valid media item and close dialog', () => {
      component.selectExistingMedia(validMediaItem);
      
      expect(component.selectedMediaItem).toEqual(validMediaItem);
      expect(component.error).toBeNull();
      expect(mockDialogRef.close).toHaveBeenCalledWith(validMediaItem);
    });

    it('should not select invalid media item and show error', () => {
      component.selectExistingMedia(invalidMediaItem);
      
      expect(component.selectedMediaItem).toBeNull();
      expect(component.error).toContain('This media item doesn\'t meet the current requirements');
      expect(component.error).toContain('File type image/gif not allowed');
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should clear previous error when selecting valid media after invalid', () => {
      // First select invalid media
      component.selectExistingMedia(invalidMediaItem);
      expect(component.error).toBeTruthy();
      
      // Then select valid media
      component.selectExistingMedia(validMediaItem);
      expect(component.error).toBeNull();
      expect(mockDialogRef.close).toHaveBeenCalledWith(validMediaItem);
    });
  });
}); 
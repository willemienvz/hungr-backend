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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    tags: ['test'],
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
        MatProgressSpinnerModule,
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

  it('should handle tag addition and removal', () => {
    const mockChipInputEvent = {
      value: 'new-tag',
      chipInput: { clear: jasmine.createSpy('clear') }
    };

    component.addTag(mockChipInputEvent as any);
    expect(component.uploadForm.get('tags')?.value).toContain('new-tag');

    component.removeTag('new-tag');
    expect(component.uploadForm.get('tags')?.value).not.toContain('new-tag');
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
      tags: ['test'],
      description: 'Test description',
      isPublic: true
    });

    mockMediaLibraryService.uploadMedia.and.returnValue(Promise.resolve(mockMediaItem));

    component.uploadMedia();
    tick();

    expect(mockMediaLibraryService.uploadMedia).toHaveBeenCalledWith({
      file: mockFile,
      category: 'Test',
      tags: ['test'],
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
      tags: [],
      description: '',
      isPublic: true
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
}); 
import { Component, Inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MediaLibraryService } from '../../services/media-library.service';
import { MediaItem, MediaUploadRequest, MediaFilters } from '../../types/media';

// Enhanced validation interfaces
export interface ImageValidationConfig {
  allowedTypes: string[];
  maxFileSize: number;
  maxDimensions: { width: number; height: number };
  minDimensions: { width: number; height: number };
  requiredDimensions?: { width: number; height: number } | null;
  maxFiles?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

// Enhanced modal configuration
export interface MediaUploadModalConfig {
  componentType?: string;
  componentId?: string;
  fieldName?: string;
  existingMediaUrl?: string;
  allowedTypes?: string[];
  maxFileSize?: number;
  requiredDimensions?: { width: number; height: number } | null;
  maxDimensions?: { width: number; height: number };
  minDimensions?: { width: number; height: number };
  allowMultiple?: boolean;
  maxFiles?: number;
  required?: boolean;
}

// Backward compatibility interfaces
export interface ImageUploadConfig {
  title?: string;
  formats?: string[];
  maxFileSize?: number; // in KB
  dimensions?: string;
  allowedMimeTypes?: string[];
  allowMultiple?: boolean;
  maxFiles?: number;
}

export interface ImageUploadData {
  config?: ImageUploadConfig;
  currentImageUrl?: string;
  currentImageUrls?: string[];
}

export interface ImageUploadResult {
  file?: File;
  files?: File[];
  imageUrl?: string;
  imageUrls?: string[];
  action: 'save' | 'cancel' | 'remove';
}

@Component({
  selector: 'app-media-upload-modal',
  templateUrl: './media-upload-modal.component.html',
  styleUrls: ['./media-upload-modal.component.scss']
})
export class MediaUploadModalComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  // Component state
  activeTab = 0;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploadProgress = 0;
  uploading = false;
  error: string | null = null;
  isDragOver = false;
  
  // Component info for upload
  componentType = 'media-library';
  componentId = 'media-upload-modal';
  fieldName?: string;
  
  // Form properties
  uploadForm: FormGroup;
  categories: string[] = ['Logos', 'Banners', 'Menu Items', 'Specials', 'Branding', 'Other'];
  
  // Media library selection
  showMediaLibrary = false;
  mediaItems: MediaItem[] = [];
  selectedMediaItem: MediaItem | null = null;
  mediaLibraryLoading = false;
  mediaFilters: MediaFilters = {};
  searchQuery = '';
  
  // Image dimensions
  imageDimensions: { width: number; height: number } | null = null;
  
  // Validation configuration
  validationConfig: ImageValidationConfig = {
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxDimensions: { width: 1920, height: 1080 },
    minDimensions: { width: 100, height: 100 },
    requiredDimensions: null
  };
  
  // Backward compatibility properties
  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  existingImageUrls: string[] = [];
  isLegacyMode = false;
  
  private destroy$ = new Subject<void>();
  private searchSubject = new BehaviorSubject<string>('');

  constructor(
    public dialogRef: MatDialogRef<MediaUploadModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MediaUploadModalConfig | ImageUploadData,
    private formBuilder: FormBuilder,
    private mediaLibraryService: MediaLibraryService
  ) {
    this.uploadForm = this.formBuilder.group({
      category: [''],
      customCategory: [{ value: '', disabled: true }],
      description: [''],
      isPublic: [true]
    });
    
    this.initializeComponent();
  }

  ngOnInit(): void {
    this.setupSearchSubscription();
    this.loadMediaLibrary();
    
    // Initialize search subject with empty string
    this.searchSubject.next('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Check if this is legacy mode
    if (this.isLegacyData(this.data)) {
      this.isLegacyMode = true;
      this.setupLegacyMode(this.data);
    } else {
      this.setupEnhancedMode(this.data as MediaUploadModalConfig);
    }
  }

  private isLegacyData(data: any): data is ImageUploadData {
    return data && (data.config || data.currentImageUrl || data.currentImageUrls);
  }

  private setupLegacyMode(data: ImageUploadData): void {
    // Convert legacy config to enhanced config
    if (data.config) {
      this.validationConfig = {
        allowedTypes: data.config.allowedMimeTypes || ['image/png', 'image/jpeg'],
        maxFileSize: (data.config.maxFileSize || 500) * 1024, // Convert KB to bytes
        maxDimensions: { width: 1920, height: 1080 },
        minDimensions: { width: 100, height: 100 },
        requiredDimensions: this.parseDimensions(data.config.dimensions)
      };
    }
    
    // Set existing images
    if (data.currentImageUrls && data.currentImageUrls.length > 0) {
      this.existingImageUrls = [...data.currentImageUrls];
    } else if (data.currentImageUrl) {
      this.existingImageUrls = [data.currentImageUrl];
    }
  }

  private setupEnhancedMode(config: MediaUploadModalConfig): void {
    if (config.allowedTypes) {
      this.validationConfig.allowedTypes = config.allowedTypes;
    }
    if (config.maxFileSize) {
      this.validationConfig.maxFileSize = config.maxFileSize;
    }
    if (config.requiredDimensions) {
      this.validationConfig.requiredDimensions = config.requiredDimensions;
    }
    if (config.maxDimensions) {
      this.validationConfig.maxDimensions = config.maxDimensions;
    }
    if (config.minDimensions) {
      this.validationConfig.minDimensions = config.minDimensions;
    }
    
    // Store component info for upload
    this.componentType = config.componentType || 'media-library';
    this.componentId = config.componentId || 'media-upload-modal';
    this.fieldName = config.fieldName;
    
    // Set existing media URL
    if (config.existingMediaUrl) {
      // TODO: Load existing media item from library
    }
  }

  private parseDimensions(dimensions?: string): { width: number; height: number } | null {
    if (!dimensions) return null;
    
    const match = dimensions.match(/(\d+)x(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1]),
        height: parseInt(match[2])
      };
    }
    return null;
  }

  private setupSearchSubscription(): void {
    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query !== undefined) {
        this.searchMedia(query);
      }
    });
  }

  // File handling methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (this.isLegacyMode) {
        this.processLegacyFiles(Array.from(input.files));
      } else {
        this.processFile(input.files[0]);
      }
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      if (this.isLegacyMode) {
        this.processLegacyFiles(Array.from(files));
      } else {
        this.processFile(files[0]);
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  private async processFile(file: File): Promise<void> {
    this.error = null;
    
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.error = validation.error || 'File validation failed';
      return;
    }

    // Validate image dimensions
    const dimensionValidation = await this.validateImageDimensions(file);
    if (!dimensionValidation.valid) {
      this.error = dimensionValidation.error || 'Image dimension validation failed';
      return;
    }

    // Show warnings if any
    if (dimensionValidation.warnings && dimensionValidation.warnings.length > 0) {
      console.warn('Image warnings:', dimensionValidation.warnings);
    }

    // Set selected file and generate preview
    this.selectedFile = file;
    this.generatePreview(file);
  }

  // Legacy file processing method
  private processLegacyFiles(files: File[]): void {
    this.error = null;

    // Check if adding these files would exceed max limit
    const totalFiles = this.selectedFiles.length + files.length;
    if (this.validationConfig.maxFiles && totalFiles > this.validationConfig.maxFiles) {
      this.error = `Too many files. Maximum allowed: ${this.validationConfig.maxFiles}`;
      return;
    }

    for (const file of files) {
      // Validate file type
      if (this.validationConfig.allowedTypes && !this.validationConfig.allowedTypes.includes(file.type)) {
        this.error = `Invalid file type: ${file.name}. Allowed formats: ${this.validationConfig.allowedTypes.join(', ')}`;
        return;
      }

      // Validate file size
      if (this.validationConfig.maxFileSize && file.size > this.validationConfig.maxFileSize) {
        this.error = `File size too large: ${file.name}. Maximum size: ${this.validationConfig.maxFileSize / (1024*1024)}MB`;
        return;
      }
    }

    // All files are valid, process them
    files.forEach(file => {
      this.selectedFiles.push(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrls.push(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  private validateFile(file: File): ValidationResult {
    // File type validation
    if (!this.validationConfig.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.name}. Allowed formats: ${this.validationConfig.allowedTypes.join(', ')}`
      };
    }

    // File size validation
    if (file.size > this.validationConfig.maxFileSize) {
      return {
        valid: false,
        error: `File size too large: ${file.name}. Maximum size: ${this.validationConfig.maxFileSize / (1024*1024)}MB`
      };
    }

    return { valid: true };
  }

  private async validateImageDimensions(file: File): Promise<ValidationResult> {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e: any) => {
        img.src = e.target.result;

        img.onload = () => {
          const width = img.width;
          const height = img.height;
          
          // Store dimensions for display
          this.imageDimensions = { width, height };

          // Check required dimensions
          if (this.validationConfig.requiredDimensions) {
            const required = this.validationConfig.requiredDimensions;
            if (width !== required.width || height !== required.height) {
              resolve({
                valid: false,
                error: `Image must be exactly ${required.width}px by ${required.height}px. Your image is ${width}x${height}px.`
              });
              return;
            }
          }

          // Check minimum dimensions
          const min = this.validationConfig.minDimensions;
          if (width < min.width || height < min.height) {
            resolve({
              valid: false,
              error: `Image dimensions too small. Minimum: ${min.width}x${min.height}px. Your image: ${width}x${height}px.`
            });
            return;
          }

          // Check maximum dimensions
          const max = this.validationConfig.maxDimensions;
          if (width > max.width || height > max.height) {
            resolve({
              valid: true,
              warnings: [`Image dimensions exceed recommended maximum. Recommended: ${max.width}x${max.height}px. Your image: ${width}x${height}px.`]
            });
            return;
          }

          resolve({ valid: true });
        };

        img.onerror = () => {
          resolve({
            valid: false,
            error: 'Failed to load image for dimension validation.'
          });
        };
      };

      reader.readAsDataURL(file);
    });
  }

  private generatePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeFile(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.imageDimensions = null;
    this.error = null;
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Upload methods
  async uploadMedia(): Promise<void> {
    if (!this.selectedFile || !this.uploadForm.valid) {
      return;
    }

    this.uploading = true;
    this.error = null;

    try {
      const request: MediaUploadRequest = {
        file: this.selectedFile,
        category: this.uploadForm.get('category')?.value || this.uploadForm.get('customCategory')?.value,
        description: this.uploadForm.get('description')?.value,
        isPublic: this.uploadForm.get('isPublic')?.value,
        componentType: this.componentType,
        componentId: this.componentId,
        fieldName: this.fieldName
      };

      const mediaItem = await this.mediaLibraryService.uploadMedia(request);
      
      // Subscribe to upload progress
      this.mediaLibraryService.uploadProgress$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(progress => {
        if (progress) {
          this.uploadProgress = progress.progress;
        }
      });

      // Close modal with result
      this.closeWithResult(mediaItem);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Upload failed';
    } finally {
      this.uploading = false;
    }
  }

  // Media library methods
  async loadMediaLibrary(): Promise<void> {
    this.mediaLibraryLoading = true;
    try {
      this.mediaItems = await this.mediaLibraryService.getAllMedia(this.mediaFilters);
    } catch (error) {
      console.error('Failed to load media library:', error);
    } finally {
      this.mediaLibraryLoading = false;
    }
  }

  async searchMedia(query: string): Promise<void> {
    if (!query.trim()) {
      await this.loadMediaLibrary();
      return;
    }

    try {
      this.mediaItems = await this.mediaLibraryService.searchMedia(query);
    } catch (error) {
      console.error('Failed to search media:', error);
    }
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  selectExistingMedia(mediaItem: MediaItem): void {
    this.selectedMediaItem = mediaItem;
    this.closeWithResult(mediaItem);
  }

  // Form methods


  onCategoryChange(): void {
    const category = this.uploadForm.get('category')?.value;
    if (category === 'custom') {
      this.uploadForm.get('customCategory')?.enable();
    } else {
      this.uploadForm.get('customCategory')?.disable();
    }
  }

  // Legacy compatibility methods
  onUploadMedia(): void {
    this.fileInput.nativeElement.click();
  }

  onSave(): void {
    if (this.selectedFile) {
      // Upload new file to media library
      this.uploadMedia();
    } else if (this.selectedMediaItem) {
      // Return selected media item from library
      this.closeWithResult(this.selectedMediaItem);
    } else if (this.existingImageUrls.length === 0 && this.data && this.isLegacyData(this.data) && this.data.currentImageUrls && this.data.currentImageUrls.length > 0) {
      // All images were removed
      const result: ImageUploadResult = {
        action: 'remove'
      };
      this.dialogRef.close(result);
    } else {
      // Return existing images only
      const result: ImageUploadResult = {
        imageUrls: [...this.existingImageUrls],
        action: 'save'
      };
      this.dialogRef.close(result);
    }
  }

  onRemoveImage(index: number): void {
    if (index < this.selectedFiles.length) {
      this.selectedFiles.splice(index, 1);
      this.previewUrls.splice(index, 1);
    } else {
      const existingIndex = index - this.selectedFiles.length;
      this.existingImageUrls.splice(existingIndex, 1);
    }
    this.error = null;
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onRemoveAllImages(): void {
    this.selectedFiles = [];
    this.previewUrls = [];
    this.existingImageUrls = [];
    this.error = null;
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Modal control methods
  closeModal(): void {
    this.dialogRef.close();
  }

  private closeWithResult(result: any): void {
    if (this.isLegacyMode) {
      // Return legacy format result
      const legacyResult: ImageUploadResult = {
        files: this.selectedFiles.length > 0 ? [...this.selectedFiles] : undefined,
        imageUrls: this.existingImageUrls.length > 0 ? [...this.existingImageUrls] : undefined,
        action: 'save'
      };
      this.dialogRef.close(legacyResult);
    } else {
      // Return enhanced format result - could be MediaItem or ImageUploadResult
      this.dialogRef.close(result);
    }
  }

  // Computed properties
  get hasImages(): boolean {
    return this.selectedFiles.length > 0 || this.existingImageUrls.length > 0;
  }

  get hasNewImages(): boolean {
    return this.selectedFiles.length > 0;
  }

  get allImages(): Array<{url: string, isNew: boolean, index: number}> {
    const images: Array<{url: string, isNew: boolean, index: number}> = [];
    
    // Add new images
    this.previewUrls.forEach((url, index) => {
      images.push({ url, isNew: true, index });
    });
    
    // Add existing images
    this.existingImageUrls.forEach((url, index) => {
      images.push({ url, isNew: false, index: index + this.selectedFiles.length });
    });
    
    return images;
  }

  get formatString(): string {
    return this.validationConfig.allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(' / ');
  }
} 
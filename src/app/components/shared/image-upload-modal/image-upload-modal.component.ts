import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ImageUploadConfig {
  title?: string;
  formats?: string[];
  maxFileSize?: number; // in KB
  dimensions?: string;
  allowedMimeTypes?: string[];
  allowMultiple?: boolean; // Allow multiple file selection
  maxFiles?: number; // Maximum number of files allowed
}

export interface ImageUploadData {
  config?: ImageUploadConfig;
  currentImageUrl?: string;
  currentImageUrls?: string[]; // For multiple images
}

export interface ImageUploadResult {
  file?: File;
  files?: File[]; // For multiple files
  imageUrl?: string;
  imageUrls?: string[]; // For multiple image URLs
  action: 'save' | 'cancel' | 'remove';
}

@Component({
  selector: 'app-image-upload-modal',
  templateUrl: './image-upload-modal.component.html',
  styleUrls: ['./image-upload-modal.component.scss']
})
export class ImageUploadModalComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  existingImageUrls: string[] = [];
  isDragOver = false;
  isUploading = false;
  errorMessage = '';

  // Default configuration
  config: ImageUploadConfig = {
    title: 'Upload Images',
    formats: ['PNG', 'JPG'],
    maxFileSize: 500, // KB
    dimensions: '1080x1080',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    allowMultiple: true,
    maxFiles: 10
  };

  constructor(
    public dialogRef: MatDialogRef<ImageUploadModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImageUploadData
  ) {
    // Merge provided config with defaults
    if (data?.config) {
      this.config = { ...this.config, ...data.config };
    }
    
    // Set initial previews if there are current images
    if (data?.currentImageUrls && data.currentImageUrls.length > 0) {
      this.existingImageUrls = [...data.currentImageUrls];
    } else if (data?.currentImageUrl) {
      this.existingImageUrls = [data.currentImageUrl];
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.processFiles(files);
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

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      this.processFiles(fileArray);
    }
  }

  private processFiles(files: File[]): void {
    this.errorMessage = '';

    // Check if adding these files would exceed max limit
    const totalFiles = this.selectedFiles.length + files.length;
    if (this.config.maxFiles && totalFiles > this.config.maxFiles) {
      this.errorMessage = `Too many files. Maximum allowed: ${this.config.maxFiles}`;
      return;
    }

    for (const file of files) {
      // Validate file type
      if (this.config.allowedMimeTypes && !this.config.allowedMimeTypes.includes(file.type)) {
        this.errorMessage = `Invalid file type: ${file.name}. Allowed formats: ${this.config.formats?.join(', ')}`;
        return;
      }

      // Validate file size
      const fileSizeKB = file.size / 1024;
      if (this.config.maxFileSize && fileSizeKB > this.config.maxFileSize) {
        this.errorMessage = `File size too large: ${file.name}. Maximum size: ${this.config.maxFileSize}KB`;
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

  onUploadMedia(): void {
    this.fileInput.nativeElement.click();
  }

  onRemoveImage(index: number): void {
    if (index < this.selectedFiles.length) {
      // Remove from selected files
      this.selectedFiles.splice(index, 1);
      this.previewUrls.splice(index, 1);
    } else {
      // Remove from existing images
      const existingIndex = index - this.selectedFiles.length;
      this.existingImageUrls.splice(existingIndex, 1);
    }
    this.errorMessage = '';
    
    // Reset file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onRemoveAllImages(): void {
    this.selectedFiles = [];
    this.previewUrls = [];
    this.existingImageUrls = [];
    this.errorMessage = '';
    
    // Reset file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onCancel(): void {
    const result: ImageUploadResult = {
      action: 'cancel'
    };
    this.dialogRef.close(result);
  }

  onSave(): void {
    if (this.selectedFiles.length > 0) {
      const result: ImageUploadResult = {
        files: [...this.selectedFiles],
        imageUrls: [...this.existingImageUrls],
        action: 'save'
      };
      this.dialogRef.close(result);
    } else if (this.existingImageUrls.length === 0 && this.data?.currentImageUrls && this.data.currentImageUrls.length > 0) {
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
    return this.config.formats?.join(' / ') || '';
  }
} 
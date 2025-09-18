import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MediaUploadModalComponent, MediaUploadModalConfig } from '../components/media-upload-modal/media-upload-modal.component';

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

@Injectable({
  providedIn: 'root'
})
export class MediaUploadModalService {
  constructor(private dialog: MatDialog) {}

  /**
   * Opens the enhanced media upload modal with configuration
   * @param config Configuration for the modal
   * @returns Dialog reference for handling modal events
   */
  openUploadModal(config: MediaUploadModalConfig): MatDialogRef<MediaUploadModalComponent> {
    return this.dialog.open(MediaUploadModalComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: config,
      disableClose: true,
      panelClass: 'media-upload-modal',
      autoFocus: false
    });
  }

  /**
   * Opens the modal for uploading new media with default configuration
   * @param componentType Type of component initiating the upload
   * @param componentId ID of the component
   * @param fieldName Name of the field being uploaded to
   * @returns Dialog reference for handling modal events
   */
  openNewMediaUpload(
    componentType: string,
    componentId: string,
    fieldName?: string
  ): MatDialogRef<MediaUploadModalComponent> {
    const config: MediaUploadModalConfig = {
      componentType,
      componentId,
      fieldName,
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowMultiple: false,
      maxFiles: 1
    };

    return this.openUploadModal(config);
  }

  /**
   * Opens the modal for selecting existing media from the library
   * @param componentType Type of component selecting the media
   * @param componentId ID of the component
   * @param fieldName Name of the field being selected for
   * @returns Dialog reference for handling modal events
   */
  openMediaSelection(
    componentType: string,
    componentId: string,
    fieldName?: string
  ): MatDialogRef<MediaUploadModalComponent> {
    const config: MediaUploadModalConfig = {
      componentType,
      componentId,
      fieldName,
      allowMultiple: false,
      maxFiles: 1
    };

    const dialogRef = this.openUploadModal(config);
    
    // Automatically switch to media library tab
    setTimeout(() => {
      const component = dialogRef.componentInstance;
      if (component) {
        component.activeTab = 1; // Media Library tab
      }
    }, 100);

    return dialogRef;
  }

  /**
   * Opens the modal for logo upload with specific dimension requirements
   * @param componentId ID of the component
   * @returns Dialog reference for handling modal events
   */
  openLogoUpload(componentId: string): MatDialogRef<MediaUploadModalComponent> {
    const config: MediaUploadModalConfig = {
      componentType: 'branding',
      componentId,
      fieldName: 'logo',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 2 * 1024 * 1024, // 2MB
      requiredDimensions: { width: 150, height: 50 },
      minDimensions: { width: 150, height: 50 }, // Set min dimensions to match required dimensions
      allowMultiple: false,
      maxFiles: 1
    };

    return this.openUploadModal(config);
  }

  /**
   * Opens the modal for banner upload with specific dimension requirements
   * @param componentId ID of the component
   * @returns Dialog reference for handling modal events
   */
  openBannerUpload(componentId: string): MatDialogRef<MediaUploadModalComponent> {
    const config: MediaUploadModalConfig = {
      componentType: 'branding',
      componentId,
      fieldName: 'banner',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      requiredDimensions: { width: 1200, height: 300 },
      allowMultiple: false,
      maxFiles: 1
    };

    return this.openUploadModal(config);
  }

  /**
   * Opens the modal for menu item image upload
   * @param componentId ID of the component
   * @returns Dialog reference for handling modal events
   */
  openMenuItemImageUpload(componentId: string): MatDialogRef<MediaUploadModalComponent> {
    const config: MediaUploadModalConfig = {
      componentType: 'menuItem',
      componentId,
      fieldName: 'image',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 3 * 1024 * 1024, // 3MB
      maxDimensions: { width: 800, height: 600 },
      allowMultiple: false,
      maxFiles: 1
    };

    return this.openUploadModal(config);
  }

  /**
   * Opens the modal for special image upload
   * @param componentId ID of the component
   * @returns Dialog reference for handling modal events
   */
  openSpecialImageUpload(componentId: string): MatDialogRef<MediaUploadModalComponent> {
    const config: MediaUploadModalConfig = {
      componentType: 'special',
      componentId,
      fieldName: 'image',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 4 * 1024 * 1024, // 4MB
      maxDimensions: { width: 1000, height: 750 },
      allowMultiple: false,
      maxFiles: 1,
      validateAspectRatio: true // Enable landscape validation for specials
    };

    return this.openUploadModal(config);
  }

  /**
   * Opens the modal for menu item image upload with media library selection
   * @param componentId ID of the component
   * @param startWithMediaLibrary Whether to start on the media library tab
   * @returns Dialog reference for handling modal events
   */
  openMenuItemImageUploadWithLibrary(
    componentId: string,
    startWithMediaLibrary: boolean = false
  ): MatDialogRef<MediaUploadModalComponent> {
    const config: MediaUploadModalConfig = {
      componentType: 'menuItem',
      componentId,
      fieldName: 'images',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowMultiple: true,
      maxFiles: 3
    };

    const dialogRef = this.openUploadModal(config);
    
    // If requested, start on media library tab
    if (startWithMediaLibrary) {
      setTimeout(() => {
        const component = dialogRef.componentInstance;
        if (component) {
          component.activeTab = 1; // Media Library tab
        }
      }, 100);
    }

    return dialogRef;
  }

  /**
   * Opens the modal for multiple image upload
   * @param componentType Type of component initiating the upload
   * @param componentId ID of the component
   * @param maxFiles Maximum number of files allowed
   * @returns Dialog reference for handling modal events
   */
  openMultipleImageUpload(
    componentType: string,
    componentId: string,
    maxFiles: number = 10
  ): MatDialogRef<MediaUploadModalComponent> {
    const config: MediaUploadModalConfig = {
      componentType,
      componentId,
      fieldName: 'images',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowMultiple: true,
      maxFiles
    };

    return this.openUploadModal(config);
  }

  /**
   * Backward compatibility method for existing ImageUploadModalComponent
   * @param legacyConfig Legacy configuration object
   * @param data Legacy data object
   * @returns Dialog reference for handling modal events
   */
  openLegacyUploadModal(
    legacyConfig: ImageUploadConfig,
    data?: ImageUploadData
  ): MatDialogRef<MediaUploadModalComponent> {
    const mediaConfig: MediaUploadModalConfig = {
      componentType: 'legacy',
      componentId: 'legacy-upload',
      allowedTypes: legacyConfig.allowedMimeTypes || ['image/png', 'image/jpeg'],
      maxFileSize: (legacyConfig.maxFileSize || 500) * 1024, // Convert KB to bytes
      requiredDimensions: this.parseDimensions(legacyConfig.dimensions),
      allowMultiple: legacyConfig.allowMultiple || false,
      maxFiles: legacyConfig.maxFiles || 1
    };

    // Merge with existing data
    if (data) {
      if (data.currentImageUrl) {
        mediaConfig.existingMediaUrl = data.currentImageUrl;
      }
      if (data.currentImageUrls && data.currentImageUrls.length > 0) {
        // Handle multiple existing images if needed
        mediaConfig.existingMediaUrl = data.currentImageUrls[0];
      }
    }

    return this.openUploadModal(mediaConfig);
  }

  /**
   * Opens the modal with custom validation requirements
   * @param config Base configuration
   * @param validationConfig Custom validation configuration
   * @returns Dialog reference for handling modal events
   */
  openWithCustomValidation(
    config: MediaUploadModalConfig,
    validationConfig: {
      allowedTypes?: string[];
      maxFileSize?: number;
      requiredDimensions?: { width: number; height: number } | null;
      maxDimensions?: { width: number; height: number };
      minDimensions?: { width: number; height: number };
    }
  ): MatDialogRef<MediaUploadModalComponent> {
    const enhancedConfig: MediaUploadModalConfig = {
      ...config,
      allowedTypes: validationConfig.allowedTypes || config.allowedTypes,
      maxFileSize: validationConfig.maxFileSize || config.maxFileSize,
      requiredDimensions: validationConfig.requiredDimensions || config.requiredDimensions
    };

    return this.openUploadModal(enhancedConfig);
  }

  /**
   * Opens the modal for editing existing media
   * @param mediaId ID of the existing media item
   * @param componentType Type of component editing the media
   * @param componentId ID of the component
   * @returns Dialog reference for handling modal events
   */
  openMediaEdit(
    mediaId: string,
    componentType: string,
    componentId: string
  ): MatDialogRef<MediaUploadModalComponent> {
    const config: MediaUploadModalConfig = {
      componentType,
      componentId,
      fieldName: 'edit',
      allowMultiple: false,
      maxFiles: 1
    };

    const dialogRef = this.openUploadModal(config);
    
    // TODO: Load existing media item and populate form
    // This would require additional implementation to load media by ID
    
    return dialogRef;
  }

  /**
   * Helper method to parse dimension string (e.g., "150x50")
   * @param dimensions Dimension string in format "widthxheight"
   * @returns Parsed dimensions object or null if invalid
   */
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

  /**
   * Helper method to convert legacy format array to MIME types
   * @param formats Array of format strings (e.g., ["PNG", "JPG"])
   * @returns Array of MIME types
   */
  private convertFormatsToMimeTypes(formats?: string[]): string[] {
    if (!formats) return ['image/png', 'image/jpeg'];
    
    const formatMap: { [key: string]: string } = {
      'PNG': 'image/png',
      'JPG': 'image/jpeg',
      'JPEG': 'image/jpeg',
      'WEBP': 'image/webp',
      'GIF': 'image/gif'
    };

    return formats.map(format => formatMap[format.toUpperCase()] || 'image/png');
  }

  /**
   * Creates a configuration for a specific use case
   * @param useCase The use case (e.g., 'logo', 'banner', 'menu-item', 'special')
   * @param componentId ID of the component
   * @returns Configuration object for the use case
   */
  createConfigForUseCase(useCase: string, componentId: string): MediaUploadModalConfig {
    const baseConfig: MediaUploadModalConfig = {
      componentType: 'custom',
      componentId,
      allowMultiple: false,
      maxFiles: 1
    };

    switch (useCase.toLowerCase()) {
      case 'logo':
        return {
          ...baseConfig,
          fieldName: 'logo',
          allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
          maxFileSize: 2 * 1024 * 1024,
          requiredDimensions: { width: 150, height: 50 }
        };

      case 'banner':
        return {
          ...baseConfig,
          fieldName: 'banner',
          allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
          maxFileSize: 5 * 1024 * 1024,
          requiredDimensions: { width: 1200, height: 300 }
        };

      case 'menu-item':
        return {
          ...baseConfig,
          fieldName: 'image',
          allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
          maxFileSize: 3 * 1024 * 1024,
          maxDimensions: { width: 800, height: 600 }
        };

      case 'special':
        return {
          ...baseConfig,
          fieldName: 'image',
          allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
          maxFileSize: 4 * 1024 * 1024,
          maxDimensions: { width: 1000, height: 750 }
        };

      default:
        return {
          ...baseConfig,
          fieldName: 'image',
          allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
          maxFileSize: 5 * 1024 * 1024
        };
    }
  }
} 
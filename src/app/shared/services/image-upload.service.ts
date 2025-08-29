import { Injectable } from '@angular/core';

export interface ImageUploadService {
  uploadImage(file: File, context?: string): Promise<string>;
  deleteImage(imageUrl: string): Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class GenericImageUploadService {
  
  constructor() { }

  /**
   * Factory method to create upload handlers for different contexts
   * This allows different parts of the app to use different upload services
   * while maintaining the same interface
   */
  static createUploadHandler(
    uploadFn: (file: File) => Promise<string>,
    deleteFn?: (url: string) => Promise<void>
  ): ImageUploadService {
    return {
      uploadImage: uploadFn,
      deleteImage: deleteFn || (() => Promise.resolve())
    };
  }
} 
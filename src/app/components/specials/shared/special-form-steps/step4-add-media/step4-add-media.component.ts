import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-step4-add-media',
  templateUrl: './step4-add-media.component.html',
  styleUrls: ['./step4-add-media.component.scss']
})
export class Step4AddMediaComponent {
  @Input() uploadedImageUrl: string | null = null;
  @Input() isSaving: boolean = false;
  @Input() mediaId: string | null = null; // Add media ID input
  @Input() fileName: string | null = null; // Add filename input

  @Output() openImageUploadModal = new EventEmitter<void>();
  @Output() deleteMedia = new EventEmitter<void>();

  showDeleteModal: boolean = false;
  isDeleting: boolean = false;

  get displayFileName(): string {
    if (this.fileName) {
      return this.fileName;
    }
    // Extract filename from URL as fallback
    if (this.uploadedImageUrl) {
      try {
        // Try to parse as URL first
        const url = new URL(this.uploadedImageUrl);
        const pathname = url.pathname;
        // Extract filename from path (e.g., /media/userId/filename.jpg)
        const parts = pathname.split('/').filter(part => part.length > 0);
        const filename = parts[parts.length - 1];
        // Remove query parameters if any
        const cleanFilename = filename.split('?')[0];
        // Decode URL encoding and return just the filename
        return decodeURIComponent(cleanFilename);
      } catch (e) {
        // If URL parsing fails, try to extract from string directly
        const parts = this.uploadedImageUrl.split('/').filter(part => part.length > 0);
        const lastPart = parts[parts.length - 1];
        const filename = lastPart.split('?')[0];
        return decodeURIComponent(filename);
      }
    }
    return '';
  }

  onOpenImageUploadModal() {
    this.openImageUploadModal.emit();
  }

  onDeleteMedia() {
    this.showDeleteModal = true;
  }

  onCancelDelete() {
    this.showDeleteModal = false;
  }

  onConfirmDelete() {
    this.isDeleting = true;
    this.deleteMedia.emit();
    // Close the modal immediately after emitting the delete event
    // The parent component will handle the actual deletion asynchronously
    this.showDeleteModal = false;
    this.isDeleting = false;
  }

  // Method to reset state after deletion
  resetMediaState() {
    this.showDeleteModal = false;
    this.isDeleting = false;
  }
} 
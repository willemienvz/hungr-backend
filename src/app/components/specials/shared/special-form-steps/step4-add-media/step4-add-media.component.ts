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

  @Output() openImageUploadModal = new EventEmitter<void>();
  @Output() deleteMedia = new EventEmitter<void>();

  showDeleteModal: boolean = false;
  isDeleting: boolean = false;

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
  }

  // Method to reset state after deletion
  resetMediaState() {
    this.showDeleteModal = false;
    this.isDeleting = false;
  }
} 
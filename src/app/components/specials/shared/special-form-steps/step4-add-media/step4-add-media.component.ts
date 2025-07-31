import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-step4-add-media',
  templateUrl: './step4-add-media.component.html',
  styleUrls: ['./step4-add-media.component.scss']
})
export class Step4AddMediaComponent {
  @Input() uploadedImageUrl: string | null = null;
  @Input() isSaving: boolean = false;

  @Output() openImageUploadModal = new EventEmitter<void>();

  onOpenImageUploadModal() {
    this.openImageUploadModal.emit();
  }
} 
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-menu-item-selection',
  templateUrl: './menu-item-selection.component.html',
  styleUrls: ['./menu-item-selection.component.scss']
})
export class MenuItemSelectionComponent {

  @Output() bulkUploadClick = new EventEmitter<void>();
  @Output() manualAddClick = new EventEmitter<void>();
  @Output() stepClick = new EventEmitter<number>();

  /* KB - Added popup states for bulk upload functionality */
  showUploadModal: boolean = false;
  showSuccessModal: boolean = false;

  onBulkUploadClick() {
    /* KB - Open upload modal instead of emitting event */
    this.showUploadModal = true;
  }

  onManualAddClick() {
    this.manualAddClick.emit();
  }

  onStepClick(step: number) {
    this.stepClick.emit(step);
  }

  /* KB - Modal control methods */
  closeUploadModal() {
    this.showUploadModal = false;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  /* KB - Handle file selection */
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // TODO: Implement file processing logic here
      console.log('File selected:', file.name);
      
      // Close upload modal and show success modal
      this.showUploadModal = false;
      this.showSuccessModal = true;
    }
  }

  /* KB - Handle template download */
  onDownloadTemplate() {
    // TODO: Implement template download logic
    console.log('Download template clicked');
  }

  /* KB - Handle save as draft from upload modal */
  onSaveAsDraft() {
    this.showUploadModal = false;
    // TODO: Implement save as draft logic
    console.log('Save as draft clicked');
  }
} 
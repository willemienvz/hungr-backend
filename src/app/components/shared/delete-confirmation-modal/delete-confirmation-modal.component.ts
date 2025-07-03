import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DeleteConfirmationData {
  title?: string;
  message?: string;
  itemName?: string;
  itemType?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

@Component({
  selector: 'app-delete-confirmation-modal',
  templateUrl: './delete-confirmation-modal.component.html',
  styleUrls: ['./delete-confirmation-modal.component.scss']
})
export class DeleteConfirmationModalComponent {
  
  constructor(
    public dialogRef: MatDialogRef<DeleteConfirmationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteConfirmationData
  ) {
    // Set default values if not provided
    this.data = {
      title: this.data.title || 'Confirm Deletion',
      message: this.data.message || this.getDefaultMessage(),
      confirmButtonText: this.data.confirmButtonText || 'Yes, Delete',
      cancelButtonText: this.data.cancelButtonText || 'Cancel',
      ...this.data
    };
  }

  private getDefaultMessage(): string {
    if (this.data.itemName && this.data.itemType) {
      return `Are you sure you want to delete the ${this.data.itemType} "${this.data.itemName}"? This action cannot be undone.`;
    } else if (this.data.itemType) {
      return `Are you sure you want to delete this ${this.data.itemType}? This action cannot be undone.`;
    } else {
      return 'Are you sure you want to delete this item? This action cannot be undone.';
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
} 
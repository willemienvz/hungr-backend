import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface UnsavedChangesDialogData {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-unsaved-changes-dialog',
  templateUrl: './unsaved-changes-dialog.component.html',
  styleUrl: './unsaved-changes-dialog.component.scss'
})
export class UnsavedChangesDialogComponent {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;

  constructor(
    public dialogRef: MatDialogRef<UnsavedChangesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UnsavedChangesDialogData
  ) {
    this.title = data?.title || 'Discard Changes?';
    this.message = data?.message || 'You have unsaved changes. If you continue, your progress will be lost.';
    this.confirmText = data?.confirmText || 'Yes, discard';
    this.cancelText = data?.cancelText || 'Cancel';
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}

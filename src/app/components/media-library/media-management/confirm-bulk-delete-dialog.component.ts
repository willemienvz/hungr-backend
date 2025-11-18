import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MediaItem } from '../../../shared/types/media';

@Component({
  selector: 'app-confirm-bulk-delete-dialog',
  template: `
    <h2 mat-dialog-title>Confirm Bulk Delete</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete {{ data.count }} media items?</p>
      <p class="warning">This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="hungr-btn hungr-btn-secondary" mat-dialog-close>Cancel</button>
      <button class="hungr-btn hungr-btn-danger" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .warning {
      color: #f44336;
      font-weight: 500;
    }
  `]
})
export class ConfirmBulkDeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmBulkDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { count: number; mediaItems: MediaItem[] }
  ) { }
} 
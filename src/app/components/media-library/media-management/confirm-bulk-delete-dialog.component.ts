import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MediaItem } from '../../../shared/types/media';

@Component({
  selector: 'app-confirm-bulk-delete-dialog',
  template: `
    <div class="delete-confirmation-modal">
      <div class="modal-header">
        <h6 class="modal-title">Confirm Bulk Delete</h6>
        <button type="button" class="close-btn" mat-dialog-close>
          <i class="material-icons">close</i>
        </button>
      </div>
      <div class="modal-content">
        <p class="confirmation-message">Are you sure you want to delete {{ data.count }} media items? This action cannot be undone.</p>
      </div>
      <div class="modal-actions">
        <button class="hungr-btn hungr-btn-secondary" mat-dialog-close>Cancel</button>
        <button class="hungr-btn hungr-btn-primary" [mat-dialog-close]="true">Delete</button>
      </div>
    </div>
  `,
  styles: [`
    .delete-confirmation-modal {
      max-width: 90vw;
      width: 450px;
      background: white;
      border-radius: var(--border-radius-lg);
      padding: 24px;
      font-family: var(--hungr-font-family);
      position: relative;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-4);
    }

    .modal-title {
      font-size: 24px;
      font-weight: 600;
      color: #333;
      margin: 0;
      text-align: center;
      flex: 1;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: var(--border-radius-base);
      color: #666;
      transition: color 0.2s ease;
      outline: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: #333;
    }

    .close-btn:focus {
      outline: none;
      box-shadow: none;
    }

    .close-btn i {
      font-size: var(--spacing-5);
    }

    .modal-content {
      text-align: center;
      margin-bottom: 32px;
    }

    .confirmation-message {
      font-size: 16px;
      font-weight: 400;
      line-height: 1.5;
      color: #333;
      margin: 0;
      max-width: 350px;
      margin-left: auto;
      margin-right: auto;
    }

    .modal-actions {
      display: flex;
      gap: var(--spacing-3);
      justify-content: center;
    }

    .modal-actions button {
      outline: none;
    }

    .modal-actions button:focus {
      outline: none;
      box-shadow: none;
    }
  `]
})
export class ConfirmBulkDeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmBulkDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { count: number; mediaItems: MediaItem[] }
  ) { }
} 
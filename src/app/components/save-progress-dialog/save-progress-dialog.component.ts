import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-save-progress-dialog',
  templateUrl: './save-progress-dialog.component.html',
  styleUrl: './save-progress-dialog.component.scss',
})
export class SaveProgressDialogComponent {
  
  constructor(
    public dialogRef: MatDialogRef<SaveProgressDialogComponent>
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}

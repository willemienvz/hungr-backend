import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-success-add-restaurant-dialog',
  templateUrl: './success-add-restaurant-dialog.component.html',
  styleUrl: './success-add-restaurant-dialog.component.scss',
})
export class SuccessAddRestaurantDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string },
    private readonly dialogRef: MatDialogRef<SuccessAddRestaurantDialogComponent>
  ) {}

  closeDialog() {
    this.dialogRef.close();
  }
}

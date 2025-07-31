import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Special } from '../../../../types/special';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-special-dialog',
  templateUrl: './view-special-dialog.component.html',
  styleUrls: ['./view-special-dialog.component.scss']
})
export class ViewSpecialDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ViewSpecialDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public special: Special,
    private router: Router
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    this.dialogRef.close();
    this.router.navigate(['/specials/edit-special', this.special.specialID]);
  }

  getSpecialTypeLabel(type: number): string {
    switch (type) {
      case 1: return 'Percentage Discount';
      case 2: return 'Price Discount';
      case 3: return 'Combo Deal';
      case 4: return 'Category Special';
      default: return 'Special Type';
    }
  }
} 
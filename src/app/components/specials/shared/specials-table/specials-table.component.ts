import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Special } from '../../../../types/special'
import { ViewSpecialDialogComponent } from '../view-special-dialog/view-special-dialog.component';

@Component({
  selector: 'app-specials-table',
  templateUrl: './specials-table.component.html',
  styleUrls: ['./specials-table.component.scss']
})
export class SpecialsTableComponent {
  @Input() specials: Special[] = [];
  @Input() tableType: 'active' | 'inactive' | 'draft' = 'active';
  @Input() showToggle: boolean = true;

  @Output() toggleStatus = new EventEmitter<{special: Special, index: number}>();
  @Output() deleteSpecial = new EventEmitter<{specialId: string, index: number}>();

  constructor(private dialog: MatDialog) {}

  openViewDialog(special: Special): void {
    console.log("opened");
    this.dialog.open(ViewSpecialDialogComponent, {
      width: '800px',
      panelClass: 'special-view-dialog-panel',
      data: special
    });
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

  getSpecialStatus(special: Special): string {
    // This should be implemented the same way as in the parent component
    return special.active ? 'Active' : 'Inactive';
  }
} 
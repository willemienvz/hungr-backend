import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Menu } from '../../../shared/services/menu';

export interface MenuDetailsData {
  menu: Menu;
}

@Component({
  selector: 'app-menu-details-modal',
  templateUrl: './menu-details-modal.component.html',
  styleUrls: ['./menu-details-modal.component.scss']
})
export class MenuDetailsModalComponent {
  
  constructor(
    public dialogRef: MatDialogRef<MenuDetailsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MenuDetailsData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    this.dialogRef.close('edit');
  }

  getStatusColor(): string {
    return this.data.menu.Status ? '#16D3D2' : '#444444';
  }

  getStatusText(): string {
    return this.data.menu.Status ? 'Active' : 'Inactive';
  }
} 
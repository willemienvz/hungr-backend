import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SideItem } from '../../menus/shared/menu.service';

/* KB: Configuration interface for side detail component */
export interface SideDetailConfig {
  title: string;
  placeholder: string;
  description?: string;
  showPricing: boolean; // Whether to show price input for sides
}

@Component({
  selector: 'app-side-detail',
  templateUrl: './side-detail.component.html',
  styleUrls: ['./side-detail.component.scss']
})
export class SideDetailComponent {
  /* KB: Configuration object that defines the side detail behavior */
  @Input() config!: SideDetailConfig;
  
  /* KB: Array of side items (can be strings or SideItem objects) */
  @Input() sides: (string | SideItem)[] = [];
  
  /* KB: Current value of the new side name input */
  @Input() newSideName: string = '';
  
  /* KB: Current value of the new side price input */
  @Input() newSidePrice: string = 'R 0.00';
  
  /* KB: Event emitted when user wants to close this detail section */
  @Output() closeDetail = new EventEmitter<void>();
  
  /* KB: Event emitted when user adds a new side */
  @Output() addSide = new EventEmitter<{name: string, price?: string}>();
  
  /* KB: Event emitted when user removes a side at specific index */
  @Output() removeSide = new EventEmitter<number>();
  
  /* KB: Event emitted when the new side name input value changes */
  @Output() newSideNameChange = new EventEmitter<string>();
  
  /* KB: Event emitted when the new side price input value changes */
  @Output() newSidePriceChange = new EventEmitter<string>();

  /* KB: Handle closing the detail section */
  onCloseDetail() {
    this.closeDetail.emit();
  }

  /* KB: Handle adding a new side */
  onAddSide() {
    if (this.newSideName.trim()) {
      const sideData: {name: string, price?: string} = {
        name: this.newSideName.trim()
      };
      
      // Only include price if pricing is enabled and price is not default
      if (this.config.showPricing && this.newSidePrice && this.newSidePrice !== 'R 0.00') {
        sideData.price = this.newSidePrice;
      }
      
      this.addSide.emit(sideData);
      
      // Reset inputs
      this.newSideName = '';
      this.newSidePrice = 'R 0.00';
    }
  }

  /* KB: Handle removing a side at specific index */
  onRemoveSide(index: number) {
    this.removeSide.emit(index);
  }

  /* KB: Handle new side name input value changes */
  onNewSideNameChange(value: string) {
    this.newSideNameChange.emit(value);
  }

  /* KB: Handle new side price input value changes */
  onNewSidePriceChange(value: string) {
    this.newSidePriceChange.emit(value);
  }

  /* KB: Get display name for a side (handles both string and SideItem formats) */
  getSideDisplayName(side: string | SideItem): string {
    if (typeof side === 'string') {
      return side;
    }
    return side.name;
  }

  /* KB: Get display price for a side (handles both string and SideItem formats) */
  getSideDisplayPrice(side: string | SideItem): string | null {
    if (typeof side === 'string') {
      return null;
    }
    return side.price || null;
  }

  /* KB: Check if side has price (for conditional display) */
  hasSidePrice(side: string | SideItem): boolean {
    if (typeof side === 'string') {
      return false;
    }
    return !!side.price && side.price !== 'R 0.00';
  }
} 
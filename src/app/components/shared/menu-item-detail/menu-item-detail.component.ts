import { Component, Input, Output, EventEmitter } from '@angular/core';

/* KB: Interface to define the configuration for each detail type */
export interface DetailConfig {
  title: string;
  placeholder: string;
  description?: string;
  propertyName: 'preparations' | 'variations' | 'pairings' | 'sides' | 'labels' | 'allergens' | 'sauces';
  showPricing?: boolean; // Whether to show price input for this detail type
  customHeading?: string; // Optional custom heading override
}

/* KB: Union type for detail types including allergens */
export type DetailType = 'preparation' | 'variation' | 'pairing' | 'side' | 'allergen' | 'sauce';

@Component({
  selector: 'app-menu-item-detail',
  templateUrl: './menu-item-detail.component.html',
  styleUrls: ['./menu-item-detail.component.scss']
})
export class MenuItemDetailComponent {
  /* KB: Configuration object that defines the detail type behavior */
  @Input() config!: DetailConfig;
  
  /* KB: Array of items for this detail type (can be strings or objects with pricing) */
  @Input() items: (string | any)[] = [];
  
  /* KB: Current value of the new item input */
  @Input() newItemValue: string = '';
  
  /* KB: Current value of the new item price input */
  @Input() newItemPrice: string = 'R 0.00';
  
  /* KB: Event emitted when user wants to close this detail section */
  @Output() closeDetail = new EventEmitter<void>();
  
  /* KB: Event emitted when user adds a new item */
  @Output() addItem = new EventEmitter<{name: string, price?: string}>();
  
  /* KB: Event emitted when user removes an item at specific index */
  @Output() removeItem = new EventEmitter<number>();
  
  /* KB: Event emitted when the new item input value changes */
  @Output() newItemValueChange = new EventEmitter<string>();
  
  /* KB: Event emitted when the new item price input value changes */
  @Output() newItemPriceChange = new EventEmitter<string>();
  
  /* KB: Event emitted when the custom heading changes */
  @Output() customHeadingChange = new EventEmitter<string>();

  /* KB: Handle closing the detail section */
  onCloseDetail() {
    this.closeDetail.emit();
  }

  /* KB: Handle adding a new item */
  onAddItem() {
    if (this.newItemValue.trim()) {
      const itemData: {name: string, price?: string} = {
        name: this.newItemValue.trim()
      };
      
      // Only include price if pricing is enabled and price is not default
      if (this.config.showPricing && this.newItemPrice && this.newItemPrice !== 'R 0.00') {
        itemData.price = this.newItemPrice;
      }
      
      this.addItem.emit(itemData);
      
      // Reset inputs
      this.newItemValue = '';
      this.newItemPrice = 'R 0.00';
    }
  }

  /* KB: Handle removing an item at specific index */
  onRemoveItem(index: number) {
    this.removeItem.emit(index);
  }

  /* KB: Handle new item input value changes */
  onNewItemValueChange(value: string) {
    this.newItemValueChange.emit(value);
  }

  /* KB: Handle new item price input value changes */
  onNewItemPriceChange(value: string) {
    this.newItemPriceChange.emit(value);
  }

  /* KB: Handle custom heading changes */
  onCustomHeadingChange(value: string) {
    this.customHeadingChange.emit(value);
  }

  /* KB: Get display name for an item (handles both string and object formats) */
  getItemDisplayName(item: string | any): string {
    if (typeof item === 'string') {
      return item;
    }
    return item.name;
  }

  /* KB: Get display price for an item (handles both string and object formats) */
  getItemDisplayPrice(item: string | any): string | null {
    if (typeof item === 'string') {
      return null;
    }
    return "+" +item.price || null;
  }

  /* KB: Check if item has price (for conditional display) */
  hasItemPrice(item: string | any): boolean {
    if (typeof item === 'string') {
      return false;
    }
    return !!item.price && item.price !== 'R 0.00';
  }
}

import { Component, Input, Output, EventEmitter } from '@angular/core';

/* KB: Interface to define the configuration for each detail type */
export interface DetailConfig {
  title: string;
  placeholder: string;
  description?: string;
  propertyName: 'preparations' | 'variations' | 'pairings' | 'sides';
}

@Component({
  selector: 'app-menu-item-detail',
  templateUrl: './menu-item-detail.component.html',
  styleUrls: ['./menu-item-detail.component.scss']
})
export class MenuItemDetailComponent {
  /* KB: Configuration object that defines the detail type behavior */
  @Input() config!: DetailConfig;
  
  /* KB: Array of items for this detail type */
  @Input() items: string[] = [];
  
  /* KB: Current value of the new item input */
  @Input() newItemValue: string = '';
  
  /* KB: Event emitted when user wants to close this detail section */
  @Output() closeDetail = new EventEmitter<void>();
  
  /* KB: Event emitted when user adds a new item */
  @Output() addItem = new EventEmitter<void>();
  
  /* KB: Event emitted when user removes an item at specific index */
  @Output() removeItem = new EventEmitter<number>();
  
  /* KB: Event emitted when the new item input value changes */
  @Output() newItemValueChange = new EventEmitter<string>();

  /* KB: Handle closing the detail section */
  onCloseDetail() {
    this.closeDetail.emit();
  }

  /* KB: Handle adding a new item */
  onAddItem() {
    this.addItem.emit();
  }

  /* KB: Handle removing an item at specific index */
  onRemoveItem(index: number) {
    this.removeItem.emit(index);
  }

  /* KB: Handle new item input value changes */
  onNewItemValueChange(value: string) {
    this.newItemValueChange.emit(value);
  }
}

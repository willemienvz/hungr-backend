import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { MenuItemInterface, MenuService } from '../../menus/shared/menu.service';
import { Category } from '../../../shared/services/category';
import { DetailConfig } from '../menu-item-detail/menu-item-detail.component';

type DetailType = 'preparation' | 'variation' | 'pairing' | 'side';

@Component({
  selector: 'app-menu-item-form',
  templateUrl: './menu-item-form.component.html',
  styleUrls: ['./menu-item-form.component.scss']
})
export class MenuItemFormComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  @Input() menuItem!: MenuItemInterface;
  @Input() itemIndex!: number;
  @Input() categories: Category[] = [];
  @Input() newPreparation: string = '';
  @Input() newVariation: string = '';
  @Input() newPairing: string = '';
  @Input() newSide: string = '';

  @Output() removeMenuItem = new EventEmitter<number>();
  @Output() toggleDetail = new EventEmitter<{detailType: DetailType, itemIndex: number}>();
  @Output() addPreparation = new EventEmitter<number>();
  @Output() removePreparation = new EventEmitter<{itemIndex: number, prepIndex: number}>();
  @Output() addVariation = new EventEmitter<number>();
  @Output() removeVariation = new EventEmitter<{itemIndex: number, variationIndex: number}>();
  @Output() addPairing = new EventEmitter<number>();
  @Output() removePairing = new EventEmitter<{itemIndex: number, pairingIndex: number}>();
  @Output() addSide = new EventEmitter<number>();
  @Output() removeSide = new EventEmitter<{itemIndex: number, sideIndex: number}>();
  @Output() fileSelected = new EventEmitter<{event: Event, itemIndex: number}>();
  @Output() priceInput = new EventEmitter<{event: any, menuItem: MenuItemInterface}>();
  @Output() getFile = new EventEmitter<number>();
  @Output() newPreparationChange = new EventEmitter<string>();
  @Output() newVariationChange = new EventEmitter<string>();
  @Output() newPairingChange = new EventEmitter<string>();
  @Output() newSideChange = new EventEmitter<string>();

  /* KB: Add loading state for image operations */
  isUploadingImage = false;

  /* KB: Add collapsed state for collapsible form functionality */
  isCollapsed = false;

  /* KB: Define configurations for each detail type to use with the reusable component */
  preparationConfig: DetailConfig = {
    title: 'Preparation',
    placeholder: 'Add a preparation',
    description: 'Add preparation options for patrons to choose from, for example grilled or fried fish.',
    propertyName: 'preparations'
  };

  variationConfig: DetailConfig = {
    title: 'Variations',
    placeholder: 'Add a variation',
    description: 'Add variations of the menu item.',
    propertyName: 'variations'
  };

  pairingConfig: DetailConfig = {
    title: 'Pairings',
    placeholder: 'Add a pairing',
    description: 'Add menu items that will go well with this one.',
    propertyName: 'pairings'
  };

  sideConfig: DetailConfig = {
    title: 'Sides',
    placeholder: 'Add a side',
    propertyName: 'sides'
  };

  constructor(private menuService: MenuService) {}

  /* KB: Toggle collapsed state to show/hide form content */
  toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
  }

  onRemoveMenuItem() {
    this.removeMenuItem.emit(this.itemIndex);
  }

  onToggleDetail(detailType: DetailType) {
    this.toggleDetail.emit({detailType, itemIndex: this.itemIndex});
  }

  onAddPreparation() {
    this.addPreparation.emit(this.itemIndex);
  }

  onRemovePreparation(prepIndex: number) {
    this.removePreparation.emit({itemIndex: this.itemIndex, prepIndex});
  }

  onAddVariation() {
    this.addVariation.emit(this.itemIndex);
  }

  onRemoveVariation(variationIndex: number) {
    this.removeVariation.emit({itemIndex: this.itemIndex, variationIndex});
  }

  onAddPairing() {
    this.addPairing.emit(this.itemIndex);
  }

  onRemovePairing(pairingIndex: number) {
    this.removePairing.emit({itemIndex: this.itemIndex, pairingIndex});
  }

  onAddSide() {
    this.addSide.emit(this.itemIndex);
  }

  onRemoveSide(sideIndex: number) {
    this.removeSide.emit({itemIndex: this.itemIndex, sideIndex});
  }

  onFileSelected(event: Event) {
    /* KB: Handle file selection using menu service for proper Firebase upload */
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingImage = true;
      
      // Use menu service to upload to Firebase Storage
      this.menuService.uploadMenuItemImage(file)
        .then((downloadUrl) => {
          this.menuItem.imageUrl = downloadUrl;
          this.isUploadingImage = false;
        })
        .catch((error) => {
          console.error('Error uploading image:', error);
          this.isUploadingImage = false;
        });
    }
    
    // Still emit the event for parent component handling if needed
    this.fileSelected.emit({event, itemIndex: this.itemIndex});
  }

  onPriceInput(event: any) {
    this.priceInput.emit({event, menuItem: this.menuItem});
  }

  onGetFile() {
    /* KB: Trigger the hidden file input click to open file dialog */
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  /* KB: Delete image from Firebase Storage and clear preview */
  onRemoveImage() {
    if (this.menuItem.imageUrl) {
      this.isUploadingImage = true;
      
      this.menuService.deleteMenuItemImage(this.menuItem.imageUrl)
        .then(() => {
          this.menuItem.imageUrl = null;
          this.isUploadingImage = false;
        })
        .catch((error) => {
          console.error('Error deleting image:', error);
          // Still clear the URL even if deletion fails
          this.menuItem.imageUrl = null;
          this.isUploadingImage = false;
        });
    } else {
      this.menuItem.imageUrl = null;
    }
  }

  onNewPreparationChange(value: string) {
    this.newPreparationChange.emit(value);
  }

  onNewVariationChange(value: string) {
    this.newVariationChange.emit(value);
  }

  onNewPairingChange(value: string) {
    this.newPairingChange.emit(value);
  }

  onNewSideChange(value: string) {
    this.newSideChange.emit(value);
  }
} 
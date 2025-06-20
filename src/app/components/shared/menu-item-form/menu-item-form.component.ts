import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { MenuItemInterface, MenuService } from '../../menus/shared/menu.service';
import { Category } from '../../../shared/services/category';
import { DetailConfig } from '../menu-item-detail/menu-item-detail.component';
import { MatDialog } from '@angular/material/dialog';
import { ImageUploadModalComponent, ImageUploadConfig, ImageUploadData, ImageUploadResult } from '../image-upload-modal/image-upload-modal.component';

type DetailType = 'preparation' | 'variation' | 'pairing' | 'side';

@Component({
  selector: 'app-menu-item-form',
  templateUrl: './menu-item-form.component.html',
  styleUrls: ['./menu-item-form.component.scss']
})
export class MenuItemFormComponent implements OnInit {
  
  @Input() menuItem!: MenuItemInterface;
  @Input() itemIndex!: number;
  @Input() categories: Category[] = [];
  @Input() availableMenuItems: MenuItemInterface[] = []; // All menu items for pairing selection
  @Input() newPreparation: string = '';
  @Input() newVariation: string = '';
  @Input() newPairing: string = '';
  @Input() newSide: string = '';
  @Input() newLabel: string = '';

  @Output() removeMenuItem = new EventEmitter<number>();
  @Output() toggleDetail = new EventEmitter<{detailType: DetailType, itemIndex: number}>();
  @Output() addPreparation = new EventEmitter<number>();
  @Output() removePreparation = new EventEmitter<{itemIndex: number, prepIndex: number}>();
  @Output() addVariation = new EventEmitter<number>();
  @Output() removeVariation = new EventEmitter<{itemIndex: number, variationIndex: number}>();
  @Output() addPairing = new EventEmitter<number>();
  @Output() removePairing = new EventEmitter<{itemIndex: number, pairingIndex: number}>();
  @Output() addMenuItemPairing = new EventEmitter<{itemIndex: number, pairingId: string}>();
  @Output() removeMenuItemPairing = new EventEmitter<{itemIndex: number, pairingId: string}>();
  @Output() addSide = new EventEmitter<number>();
  @Output() removeSide = new EventEmitter<{itemIndex: number, sideIndex: number}>();
  @Output() addLabel = new EventEmitter<number>();
  @Output() removeLabel = new EventEmitter<{itemIndex: number, labelIndex: number}>();
  @Output() fileSelected = new EventEmitter<{event: Event, itemIndex: number}>();
  @Output() priceInput = new EventEmitter<{event: any, menuItem: MenuItemInterface}>();
  @Output() getFile = new EventEmitter<number>();
  @Output() newPreparationChange = new EventEmitter<string>();
  @Output() newVariationChange = new EventEmitter<string>();
  @Output() newPairingChange = new EventEmitter<string>();
  @Output() newSideChange = new EventEmitter<string>();
  @Output() newLabelChange = new EventEmitter<string>();

  /* KB: Add loading state for image operations */
  isUploadingImage = false;

  /* KB: Add collapsed state for collapsible form functionality */
  isCollapsed = true;

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

  labelConfig: DetailConfig = {
    title: 'Labels',
    placeholder: 'Add a label',
    description: 'Add labels to categorize your menu items.',
    propertyName: 'labels'
  };

  constructor(
    private menuService: MenuService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    // Initialize imageUrls array for backward compatibility
    this.initializeImageUrls();
    
    // Set collapsed state based on whether this is a new/empty menu item
    // New items created by createMenuItem() have: name='', description='', price='R ', imageUrl=null
    const isNewItem = !this.menuItem.name && 
                     !this.menuItem.description && 
                     (this.menuItem.price === 'R ' || !this.menuItem.price) && 
                     !this.menuItem.imageUrl;
    
    this.isCollapsed = !isNewItem;
  }

  private initializeImageUrls() {
    // Initialize imageUrls array if it doesn't exist (backward compatibility)
    if (!this.menuItem.imageUrls) {
      this.menuItem.imageUrls = this.menuItem.imageUrl ? [this.menuItem.imageUrl] : [];
    }
    // If imageUrls exists but imageUrl doesn't, set imageUrl for backward compatibility
    else if (this.menuItem.imageUrls.length > 0 && !this.menuItem.imageUrl) {
      this.menuItem.imageUrl = this.menuItem.imageUrls[0];
    }
  }

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

  onAddMenuItemPairing(pairingId: string) {
    this.addMenuItemPairing.emit({itemIndex: this.itemIndex, pairingId});
  }

  onRemoveMenuItemPairing(pairingId: string) {
    this.removeMenuItemPairing.emit({itemIndex: this.itemIndex, pairingId});
  }

  onAddSide() {
    this.addSide.emit(this.itemIndex);
  }

  onRemoveSide(sideIndex: number) {
    this.removeSide.emit({itemIndex: this.itemIndex, sideIndex});
  }

  onAddLabel() {
    this.addLabel.emit(this.itemIndex);
  }

  onRemoveLabel(labelIndex: number) {
    this.removeLabel.emit({itemIndex: this.itemIndex, labelIndex});
  }

  onFileSelected(event: Event) {
    /* KB: Legacy method - now handled by modal */
    this.fileSelected.emit({event, itemIndex: this.itemIndex});
  }

  onPriceInput(event: any) {
    this.priceInput.emit({event, menuItem: this.menuItem});
  }

  onPriceKeypress(event: KeyboardEvent) {
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right arrows
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight'];
    
    // Allow decimal point (only one)
    if (event.key === '.' && !(event.target as HTMLInputElement).value.includes('.')) {
      return;
    }
    
    // Allow allowed keys
    if (allowedKeys.includes(event.key)) {
      return;
    }
    
    // Allow numbers 0-9
    if (event.key >= '0' && event.key <= '9') {
      return;
    }
    
    // Block everything else
    event.preventDefault();
  }

  onGetFile() {
    /* KB: Open image upload modal for multiple image upload */
    const config: ImageUploadConfig = {
      title: 'Upload Images',
      formats: ['PNG', 'JPG'],
      maxFileSize: 500,
      dimensions: '1080x1080',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      allowMultiple: true,
      maxFiles: 3
    };

    // Initialize imageUrls array if it doesn't exist (backward compatibility)
    if (!this.menuItem.imageUrls) {
      this.menuItem.imageUrls = this.menuItem.imageUrl ? [this.menuItem.imageUrl] : [];
    }

    const data: ImageUploadData = {
      config,
      currentImageUrls: this.menuItem.imageUrls
    };

    const dialogRef = this.dialog.open(ImageUploadModalComponent, {
      width: '650px',
      data,
      disableClose: true,
      panelClass: 'image-upload-modal-panel'
    });

    dialogRef.afterClosed().subscribe((result: ImageUploadResult) => {
      if (result?.action === 'save') {
        // Handle new files
        if (result.files && result.files.length > 0) {
          this.isUploadingImage = true;
          this.uploadMultipleImages(result.files, result.imageUrls || []);
        }
        // Handle existing images only
        else if (result.imageUrls) {
          this.menuItem.imageUrls = [...result.imageUrls];
          // Update legacy imageUrl for backward compatibility
          this.menuItem.imageUrl = this.menuItem.imageUrls.length > 0 ? this.menuItem.imageUrls[0] : null;
        }
      } else if (result?.action === 'remove') {
        this.removeAllImages();
      }
    });
  }

  private async uploadMultipleImages(files: File[], existingUrls: string[]) {
    try {
      // Start with existing URLs
      const newUrls = [...existingUrls];

      // Upload each file
      for (const file of files) {
        const uploadedUrl = await this.menuService.uploadMenuItemImage(file);
        newUrls.push(uploadedUrl);
      }

      this.menuItem.imageUrls = newUrls;
      // Update legacy imageUrl for backward compatibility
      this.menuItem.imageUrl = newUrls.length > 0 ? newUrls[0] : null;
      this.isUploadingImage = false;
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      this.isUploadingImage = false;
    }
  }

  /* KB: Delete specific image from Firebase Storage and remove from array */
  onRemoveImage(index: number) {
    if (!this.menuItem.imageUrls || index >= this.menuItem.imageUrls.length) return;

    const imageUrl = this.menuItem.imageUrls[index];
    if (imageUrl) {
      this.isUploadingImage = true;
      
      this.menuService.deleteMenuItemImage(imageUrl)
        .then(() => {
          this.menuItem.imageUrls.splice(index, 1);
          // Update legacy imageUrl for backward compatibility
          this.menuItem.imageUrl = this.menuItem.imageUrls.length > 0 ? this.menuItem.imageUrls[0] : null;
          this.isUploadingImage = false;
        })
        .catch((error) => {
          console.error('Error deleting image:', error);
          // Still remove from array even if deletion fails
          this.menuItem.imageUrls.splice(index, 1);
          this.menuItem.imageUrl = this.menuItem.imageUrls.length > 0 ? this.menuItem.imageUrls[0] : null;
          this.isUploadingImage = false;
        });
    }
  }

  /* KB: Remove all images */
  removeAllImages() {
    if (this.menuItem.imageUrls && this.menuItem.imageUrls.length > 0) {
      // Delete all images from Firebase Storage
      const deletePromises = this.menuItem.imageUrls.map(url => 
        this.menuService.deleteMenuItemImage(url).catch(error => 
          console.error('Error deleting image:', error)
        )
      );
      
      Promise.allSettled(deletePromises).then(() => {
        this.menuItem.imageUrls = [];
        this.menuItem.imageUrl = null;
      });
    } else {
      this.menuItem.imageUrls = [];
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

  onNewLabelChange(value: string) {
    this.newLabelChange.emit(value);
  }
} 
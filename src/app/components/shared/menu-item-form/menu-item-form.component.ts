import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { MenuItemInterface, MenuService, SideItem } from '../../menus/shared/menu.service';
import { Category } from '../../../shared/services/category';
import { DetailConfig, DetailType } from '../menu-item-detail/menu-item-detail.component';
import { SideDetailConfig } from '../side-detail/side-detail.component';
import { AllergenDetailConfig } from '../allergen-detail/allergen-detail.component';
import { MatDialog } from '@angular/material/dialog';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../delete-confirmation-modal/delete-confirmation-modal.component';
import { MediaUploadModalService } from '../../../shared/services/media-upload-modal.service';
import { MediaLibraryService } from '../../../shared/services/media-library.service';
import { MediaItem } from '../../../shared/types/media';

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
  @Input() newPreparationPrice: string = 'R 0.00';
  @Input() newVariation: string = '';
  @Input() newVariationPrice: string = 'R 0.00';
  @Input() newPairing: string = '';
  @Input() newSideName: string = '';
  @Input() newSidePrice: string = 'R 0.00';
  @Input() newAllergen: string = '';
  @Input() newLabel: string = '';
  @Input() newSauce: string = '';
  @Input() newSaucePrice: string = 'R 0.00';

  @Output() removeMenuItem = new EventEmitter<number>();
  @Output() toggleDetail = new EventEmitter<{detailType: DetailType, itemIndex: number}>();
  @Output() addPreparation = new EventEmitter<{itemIndex: number, prepData: {name: string, price?: string}}>();
  @Output() removePreparation = new EventEmitter<{itemIndex: number, prepIndex: number}>();
  @Output() addVariation = new EventEmitter<{itemIndex: number, variationData: {name: string, price?: string}}>();
  @Output() removeVariation = new EventEmitter<{itemIndex: number, variationIndex: number}>();
  @Output() addPairing = new EventEmitter<number>();
  @Output() removePairing = new EventEmitter<{itemIndex: number, pairingIndex: number}>();
  @Output() addMenuItemPairing = new EventEmitter<{itemIndex: number, pairingId: string}>();
  @Output() removeMenuItemPairing = new EventEmitter<{itemIndex: number, pairingId: string}>();
  @Output() addSide = new EventEmitter<{itemIndex: number, sideData: {name: string, price?: string}}>();
  @Output() removeSide = new EventEmitter<{itemIndex: number, sideIndex: number}>();
  @Output() addAllergen = new EventEmitter<{itemIndex: number, allergenName: string}>();
  @Output() removeAllergen = new EventEmitter<{itemIndex: number, allergenIndex: number}>();
  @Output() addSauce = new EventEmitter<{itemIndex: number, sauceData: {name: string, price?: string}}>();
  @Output() removeSauce = new EventEmitter<{itemIndex: number, sauceIndex: number}>();
  @Output() addLabel = new EventEmitter<number>();
  @Output() removeLabel = new EventEmitter<{itemIndex: number, labelIndex: number}>();
  @Output() fileSelected = new EventEmitter<{event: Event, itemIndex: number}>();
  // Removed @Output() priceInput - handled by PriceInputComponent directly
  @Output() getFile = new EventEmitter<number>();
  @Output() newPreparationChange = new EventEmitter<string>();
  @Output() newPreparationPriceChange = new EventEmitter<string>();
  @Output() newVariationChange = new EventEmitter<string>();
  @Output() newVariationPriceChange = new EventEmitter<string>();
  @Output() newPairingChange = new EventEmitter<string>();
  @Output() newSideNameChange = new EventEmitter<string>();
  @Output() newSidePriceChange = new EventEmitter<string>();
  @Output() newAllergenChange = new EventEmitter<string>();
  @Output() newLabelChange = new EventEmitter<string>();
  @Output() newSauceChange = new EventEmitter<string>();
  @Output() newSaucePriceChange = new EventEmitter<string>();
  
  // Custom heading change events
  @Output() customHeadingChange = new EventEmitter<{detailType: DetailType, itemIndex: number, heading: string}>();

  /* KB: Add loading state for image operations */
  isUploadingImage = false;

  /* KB: Add collapsed state for collapsible form functionality */
  isCollapsed = true;

  /* KB: Define configurations for each detail type to use with the reusable component */
  preparationConfig: DetailConfig = {
    title: 'Preparation',
    placeholder: 'Add a preparation',
    description: 'Add preparation options for patrons to choose from, for example grilled or fried fish.',
    propertyName: 'preparations',
    showPricing: true,
    customHeading: ''
  };

  variationConfig: DetailConfig = {
    title: 'Variations',
    placeholder: 'Add a variation',
    description: 'Add variations of the menu item.',
    propertyName: 'variations',
    showPricing: true,
    customHeading: ''
  };

  pairingConfig: DetailConfig = {
    title: 'Pairings',
    placeholder: 'Add a pairing',
    description: 'Add menu items that will go well with this one.',
    propertyName: 'pairings',
    customHeading: ''
  };

  sideConfig: SideDetailConfig = {
    title: 'Sides',
    placeholder: 'Add a side',
    description: 'Add side options with optional pricing.',
    showPricing: true,
    customHeading: ''
  };

  allergenConfig: AllergenDetailConfig = {
    title: 'Allergens',
    placeholder: 'Add an allergen',
    description: 'Add allergen information for food safety and compliance.',
    customHeading: ''
  };

  labelConfig: DetailConfig = {
    title: 'Labels',
    placeholder: 'Add a label',
    description: 'Add labels to categorize your menu items.',
    propertyName: 'labels'
  };

  saucesConfig: DetailConfig = {
    title: 'Sauces',
    placeholder: 'Add a sauce',
    description: 'Add sauce options for this menu item, e.g., tartar, aioli, peri-peri.',
    propertyName: 'sauces',
    showPricing: true,
    customHeading: ''
  };

  constructor(
    private menuService: MenuService,
    private dialog: MatDialog,
    private mediaUploadModalService: MediaUploadModalService,
    private mediaLibraryService: MediaLibraryService
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
    
    // Initialize custom headings from menuItem
    this.updateConfigCustomHeadings();
    
    // Debug: Log current category assignment if it exists
    if (this.menuItem.categoryId) {
      this.logCategoryAssignment();
    }
  }

  /* KB: Debug method to log category assignment details */
  private logCategoryAssignment() {
    const categoryInfo = this.menuService.findCategoryById(this.categories, this.menuItem.categoryId!);
    if (categoryInfo) {
      if (categoryInfo.subcategory) {
        console.log(`Menu item "${this.menuItem.name}" assigned to subcategory: ${categoryInfo.subcategory.name} (ID: ${categoryInfo.subcategory.id}) under ${categoryInfo.category.name}`);
      } else {
        console.log(`Menu item "${this.menuItem.name}" assigned to main category: ${categoryInfo.category.name} (ID: ${categoryInfo.category.id})`);
      }
    } else {
      console.warn(`Menu item "${this.menuItem.name}" has categoryId ${this.menuItem.categoryId} but no matching category found`);
    }
  }

  /* KB: Handle category selection change for debugging */
  onCategorySelectionChange(event: any) {
    const selectedCategoryId = event.value;
    console.log(`Category selection changed for "${this.menuItem.name}" to ID: ${selectedCategoryId}`);
    
    if (selectedCategoryId) {
      const categoryInfo = this.menuService.findCategoryById(this.categories, selectedCategoryId);
      if (categoryInfo) {
        if (categoryInfo.subcategory) {
          console.log(`✅ Successfully assigned to subcategory: ${categoryInfo.subcategory.name} (ID: ${categoryInfo.subcategory.id}) under ${categoryInfo.category.name}`);
        } else {
          console.log(`✅ Successfully assigned to main category: ${categoryInfo.category.name} (ID: ${categoryInfo.category.id})`);
        }
      } else {
        console.error(`❌ Selected category ID ${selectedCategoryId} not found in category structure`);
      }
    } else {
      console.log(`Category cleared for "${this.menuItem.name}"`);
    }
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
    const data: DeleteConfirmationData = {
      title: 'Remove Menu Item',
      itemName: this.menuItem.name || 'Unnamed Menu Item',
      itemType: 'menu item',
      message: `Are you sure you want to remove "${this.menuItem.name || 'this menu item'}" from the menu? This action cannot be undone.`,
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.removeMenuItem.emit(this.itemIndex);
      }
    });
  }

  onToggleDetail(detailType: DetailType) {
    this.toggleDetail.emit({detailType, itemIndex: this.itemIndex});
  }

  onAddPreparation(prepData: {name: string, price?: string}) {
    this.addPreparation.emit({itemIndex: this.itemIndex, prepData});
  }

  onRemovePreparation(prepIndex: number) {
    this.removePreparation.emit({itemIndex: this.itemIndex, prepIndex});
  }

  onAddVariation(variationData: {name: string, price?: string}) {
    this.addVariation.emit({itemIndex: this.itemIndex, variationData});
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

  onAddSide(sideData: {name: string, price?: string}) {
    this.addSide.emit({itemIndex: this.itemIndex, sideData});
  }

  onRemoveSide(sideIndex: number) {
    this.removeSide.emit({itemIndex: this.itemIndex, sideIndex});
  }

  onAddAllergen(allergenName: string) {
    this.addAllergen.emit({itemIndex: this.itemIndex, allergenName});
  }

  onRemoveAllergen(allergenIndex: number) {
    this.removeAllergen.emit({itemIndex: this.itemIndex, allergenIndex});
  }

  onAddSauce(sauceData: {name: string, price?: string}) {
    this.addSauce.emit({itemIndex: this.itemIndex, sauceData});
  }

  onRemoveSauce(sauceIndex: number) {
    this.removeSauce.emit({itemIndex: this.itemIndex, sauceIndex});
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

  // Price input handling is now managed by PriceInputComponent
  // Removed onPriceInput() and onPriceKeypress() methods

  onGetFile() {
    /* KB: Open image upload modal for multiple image upload */
    const dialogRef = this.mediaUploadModalService.openMenuItemImageUploadWithLibrary(
      this.menuItem.itemId || 'new',
      false // Start with upload tab, but media library tab is also available
    );

    // Initialize imageUrls array if it doesn't exist (backward compatibility)
    if (!this.menuItem.imageUrls) {
      this.menuItem.imageUrls = this.menuItem.imageUrl ? [this.menuItem.imageUrl] : [];
    }

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'save') {
        // Handle new files
        if (result.mediaItems && result.mediaItems.length > 0) {
          this.isUploadingImage = true;
          this.onMenuImagesUploaded(result.mediaItems);
        }
        // Handle existing images only
        else if (result.existingMediaUrls) {
          this.menuItem.imageUrls = [...result.existingMediaUrls];
          // Update legacy imageUrl for backward compatibility
          this.menuItem.imageUrl = this.menuItem.imageUrls.length > 0 ? this.menuItem.imageUrls[0] : null;
        }
      } else if (result?.action === 'remove') {
        this.removeAllImages();
      } else if (result && !result.action) {
        // Handle single media item selection from library
        if (result.id && result.url) {
          this.isUploadingImage = true;
          this.onMenuImagesUploaded([result]);
        }
      }
    });
  }

  private async onMenuImagesUploaded(mediaItems: MediaItem[]): Promise<void> {
    try {
      this.isUploadingImage = true;
      
      // Update menu item with media library references
      const newUrls = mediaItems.map(item => item.url);
      this.menuItem.imageUrls = newUrls;
      this.menuItem.imageUrl = newUrls.length > 0 ? newUrls[0] : null;
      
      // Track usage in media library
      for (const mediaItem of mediaItems) {
        await this.mediaLibraryService.trackMediaUsage(mediaItem.id, {
          componentType: 'menuItem',
          componentId: this.menuItem.itemId || 'new',
          componentName: this.menuItem?.name || 'Menu Item',
          usageDate: new Date(),
          fieldName: 'images'
        });
      }

      this.isUploadingImage = false;
    } catch (error) {
      console.error('Error updating menu images:', error);
      this.isUploadingImage = false;
    }
  }

  /* KB: Delete specific image from Firebase Storage and remove from array */
  confirmRemoveImage(index: number) {
    if (!this.menuItem.imageUrls || index >= this.menuItem.imageUrls.length) return;

    const data: DeleteConfirmationData = {
      title: 'Delete Image',
      itemName: `Image ${index + 1}`,
      itemType: 'image',
      message: 'Are you sure you want to delete this image? This action cannot be undone.',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.onRemoveImage(index);
      }
    });
  }

  private onRemoveImage(index: number) {
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

  onNewSideNameChange(value: string) {
    this.newSideNameChange.emit(value);
  }

  onNewSidePriceChange(value: string) {
    this.newSidePriceChange.emit(value);
  }

  onNewAllergenChange(value: string) {
    this.newAllergenChange.emit(value);
  }

  onNewLabelChange(value: string) {
    this.newLabelChange.emit(value);
  }

  onNewSauceChange(value: string) {
    this.newSauceChange.emit(value);
  }

  onNewPreparationPriceChange(value: string) {
    this.newPreparationPriceChange.emit(value);
  }

  onNewVariationPriceChange(value: string) {
    this.newVariationPriceChange.emit(value);
  }

  onNewSaucePriceChange(value: string) {
    this.newSaucePriceChange.emit(value);
  }

  // Custom heading change handlers
  onCustomHeadingChange(detailType: DetailType, heading: string) {
    this.customHeadingChange.emit({
      detailType,
      itemIndex: this.itemIndex,
      heading
    });
  }

  // Update config custom headings from menuItem
  private updateConfigCustomHeadings() {
    if (this.menuItem?.customHeadings) {
      this.preparationConfig.customHeading = this.menuItem.customHeadings.preparation || '';
      this.variationConfig.customHeading = this.menuItem.customHeadings.variation || '';
      this.pairingConfig.customHeading = this.menuItem.customHeadings.pairing || '';
      this.sideConfig.customHeading = this.menuItem.customHeadings.side || '';
      this.allergenConfig.customHeading = this.menuItem.customHeadings.allergen || '';
      this.saucesConfig.customHeading = this.menuItem.customHeadings.sauce || '';
    }
  }
} 
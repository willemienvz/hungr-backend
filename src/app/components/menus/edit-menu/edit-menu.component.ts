import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';
import { Papa } from 'ngx-papaparse';
import { v4 as uuidv4 } from 'uuid';
import { Category } from '../../../shared/services/category';
import { Restaurant } from '../../../shared/services/restaurant';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MenuService, MenuItemInterface, SideItem, PreparationItem, VariationItem, SauceItem } from '../shared/menu.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-edit-menu',
  templateUrl: './edit-menu.component.html',
  styleUrls: ['./edit-menu.component.scss'],
})
export class EditMenuComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  step = 1;
  logoUrl: string | null = null;
  restaurantName: string = '';
  menuName: string = '';
  selectedRestaurant: string = '';
  categories: Category[] = [];
  menuItems: MenuItemInterface[] = [];
  restaurants: Restaurant[] = [];
  menuID: string = '';
  currentStep: number = 1;
  newCategoryName: string = '';
  newSubcategoryName: string[] = [];
  isPopupMenuOpen: boolean[] = [];
  isAddInputVisible: boolean[] = [];
  newPreparation: string = '';
  // Removed newPreparationPrice - preparations no longer have pricing
  newVariation: string = '';
  newVariationPrice: string = '';
  newPairing: string = '';
  newSideName: string = '';
  newSidePrice: string = '';
  newAllergen: string = '';
  newSauce: string = '';
  newSaucePrice: string = '';
  newLabel: string = '';
  isSaving: boolean = false;
  tempNum: number = 0;
  menuNameError: boolean = false;
  restaurantError: boolean = false;
  addRestaurantLater: boolean = false;
  uploadFilePopUp: boolean = false;
  isDuplicateMenuName: boolean = false;
  originalMenuName: string = '';
  
  // Filter properties
  selectedCategoryFilter: number | null = null;
  searchTerm: string = '';
  filteredMenuItems: MenuItemInterface[] = [];
  
  // Navigation safety properties
  hasUnsavedChanges: boolean = false;
  
  constructor(
    private readonly firestore: AngularFirestore,
    private readonly storage: AngularFireStorage,
    private readonly papa: Papa,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly menuService: MenuService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.menuID = params['menuID'];
      
      // Read step from route parameter
      const step = params['step'];
      if (step) {
        const stepNumber = parseInt(step, 10);
        if (stepNumber >= 1 && stepNumber <= 5) {
          this.currentStep = stepNumber;
        } else {
          // Invalid step, redirect to step 1
          this.router.navigate(['/menus/edit-menu', this.menuID, 1], { replaceUrl: true });
        }
      } else {
        // No step specified, default to step 1
        this.currentStep = 1;
        this.router.navigate(['/menus/edit-menu', this.menuID, 1], { replaceUrl: true });
      }
    });
    this.loadMenuData();
    this.fetchRestaurants();
  }

  // Navigation safety methods
  private markAsChanged() {
    this.hasUnsavedChanges = true;
  }

  private markAsSaved() {
    this.hasUnsavedChanges = false;
  }

  async navigateWithUnsavedChangesCheck(route: string | any[]) {
    if (this.hasUnsavedChanges) {
      const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
        width: '400px',
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result === true) {
          if (Array.isArray(route)) {
            this.router.navigate(route);
          } else {
            this.router.navigate([route]);
          }
        }
      });
    } else {
      if (Array.isArray(route)) {
        this.router.navigate(route);
      } else {
        this.router.navigate([route]);
      }
    }
  }

  onBackButtonClick() {
    this.navigateWithUnsavedChangesCheck(['/menus']);
  }

  addPreparation(data: {itemIndex: number, prepData: {name: string}}): void {
    const { itemIndex, prepData } = data;
    
    // Simplified - just add the name as a string
    this.menuItems[itemIndex].preparations.push(prepData.name);
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  removePreparation(itemIndex: number, prepIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'preparations', prepIndex);
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  addVariation(data: {itemIndex: number, variationData: {name: string, price?: string}}): void {
    const { itemIndex, variationData } = data;
    
    // Create variation item - either string or VariationItem object based on whether price is provided
    let variationItem: string | VariationItem;
    if (variationData.price && variationData.price !== 'R 0.00' && variationData.price.trim() !== '') {
      variationItem = {
        name: variationData.name,
        price: variationData.price
      };
    } else {
      variationItem = variationData.name; // Backward compatibility - store as string
    }
    
    // Add to variations array
    this.menuItems[itemIndex].variations.push(variationItem);
    
    // Clear the price input after adding
    this.newVariationPrice = '';
    
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  removeVariation(itemIndex: number, variationIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'variations', variationIndex);
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  addPairing(itemIndex: number): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'pairings', this.newPairing);
    this.newPairing = '';
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  removePairing(itemIndex: number, pairingIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'pairings', pairingIndex);
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  addMenuItemPairing(data: {itemIndex: number, pairingId: string}): void {
    this.menuItems = this.menuService.addMenuItemPairing(this.menuItems, data.itemIndex, data.pairingId);
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  removeMenuItemPairing(data: {itemIndex: number, pairingId: string}): void {
    this.menuItems = this.menuService.removeMenuItemPairing(this.menuItems, data.itemIndex, data.pairingId);
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  addSide(data: {itemIndex: number, sideData: {name: string, price?: string}}): void {
    const { itemIndex, sideData } = data;
    
    // Create side item - either string or SideItem object based on whether price is provided
    let sideItem: string | SideItem;
    if (sideData.price && sideData.price !== 'R 0.00' && sideData.price.trim() !== '') {
      sideItem = {
        name: sideData.name,
        price: sideData.price
      };
    } else {
      sideItem = sideData.name; // Backward compatibility - store as string
    }
    
    // Add to sides array
    this.menuItems[itemIndex].sides.push(sideItem);
    
    // Clear the price input after adding
    this.newSidePrice = '';
    
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  addLabel(itemIndex: number): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'labels', this.newLabel);
    this.newLabel = '';
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  removeSide(itemIndex: number, sideIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'sides', sideIndex);
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  addAllergen(data: {itemIndex: number, allergenName: string}): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, data.itemIndex, 'allergens', data.allergenName);
    this.newAllergen = '';
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  removeAllergen(itemIndex: number, allergenIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'allergens', allergenIndex);
    this.markAsChanged();
  }

  addSauce(data: {itemIndex: number, sauceData: {name: string, price?: string}}): void {
    const { itemIndex, sauceData } = data;
    
    // Create sauce item - either string or SauceItem object based on whether price is provided
    let sauceItem: string | SauceItem;
    if (sauceData.price && sauceData.price !== 'R 0.00' && sauceData.price.trim() !== '') {
      sauceItem = {
        name: sauceData.name,
        price: sauceData.price
      };
    } else {
      sauceItem = sauceData.name; // Backward compatibility - store as string
    }
    
    // Add to sauces array
    this.menuItems[itemIndex].sauces.push(sauceItem);
    
    // Clear the price input after adding
    this.newSaucePrice = '';
    
    this.markAsChanged();
  }

  removeSauce(itemIndex: number, sauceIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'sauces', sauceIndex);
    this.markAsChanged();
  }

  removeLabel(itemIndex: number, labelIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'labels', labelIndex);
    this.applyFilters(); // Update filtered view to reflect changes
    this.markAsChanged();
  }

  loadMenuData() {
    this.menuService.loadMenu(this.menuID).subscribe((menu: any) => {
      if (menu) {
        this.menuName = menu.menuName;
        this.originalMenuName = menu.menuName;
        this.selectedRestaurant = menu.restaurantID;
        
        // Check for ID conflicts in the original data
        const originalCategories = menu.categories || [];
        const conflictCheck = this.menuService.checkCategoryIdConflicts(originalCategories);
        
        if (conflictCheck.hasConflicts) {
          console.warn('Category ID conflicts detected in loaded menu data:', conflictCheck.conflicts);
          console.log('Applying fix for category IDs...');
        }
        
        // Fix any duplicate category IDs that may exist in older data
        this.categories = this.menuService.fixCategoryIds(originalCategories);
        
        // Verify the fix worked
        const fixedConflictCheck = this.menuService.checkCategoryIdConflicts(this.categories);
        if (!fixedConflictCheck.hasConflicts) {
          console.log('Category ID conflicts resolved successfully');
        } else {
          console.error('Category ID conflicts still exist after fix:', fixedConflictCheck.conflicts);
        }
        
        // Display the final category structure for debugging
        this.menuService.displayCategoryStructure(this.categories);
        
        // Convert existing preparations from objects to strings if needed
        const items = menu.items || [];
        this.menuItems = items.map(item => ({
          ...item,
          preparations: this.menuService.convertPreparationsToStrings(item.preparations || [])
        }));
        this.addRestaurantLater = menu.addRestaurantLater || false;
        this.initializeArrays();
        this.applyFilters(); // Initialize filters
        console.log('Loaded menu data:', menu);
        console.log('Fixed categories:', this.categories);
      }
    });
  }

  initializeArrays() {
    this.newSubcategoryName = this.menuService.initializeArrays(this.categories.length);
    this.isPopupMenuOpen = Array(this.categories.length).fill(false);
    this.isAddInputVisible = Array(this.categories.length).fill(false);
  }

  getFile(itemIndex: number): void {
    this.tempNum = itemIndex;
    this.fileInput.nativeElement.click();
  }

  // Price input handling is now managed by PriceInputComponent
  // Removed onPriceInput() method

  fetchRestaurants() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const ownerId = user.uid;
    this.menuService.fetchRestaurants(ownerId).subscribe((restaurants) => {
      this.restaurants = restaurants;
      console.log(restaurants);
    });
  }

  validateMenuName() {
    this.menuNameError = !this.menuService.validateMenuName(this.menuName);
    this.checkDuplicateMenuName(this.menuName);
  }

  // Add duplicate check method
  checkDuplicateMenuName(menuName: string): void {
    if (!menuName || !menuName.trim()) {
      this.isDuplicateMenuName = false;
      return;
    }

    // Don't check if it's the same as the original name (for edit mode)
    if (menuName.trim().toLowerCase() === this.originalMenuName.toLowerCase()) {
      this.isDuplicateMenuName = false;
      return;
    }

    const user = JSON.parse(localStorage.getItem('user')!);
    this.menuService.checkDuplicateMenuName(menuName, user.uid, this.menuID)
      .subscribe((isDuplicate) => {
        this.isDuplicateMenuName = isDuplicate;
      });
  }

  // Add method to handle name changes
  onMenuNameChange(name: string): void {
    this.menuName = name;
    this.checkDuplicateMenuName(name);
  }

  validateRestaurant() {
    this.restaurantError = !this.addRestaurantLater && !this.menuService.validateRestaurant(this.selectedRestaurant);
  }

  onAddRestaurantLaterChange(checked: boolean) {
    this.addRestaurantLater = checked;
    if (checked) {
      this.selectedRestaurant = '';
      this.restaurantError = false;
    } else {
      this.validateRestaurant();
    }
  }

  nextStep() {
    if (this.currentStep === 1) {
      this.validateMenuName();
      this.validateRestaurant();
      if (this.menuNameError || this.restaurantError) {
        return;
      }
    }
    if (this.currentStep < 5) {
      const nextStep = this.currentStep + 1;
      if (nextStep === 4 && this.menuItems.length === 0) {
        this.menuItems = this.menuService.addMenuItem(this.menuItems);
      }
      this.router.navigate(['/menus/edit-menu', this.menuID, nextStep]);
    }
  }

  nextStepLast() {
    this.saveMenu();
    this.router.navigate(['/menus/edit-menu', this.menuID, this.currentStep + 1]);
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.router.navigate(['/menus/edit-menu', this.menuID, this.currentStep - 1]);
    }
  }

  navigateToStep(step: number): void {
    if ((step < this.currentStep && step >= 1) || (this.currentStep === 3 && step === 4)) {
      if (step === 4 && this.menuItems.length === 0) {
        this.menuItems = this.menuService.addMenuItem(this.menuItems);
      }
      this.router.navigate(['/menus/edit-menu', this.menuID, step]);
    }
  }

  closePopupuploadFile() {
    this.uploadFilePopUp = false;
  }

  openPopupuploadFile() {
    this.uploadFilePopUp = true;
  }


  downloadTemplate() {
    this.menuService.downloadTemplate();
  }


  saveMenu() {
    // Add duplicate name check
    if (this.isDuplicateMenuName) {
      this.toastr.error('A menu with this name already exists. Please choose a different name.');
      return;
    }

    this.isSaving = true;

    // Double-check that category IDs are still unique before saving
    const conflictCheck = this.menuService.checkCategoryIdConflicts(this.categories);
    if (conflictCheck.hasConflicts) {
      console.warn('Category ID conflicts detected before saving, re-applying fix...');
      this.categories = this.menuService.fixCategoryIds(this.categories);
    }

    const updatedMenu = {
      menuName: this.menuName,
      restaurantID: this.addRestaurantLater ? '' : this.selectedRestaurant,
      categories: this.categories,
      items: this.menuItems,
      addRestaurantLater: this.addRestaurantLater
    };

    console.log('Saving menu with fixed categories:', this.categories);

    this.menuService.updateMenu(this.menuID, updatedMenu)
      .then(() => {
        this.isSaving = false;
        this.markAsSaved();
        console.log('Menu updated successfully with fixed category IDs!');
      })
      .catch((error) => {
        console.error('Error updating menu:', error);
        this.isSaving = false;
      });
  }

  addCategory() {
    this.categories = this.menuService.addCategory(this.categories, this.newCategoryName);
    this.newCategoryName = '';
    this.initializeArrays();
    this.markAsChanged();
  }

  addSubCategory(categoryIndex: number) {
    this.categories = this.menuService.addSubCategory(this.categories, categoryIndex, this.newSubcategoryName[categoryIndex]);
    this.newSubcategoryName[categoryIndex] = '';
    this.markAsChanged();
  }

  deleteCategory(index: number) {
    const categoryName = this.categories[index]?.name || 'Category';
    
    const data: DeleteConfirmationData = {
      title: 'Delete Category',
      itemName: categoryName,
      itemType: 'category',
      message: `Are you sure you want to delete the category "${categoryName}"? This action will also remove all subcategories and cannot be undone.`,
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
        this.categories = this.menuService.deleteCategory(this.categories, index);
        this.initializeArrays();
        this.markAsChanged();
      }
    });
  }

  deleteSubCategory(categoryIndex: number, subcategoryIndex: number) {
    const subcategoryName = this.categories[categoryIndex]?.subcategories?.[subcategoryIndex]?.name || 'Subcategory';
    
    const data: DeleteConfirmationData = {
      title: 'Delete Subcategory',
      itemName: subcategoryName,
      itemType: 'subcategory',
      message: `Are you sure you want to delete the subcategory "${subcategoryName}"? This action cannot be undone.`,
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
        this.categories = this.menuService.deleteSubCategory(this.categories, categoryIndex, subcategoryIndex);
        this.markAsChanged();
      }
    });
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  setAsDraft() {
    const updatedMenu = {
      menuName: this.menuName,
      restaurantID: this.addRestaurantLater ? '' : this.selectedRestaurant,
      categories: this.categories,
      items: this.menuItems,
      isDraft: true,
      Status: 'draft',
      addRestaurantLater: this.addRestaurantLater
    };
    this.menuService.updateMenu(this.menuID, updatedMenu);
    this.markAsSaved();
  }

  setAsPublished() {
    const updatedMenu = {
      menuName: this.menuName,
      restaurantID: this.addRestaurantLater ? '' : this.selectedRestaurant,
      categories: this.categories,
      items: this.menuItems,
      isDraft: false,
      Status: 'published',
      addRestaurantLater: this.addRestaurantLater
    };
    this.menuService.updateMenu(this.menuID, updatedMenu);
    this.markAsSaved();
  }

  addMenuItem() {
    this.menuItems = this.menuService.addMenuItem(this.menuItems);
    this.applyFilters();
    this.markAsChanged();
  }

  removeMenuItem(index: number) {
    this.menuItems = this.menuService.removeMenuItem(this.menuItems, index);
    this.applyFilters();
    this.markAsChanged();
  }

  toggleDetail(
    detailType: 'preparation' | 'variation' | 'pairing' | 'side' | 'allergen' | 'sauce',
    itemIndex: number
  ) {
    this.menuItems = this.menuService.toggleDetail(this.menuItems, detailType, itemIndex);
    this.markAsChanged();
  }

  onFileSelected(event: Event, itemIndex: number): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.menuService.uploadMenuItemImage(file).then(url => {
        this.menuItems = this.menuService.updateMenuItemImage(this.menuItems, itemIndex, url);
        this.markAsChanged();
      }).catch(error => {
        console.error('Error uploading image:', error);
        this.toastr.error('Error uploading image');
      });
    }
  }

  onMenuItemDrop(event: CdkDragDrop<MenuItemInterface[]>) {
    // For filtered view, we need to handle reordering differently
    if (this.selectedCategoryFilter !== null || this.searchTerm) {
      // If filtering is active, reorder within the filtered array and then update the original
      moveItemInArray(this.filteredMenuItems, event.previousIndex, event.currentIndex);
      
      // Update the original array to match the new order
      // This is complex, so for now we'll just reapply filters
      this.applyFilters();
    } else {
      // No filtering active, work directly with the original array
      moveItemInArray(this.menuItems, event.previousIndex, event.currentIndex);
      this.applyFilters();
    }
    this.markAsChanged();
  }

  /* KB - Handle bulk uploaded menu items */
  onMenuItemsUploaded(event: {items: MenuItemInterface[], replaceExisting: boolean}) {
    if (event.replaceExisting) {
      // Replace all existing items
      this.menuItems = [...event.items];
    } else {
      // Append to existing items
      this.menuItems = [...this.menuItems, ...event.items];
    }
    
    // Apply filters to new items
    this.applyFilters();
    
    // Navigate to the menu items step to show the uploaded items
    this.navigateToStep(4);
    
    this.toastr.success(`${event.items.length} menu items ${event.replaceExisting ? 'replaced' : 'added'} successfully!`);
    this.markAsChanged();
  }

  // Filter methods
  applyFilters(): void {
    this.filteredMenuItems = this.menuItems.filter(item => {
      const matchesCategory = this.selectedCategoryFilter === null || 
        item.categoryId === this.selectedCategoryFilter;
      
      if (!this.searchTerm) {
        return matchesCategory;
      }
      
      const searchLower = this.searchTerm.toLowerCase();
      
      // Search in name and description
      const matchesNameDescription = 
        item.name?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower);
      
      // Search in labels
      const matchesLabels = item.labels?.some(label => 
        label.toLowerCase().includes(searchLower)
      );
      
      // Search in pairings
      const matchesPairings = item.pairings?.some(pairing => 
        pairing.toLowerCase().includes(searchLower)
      );
      
      // Search in sides (handle both string and SideItem formats)
      const matchesSides = item.sides?.some(side => {
        if (typeof side === 'string') {
          return side.toLowerCase().includes(searchLower);
        } else {
          return side.name.toLowerCase().includes(searchLower);
        }
      });
      
      // Search in variations (handle both string and VariationItem formats)
      const matchesVariations = item.variations?.some(variation => {
        if (typeof variation === 'string') {
          return variation.toLowerCase().includes(searchLower);
        } else {
          return variation.name.toLowerCase().includes(searchLower);
        }
      });
      
      // Search in preparations (now string array only)
      const matchesPreparations = item.preparations?.some(preparation => {
        return preparation.toLowerCase().includes(searchLower);
      });
      
      const matchesSearch = matchesNameDescription || matchesLabels || 
        matchesPairings || matchesSides || matchesVariations || matchesPreparations;
      
      return matchesCategory && matchesSearch;
    });
  }

  onCategoryFilterChange(value: any): void {
    // Handle clearing the filter (when "All Categories" is selected)
    if (value === null || value === '' || value === 'all') {
      this.selectedCategoryFilter = null;
    } else {
      this.selectedCategoryFilter = parseInt(value, 10);
    }
    this.applyFilters();
  }

  onSearchTermChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyFilters();
  }

  getOriginalItemIndex(menuItem: MenuItemInterface): number {
    return this.menuItems.findIndex(item => item.itemId === menuItem.itemId);
  }

  // New price change methods for variations and sauces (preparations no longer have pricing)

  onNewVariationPriceChange(value: string) {
    this.newVariationPrice = value;
  }

  onNewSaucePriceChange(value: string) {
    this.newSaucePrice = value;
  }

  onCustomHeadingChange(data: {detailType: 'preparation' | 'variation' | 'pairing' | 'side' | 'allergen' | 'sauce', itemIndex: number, heading: string}): void {
    const { detailType, itemIndex, heading } = data;
    
    // Initialize customHeadings if it doesn't exist
    if (!this.menuItems[itemIndex].customHeadings) {
      this.menuItems[itemIndex].customHeadings = {};
    }
    
    // Update the custom heading for the specific detail type
    (this.menuItems[itemIndex].customHeadings as any)[detailType] = heading;
    
    // Mark as having unsaved changes
    this.markAsChanged();
  }
}

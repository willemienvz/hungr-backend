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
import { MenuService, MenuItemInterface } from '../shared/menu.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

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
  newVariation: string = '';
  newPairing: string = '';
  newSide: string = '';
  newLabel: string = '';
  isSaving: boolean = false;
  tempNum: number = 0;
  menuNameError: boolean = false;
  restaurantError: boolean = false;
  addRestaurantLater: boolean = false;
  uploadFilePopUp: boolean = false;
  
  // Filter properties
  selectedCategoryFilter: number | null = null;
  searchTerm: string = '';
  filteredMenuItems: MenuItemInterface[] = [];
  constructor(
    private readonly firestore: AngularFirestore,
    private readonly storage: AngularFireStorage,
    private readonly papa: Papa,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly menuService: MenuService
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

  addPreparation(itemIndex: number): void {
    
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'preparations', this.newPreparation);
    this.newPreparation = '';
  }

  removePreparation(itemIndex: number, prepIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'preparations', prepIndex);
  }

  addVariation(itemIndex: number): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'variations', this.newVariation);
    this.newVariation = '';
  }

  removeVariation(itemIndex: number, variationIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'variations', variationIndex);
  }

  addPairing(itemIndex: number): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'pairings', this.newPairing);
    this.newPairing = '';
  }

  removePairing(itemIndex: number, pairingIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'pairings', pairingIndex);
  }

  addMenuItemPairing(data: {itemIndex: number, pairingId: string}): void {
    this.menuItems = this.menuService.addMenuItemPairing(this.menuItems, data.itemIndex, data.pairingId);
  }

  removeMenuItemPairing(data: {itemIndex: number, pairingId: string}): void {
    this.menuItems = this.menuService.removeMenuItemPairing(this.menuItems, data.itemIndex, data.pairingId);
  }

  addSide(itemIndex: number): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'sides', this.newSide);
    this.newSide = '';
  }

  addLabel(itemIndex: number): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'labels', this.newLabel);
    this.newLabel = '';
  }

  removeSide(itemIndex: number, sideIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'sides', sideIndex);
  }

  removeLabel(itemIndex: number, labelIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'labels', labelIndex);
  }

  loadMenuData() {
    this.menuService.loadMenu(this.menuID).subscribe((menu: any) => {
      if (menu) {
        this.menuName = menu.menuName;
        this.selectedRestaurant = menu.restaurantID;
        this.categories = menu.categories || [];
        this.menuItems = menu.items || [];
        this.addRestaurantLater = menu.addRestaurantLater || false;
        this.initializeArrays();
        this.applyFilters(); // Initialize filters
        console.log(menu);
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

  onPriceInput(event: any, menuItem: any): void {
    const formattedPrice = this.menuService.formatPriceInput(event.target.value);
    menuItem.price = formattedPrice;
    event.target.value = formattedPrice;
  }

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
    this.isSaving = true;

    const updatedMenu = {
      menuName: this.menuName,
      restaurantID: this.addRestaurantLater ? '' : this.selectedRestaurant,
      categories: this.categories,
      items: this.menuItems,
      addRestaurantLater: this.addRestaurantLater
    };

    this.menuService.updateMenu(this.menuID, updatedMenu)
      .then(() => {
        this.isSaving = false;
        console.log('Menu updated successfully!');
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
  }

  addSubCategory(categoryIndex: number) {
    this.categories = this.menuService.addSubCategory(this.categories, categoryIndex, this.newSubcategoryName[categoryIndex]);
    this.newSubcategoryName[categoryIndex] = '';
  }

  deleteCategory(index: number) {
    this.categories = this.menuService.deleteCategory(this.categories, index);
    this.initializeArrays();
  }

  deleteSubCategory(categoryIndex: number, subcategoryIndex: number) {
    this.categories = this.menuService.deleteSubCategory(this.categories, categoryIndex, subcategoryIndex);
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
  }

  addMenuItem() {
    this.menuItems = this.menuService.addMenuItem(this.menuItems);
    this.applyFilters();
  }

  removeMenuItem(index: number) {
    this.menuItems = this.menuService.removeMenuItem(this.menuItems, index);
    this.applyFilters();
  }

  toggleDetail(
    detailType: 'preparation' | 'variation' | 'pairing' | 'side',
    itemIndex: number
  ) {
    this.menuItems = this.menuService.toggleDetail(this.menuItems, detailType, itemIndex);
  }

  onFileSelected(event: Event, itemIndex: number): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.menuService.uploadMenuItemImage(file).then(url => {
        this.menuItems = this.menuService.updateMenuItemImage(this.menuItems, itemIndex, url);
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
      
      // Search in sides
      const matchesSides = item.sides?.some(side => 
        side.toLowerCase().includes(searchLower)
      );
      
      // Search in variations
      const matchesVariations = item.variations?.some(variation => 
        variation.toLowerCase().includes(searchLower)
      );
      
      // Search in preparations
      const matchesPreparations = item.preparations?.some(preparation => 
        preparation.toLowerCase().includes(searchLower)
      );
      
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
}

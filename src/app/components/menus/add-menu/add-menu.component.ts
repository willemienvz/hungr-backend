import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../../shared/services/restaurant';
import { Category } from '../../../shared/services/category';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize, take } from 'rxjs';
import { Papa } from 'ngx-papaparse';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { MenuService, MenuItemInterface, SideItem, PreparationItem, VariationItem, SauceItem } from '../shared/menu.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-add-menu',
  templateUrl: './add-menu.component.html',
  styleUrls: ['./add-menu.component.scss'],
})
export class AddMenuComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  // Component state
  step = 1;
  currentMenuID: string = '';
  logoUrl: string | null = null;
  restaurantName: string = '';
  newMenu: any;
  restaurantDescription: string = '';
  setAsDraftSaved: boolean = false;
  newLabel: string = '';
  private doneSaveSubject = new BehaviorSubject<boolean>(false);
  doneSave$ = this.doneSaveSubject.asObservable();
  menuItems: MenuItemInterface[] = [];
  uploadFilePopUp = false;
  draggedOver = false;
  fileToUpload: File | null = null;
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
  categories: Category[] = [];
  restaurants: Restaurant[] = [];
  selectedRestaurant: string = '';
  showPopup: boolean = false;
  showPopupProgress: boolean = false;

  isPopupMenuOpen: boolean[] = [];
  isAddInputVisible: boolean[] = [];
  newSubcategoryName: string[] = [];
  newCategoryName: string = '';
  isSaving: boolean = false;
  selectedFile: File | null = null;
  imageUrl: string | null = null;
  displayDetails: any = {
    preparation: false,
    variation: false,
    pairing: false,
    side: false,
    allergen: false,
    sauce: false,
  };
  tempNum: number = 0;
  preparations: string[] = [];
  variations: string[] = [];
  pairings: string[] = [];
  sides: string[] = [];
  currentStep: number = 1;
  user: any;
  OwnerID: string = '';
  menuName: string = '';
  validationError: boolean = false;
  menuSaved: boolean = false;
  menuNameError: boolean = false;
  restaurantError: boolean = false;
  selectedFileBulk: File | null = null;
  steps: string[] = ['Menu Details', 'Categories', 'Add Items', 'Done'];
  addRestaurantLater: boolean = false;
  isDuplicateMenuName: boolean = false;
  duplicateCheckTimeout: any;

  // Navigation safety properties
  hasUnsavedChanges: boolean = false;

  constructor(
    private storage: AngularFireStorage,
    private firestore: AngularFirestore,
    private papa: Papa,
    private toast: ToastService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private menuService: MenuService
  ) {}

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user')!);
    this.OwnerID = this.user.uid;
    this.fetchRestaurant();
    this.addGenericCategories();
    this.initializeArrays();
    this.doneSave$.subscribe((value) => {
      if (value) {
        this.handleDoneSaveChange();
      }
    });

    // Read step from route parameter
    this.route.params.subscribe((params) => {
      const step = params['step'];
      if (step) {
        const stepNumber = parseInt(step, 10);
        if (stepNumber >= 1 && stepNumber <= 5) {
          this.currentStep = stepNumber;
        } else {
          // Invalid step, redirect to step 1
          this.router.navigate(['/menus/add-menu/1'], { replaceUrl: true });
        }
      } else {
        // No step specified, default to step 1
        this.currentStep = 1;
        this.router.navigate(['/menus/add-menu/1'], { replaceUrl: true });
      }
    });
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
    // If we're on step 1, navigate back to menus list
    if (this.currentStep === 1) {
      this.navigateWithUnsavedChangesCheck(['/menus']);
    } else {
      // For steps > 1, navigate to previous step
      this.navigateToStep(this.currentStep - 1);
    }
  }

  async onAddRestaurantClick(event: Event) {
    event.preventDefault();

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '400px',
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result) {
      this.router.navigate(['/restaurants/add-new-restaurant']);
    }
  }

  initializeArrays() {
    this.newSubcategoryName = this.menuService.initializeArrays(this.categories.length);
    this.isPopupMenuOpen = Array(this.categories.length).fill(false);
    this.isAddInputVisible = Array(this.categories.length).fill(false);
  }

  toggleAddInput(index: number): void {
    this.isAddInputVisible[index] = !this.isAddInputVisible[index];
    this.newSubcategoryName[index] = '';
  }

  onFileSelectedBulk(event: any) {
    this.selectedFileBulk = event.target.files[0];
  }

  processFile() {
    if (!this.selectedFileBulk) {
      console.error('No file selected');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      this.parseCSV(text);
    };
    reader.readAsText(this.selectedFileBulk);
  }

  parseCSV(text: string) {
    this.papa.parse(text, {
      header: true,
      complete: (results) => {
        this.addMenuItemsFromCSV(results.data);
      },
    });
  }

  addMenuItemsFromCSV(data: any[]) {
    data.forEach((item) => {
      const newItem: MenuItemInterface = {
        itemId: uuidv4(),
        categoryId: this.getCategoryIdByName(item.category),
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: null,
        imageUrls: [],
        preparations: item.preparations ? item.preparations.split('|') : [],
        variations: item.variations ? item.variations.split('|') : [],
        pairings: item.pairings ? item.pairings.split('|') : [],
        pairingIds: [],
        sides: item.sides ? item.sides.split('|') : [],
        allergens: item.allergens ? item.allergens.split('|') : [],
        sauces: item.sauces ? item.sauces.split('|') : [],
        labels: item.labels ? item.labels.split('|') : [],
        showLabelInput: false,
        displayDetails: {
          preparation: false,
          variation: false,
          pairing: false,
          side: false,
          allergen: false,
          sauce: false,
        },
      };
      this.menuItems.push(newItem);
    });
  }

  getCategoryIdByName(categoryName: string): number | null {
    return this.menuService.getCategoryIdByName(this.categories, categoryName);
  }

  private addGenericCategories() {
    this.categories = this.menuService.getGenericCategories();
  }

  private fetchRestaurant() {
    this.menuService.fetchRestaurants(this.OwnerID).subscribe((restaurants) => {
      this.restaurants = restaurants;
    });
  }

  goToStep(step: number) {
    this.router.navigate(['/menus/add-menu', step]);
  }

  isValid(): boolean {
    return this.menuService.validateMenuName(this.menuName) && 
           !this.isDuplicateMenuName &&
           (this.menuService.validateRestaurant(this.selectedRestaurant) || this.addRestaurantLater);
  }

  validateMenuName() {
    this.menuNameError = !this.menuService.validateMenuName(this.menuName);
    this.checkDuplicateMenuName(this.menuName);
  }

  // Add method to check for duplicate names
  checkDuplicateMenuName(menuName: string): void {
    if (!menuName || !menuName.trim()) {
      this.isDuplicateMenuName = false;
      return;
    }

    // Clear previous timeout
    if (this.duplicateCheckTimeout) {
      clearTimeout(this.duplicateCheckTimeout);
    }

    // Debounce the check to avoid too many queries
    this.duplicateCheckTimeout = setTimeout(() => {
      this.menuService.checkDuplicateMenuName(menuName, this.OwnerID)
        .subscribe((isDuplicate) => {
          this.isDuplicateMenuName = isDuplicate;
        });
    }, 500);
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

  // Price input handling is now managed by PriceInputComponent
  // Removed onPriceInput() method

  addMenu(userForm: NgForm) {}

  closePopup() {
    this.showPopup = false;
  }

  showPopupDialog() {
    this.showPopup = true;
  }

  closePopupProgress() {
    this.showPopupProgress = false;
  }

  openProgressPopup() {
    this.showPopupProgress = true;
  }

  closePopupuploadFile() {
    this.uploadFilePopUp = false;
  }

  openPopupuploadFile() {
    this.uploadFilePopUp = true;
  }

  addCategory() {
    this.categories = this.menuService.addCategory(this.categories, this.newCategoryName);
    this.newCategoryName = '';
    this.initializeArrays();
    this.markAsChanged();
  }

  addSubCategory(index: number): void {
    this.categories = this.menuService.addSubCategory(this.categories, index, this.newSubcategoryName[index]);
    this.newSubcategoryName[index] = '';
    this.isAddInputVisible[index] = false;
    this.markAsChanged();
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  deleteCategory(index: number): void {
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

  deleteSubCategory(categoryIndex: number, subcategoryIndex: number): void {
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

  saveImageUrl(imageUrl: string, itemIndex: number): void {
    this.menuItems = this.menuService.updateMenuItemImage(this.menuItems, itemIndex, imageUrl);
  }

  getFile(itemIndex: number): void {
    this.tempNum = itemIndex;
    this.fileInput.nativeElement.click();
  }

  downloadTemplate() {
    this.menuService.downloadTemplate();
  }

  deleteLabel(itemIndex: number, labelIndex: number) {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'labels', labelIndex);
  }

  addMenuItem(): void {
    this.nextStep();
    this.menuItems = this.menuService.addMenuItem(this.menuItems);
  }

  addMenuItemMore(): void {
    this.menuItems = this.menuService.addMenuItem(this.menuItems);
    this.markAsChanged();
  }

  removeMenuItem(index: number): void {
    this.menuItems = this.menuService.removeMenuItem(this.menuItems, index);
    this.markAsChanged();
  }

  addPreparation(data: {itemIndex: number, prepData: {name: string}}): void {
    const { itemIndex, prepData } = data;
    
    // Simplified - just add the name as a string
    this.menuItems[itemIndex].preparations.push(prepData.name);
    this.markAsChanged();
  }

  removePreparation(itemIndex: number, prepIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'preparations', prepIndex);
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
    
    this.markAsChanged();
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
    
    this.markAsChanged();
  }

  removeSide(itemIndex: number, sideIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'sides', sideIndex);
  }

  addAllergen(data: {itemIndex: number, allergenName: string}): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, data.itemIndex, 'allergens', data.allergenName);
    this.newAllergen = '';
  }

  removeAllergen(itemIndex: number, allergenIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'allergens', allergenIndex);
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

  toggleDetail(
    detailType: 'preparation' | 'variation' | 'pairing' | 'side' | 'allergen' | 'sauce',
    itemIndex: number
  ): void {
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
        this.toast.error('Error uploading image');
      });
    }
  }

  saveMenu(): void {
    // Add duplicate name check
    if (this.isDuplicateMenuName) {
      this.toast.error('A menu with this name already exists. Please choose a different name.');
      return;
    }

    this.isSaving = true;
    const menuData = {
      menuName: this.menuName,
      restaurantID: this.addRestaurantLater ? '' : this.selectedRestaurant,
      categories: this.categories,
      items: this.menuItems,
      OwnerID: this.OwnerID,
      createdAt: new Date(),
      isDraft: false,
      Status: 'active',
      addRestaurantLater: this.addRestaurantLater,
      qrAssigned: false,
      qrUrl: '',
      location: this.findCityAndProvince(this.selectedRestaurant),
      viewingTime: []
    };

    this.menuService.saveMenu(menuData)
      .then((menuId) => {
        this.currentMenuID = menuId;
        // Auto-assign QR code immediately after menu creation
        // QR code URL format: environment.menuUrl + menuId
        const qrUrl = environment.menuUrl + menuId;
        this.firestore.collection('menus').doc(menuId).update({ 
          menuID: menuId,
          id: menuId,
          qrAssigned: true,
          qrUrl: qrUrl
        })
        .catch((error) => {
          console.error('QR code assignment failed:', error);
          // Menu is still saved successfully, QR code can be assigned manually later
          // Graceful degradation: menu save succeeds even if QR assignment fails
        });
        this.isSaving = false;
        this.menuSaved = true;
        this.markAsSaved();
        this.doneSaveSubject.next(true);
      })
      .catch((error) => {
        this.isSaving = false;
      });
  }

  private handleDoneSaveChange() {
    this.router.navigate(['/menus/add-menu', 5]);
  }

  toggleLabelInput(itemIndex: number): void {
    this.menuItems[itemIndex].showLabelInput = !this.menuItems[itemIndex].showLabelInput;
  }

  addLabel(itemIndex: number): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'labels', this.newLabel);
    this.newLabel = '';
  }

  removeLabel(itemIndex: number, labelIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'labels', labelIndex);
  }

  setAsDraft() {
    this.isSaving = true;
    const menuData = {
      menuName: this.menuName,
      restaurantID: this.addRestaurantLater ? '' : this.selectedRestaurant,
      categories: this.categories,
      items: this.menuItems,
      OwnerID: this.OwnerID,
      createdAt: new Date(),
      isDraft: true,
      Status: 'draft',
      addRestaurantLater: this.addRestaurantLater,
      qrAssigned: false,
      qrUrl: '',
      location: this.findCityAndProvince(this.selectedRestaurant),
      viewingTime: []
    };

    this.menuService.saveMenu(menuData)
      .then((menuId) => {
        // Auto-assign QR code immediately after draft menu creation
        // QR code URL format: environment.menuUrl + menuId
        const qrUrl = environment.menuUrl + menuId;
        this.firestore.collection('menus').doc(menuId).update({ 
          menuID: menuId,
          id: menuId,
          qrAssigned: true,
          qrUrl: qrUrl
        })
        .catch((error) => {
          console.error('QR code assignment failed:', error);
          // Menu is still saved successfully, QR code can be assigned manually later
          // Graceful degradation: menu save succeeds even if QR assignment fails
        });
        this.isSaving = false;
        this.setAsDraftSaved = true;
        this.markAsSaved();
      })
      .catch((error) => {
        this.isSaving = false;
      });
  }

  findCityAndProvince(restaurantID: string | undefined): string {
    return this.menuService.findCityAndProvince(this.restaurants, restaurantID);
  }

  nextStep() {
    if (this.currentStep === 1) {
      this.validateMenuName();
      this.validateRestaurant();
      if (this.menuNameError || this.restaurantError) {
        return;
      }
    }
    
    if (this.currentStep === 3) {
      if (this.menuItems.length === 0) {
        this.menuItems = this.menuService.addMenuItem(this.menuItems);
      }
      this.router.navigate(['/menus/add-menu', 4]);
      return;
    }
    
    if (this.currentStep === 4) {
      this.saveMenu();
      return;
    }
    
    if (this.currentStep < 5) {
      this.router.navigate(['/menus/add-menu', this.currentStep + 1]);
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.router.navigate(['/menus/add-menu', this.currentStep - 1]);
    }
  }

  navigateToStep(step: number): void {
    if ((step < this.currentStep && step >= 1) || step === 4) {
      if (step === 4 && this.menuItems.length === 0) {
        this.menuItems = this.menuService.addMenuItem(this.menuItems);
      }
      // Only check for unsaved changes when navigating backward, not forward (step 3 to 4)
      const isForwardNavigation = this.currentStep === 3 && step === 4;
      if (this.hasUnsavedChanges && !isForwardNavigation) {
        const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
          width: '400px',
          disableClose: true
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result === true) {
            this.router.navigate(['/menus/add-menu', step]);
          }
        });
      } else {
        this.router.navigate(['/menus/add-menu', step]);
      }
    }
  }

  completeSetup() {
    this.router.navigate(['/menus']);
  }

  onMenuItemDrop(event: CdkDragDrop<MenuItemInterface[]>) {
    moveItemInArray(this.menuItems, event.previousIndex, event.currentIndex);
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
    
    // Navigate to the menu items step to show the uploaded items
    this.router.navigate(['/menus/add-menu', 4]);
    
    this.toast.success(`${event.items.length} menu items ${event.replaceExisting ? 'replaced' : 'added'} successfully!`);
  }

  setAsPublished() {
    this.saveMenu();
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

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
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { MenuService, MenuItemInterface } from '../shared/menu.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

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
  menuItems: MenuItemInterface[] = [];
  uploadFilePopUp = false;
  draggedOver = false;
  fileToUpload: File | null = null;
  newPreparation: string = '';
  newVariation: string = '';
  newPairing: string = '';
  private doneSaveSubject = new BehaviorSubject<boolean>(false);
  doneSave$ = this.doneSaveSubject.asObservable();
  newSide: string = '';
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

  constructor(
    private storage: AngularFireStorage,
    private firestore: AngularFirestore,
    private papa: Papa,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private router: Router,
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
        preparations: item.preparations ? item.preparations.split('|') : [],
        variations: item.variations ? item.variations.split('|') : [],
        pairings: item.pairings ? item.pairings.split('|') : [],
        sides: item.sides ? item.sides.split('|') : [],
        labels: item.labels || '',
        showLabelInput: false,
        displayDetails: {
          preparation: false,
          variation: false,
          pairing: false,
          side: false,
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
    this.currentStep = step;
  }

  isValid(): boolean {
    return this.menuService.validateMenuName(this.menuName) && 
           (this.menuService.validateRestaurant(this.selectedRestaurant) || this.addRestaurantLater);
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

  onPriceInput(event: any, menuItem: any): void {
    const formattedPrice = this.menuService.formatPriceInput(event.target.value);
    menuItem.price = formattedPrice;
    event.target.value = formattedPrice;
  }

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
  }

  addSubCategory(index: number): void {
    this.categories = this.menuService.addSubCategory(this.categories, index, this.newSubcategoryName[index]);
    this.newSubcategoryName[index] = '';
    this.isAddInputVisible[index] = false;
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  deleteCategory(index: number): void {
    this.categories = this.menuService.deleteCategory(this.categories, index);
    this.initializeArrays();
  }

  deleteSubCategory(categoryIndex: number, subcategoryIndex: number): void {
    this.categories = this.menuService.deleteSubCategory(this.categories, categoryIndex, subcategoryIndex);
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
    this.menuItems[itemIndex].labels = '';
  }

  addMenuItem(): void {
    this.nextStep();
    this.menuItems = this.menuService.addMenuItem(this.menuItems);
  }

  addMenuItemMore(): void {
    this.menuItems = this.menuService.addMenuItem(this.menuItems);
  }

  removeMenuItem(index: number): void {
    this.menuItems = this.menuService.removeMenuItem(this.menuItems, index);
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

  addSide(itemIndex: number): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'sides', this.newSide);
    this.newSide = '';
  }

  removeSide(itemIndex: number, sideIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'sides', sideIndex);
  }

  toggleDetail(
    detailType: 'preparation' | 'variation' | 'pairing' | 'side',
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
        this.toastr.error('Error uploading image');
      });
    }
  }

  saveMenu(): void {
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
        this.firestore.collection('menus').doc(menuId).update({ 
          menuID: menuId,
          id: menuId 
        });
        this.isSaving = false;
        this.menuSaved = true;
        this.doneSaveSubject.next(true);
      })
      .catch((error) => {
        this.isSaving = false;
      });
  }

  private handleDoneSaveChange() {
    this.currentStep = 5;
  }

  toggleLabelInput(itemIndex: number): void {
    this.menuItems[itemIndex].showLabelInput = !this.menuItems[itemIndex].showLabelInput;
  }

  addLabel(itemIndex: number): void {
    if (this.newLabel.trim()) {
      this.menuItems[itemIndex].labels = this.newLabel.trim();
      this.newLabel = '';
      this.toggleLabelInput(itemIndex);
    }
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
        this.firestore.collection('menus').doc(menuId).update({ 
          menuID: menuId,
          id: menuId 
        });
        this.isSaving = false;
        this.setAsDraftSaved = true;
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
      this.currentStep = 4;
      if (this.menuItems.length === 0) {
        this.menuItems = this.menuService.addMenuItem(this.menuItems);
      }
      return;
    }
    
    if (this.currentStep === 4) {
      this.saveMenu();
      return;
    }
    
    if (this.currentStep < 5) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  navigateToStep(step: number): void {
    if (step < this.currentStep && step >= 1) {
      this.currentStep = step;
      if (step === 4 && this.menuItems.length === 0) {
        this.menuItems = this.menuService.addMenuItem(this.menuItems);
      }
    }
  }

  completeSetup() {
    this.router.navigate(['/menus']);
  }

  onMenuItemDrop(event: CdkDragDrop<MenuItemInterface[]>) {
    moveItemInArray(this.menuItems, event.previousIndex, event.currentIndex);
  }
}

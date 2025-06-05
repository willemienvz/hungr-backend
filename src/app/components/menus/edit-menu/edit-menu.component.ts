import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';
import { Papa } from 'ngx-papaparse';
import { v4 as uuidv4 } from 'uuid';
import { Category } from '../../../shared/services/category';
import { Restaurant } from '../../../shared/services/restaurant';
import { ActivatedRoute } from '@angular/router';
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
  isSaving: boolean = false;
  tempNum: number = 0;
  menuNameError: boolean = false;
  restaurantError: boolean = false;
  addRestaurantLater: boolean = false;
  uploadFilePopUp: boolean = false;
  constructor(
    private readonly firestore: AngularFirestore,
    private readonly storage: AngularFireStorage,
    private readonly papa: Papa,
    private readonly route: ActivatedRoute,
    private readonly toastr: ToastrService,
    private readonly menuService: MenuService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.menuID = params['menuID'];
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

  addSide(itemIndex: number): void {
    this.menuItems = this.menuService.addToItemArray(this.menuItems, itemIndex, 'sides', this.newSide);
    this.newSide = '';
  }

  removeSide(itemIndex: number, sideIndex: number): void {
    this.menuItems = this.menuService.removeFromItemArray(this.menuItems, itemIndex, 'sides', sideIndex);
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
      this.currentStep++;
      if (this.currentStep === 4 && this.menuItems.length === 0) {
        this.menuItems = this.menuService.addMenuItem(this.menuItems);
      }
    }
  }

  nextStepLast() {
    this.saveMenu();
    this.currentStep++;
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  navigateToStep(step: number): void {
    if ((step < this.currentStep && step >= 1) || (this.currentStep === 3 && step === 4)) {
      this.currentStep = step;
      if (step === 4 && this.menuItems.length === 0) {
        this.menuItems = this.menuService.addMenuItem(this.menuItems);
      }
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
  }

  removeMenuItem(index: number) {
    this.menuItems = this.menuService.removeMenuItem(this.menuItems, index);
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
    moveItemInArray(this.menuItems, event.previousIndex, event.currentIndex);
  }
}

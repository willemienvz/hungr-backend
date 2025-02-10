import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';
import { Papa } from 'ngx-papaparse';
import { v4 as uuidv4 } from 'uuid';
import { Category } from '../../../shared/services/category';
import { Restaurant } from '../../../shared/services/restaurant';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-edit-menu',
  templateUrl: './edit-menu.component.html',
  styleUrls: ['./edit-menu.component.scss']
})
export class EditMenuComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  step = 1;
  logoUrl: string | null = null;
  restaurantName: string = '';
  menuName: string = '';
  selectedRestaurant: string = '';
  categories: Category[] = [];
  menuItems: any[] = [];
  restaurants: Restaurant[] = [];
  menuID: string='';
  currentStep: number = 1;
  newCategoryName: string = '';
  newSubcategoryName: string[] = [];
  newPreparation: string = '';
  newVariation: string = '';
  newPairing: string = '';
  newSide: string = '';
  isSaving: boolean = false;
  tempNum:number =0;
  menuNameError: boolean = false;
  restaurantError: boolean = false;

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private papa: Papa,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.menuID = params['menuID'];
    });
    this.loadMenuData();
    this.fetchRestaurants();
  }

  loadMenuData() {
    this.firestore.collection('menus').doc(this.menuID).valueChanges().subscribe((menu: any) => {
      if (menu) {
        this.menuName = menu.menuName;
        this.selectedRestaurant = menu.restaurantID;
        this.categories = menu.categories || [];
        this.menuItems = menu.items || [];
        console.log(menu)
      }
    });
  }
  getFile(itemIndex: number): void {
    this.tempNum = itemIndex;
    this.fileInput.nativeElement.click();
  }
  onPriceInput(event: any, menuItem: any): void {
    let inputValue = event.target.value;
    if (!inputValue.startsWith('R ')) {
      inputValue = 'R ' + inputValue.replace(/^R\s*/, '');
    }
    menuItem.price = inputValue;
    event.target.value = inputValue;
  }

  
  fetchRestaurants() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const ownerId = user.uid;
    this.firestore.collection<Restaurant>('restuarants', ref => ref.where('ownerID', '==', ownerId))
      .valueChanges()
      .subscribe(restaurants => {
        this.restaurants = restaurants;
        console.log(restaurants);
      });
  }

  validateMenuName() {
    this.menuNameError = !this.menuName.trim();
  }

  validateRestaurant() {
    this.restaurantError = !this.selectedRestaurant.trim();
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

  saveMenu() {
    this.isSaving = true;
   
    const updatedMenu = {
      menuName: this.menuName,
      restaurantID: this.selectedRestaurant,
      categories: this.categories,
      items: this.menuItems
    };
    console.log(updatedMenu);
    this.firestore.collection('menus').doc(this.menuID).update(updatedMenu)
      .then(() => {
        this.isSaving = false;
        console.log('Menu updated successfully!');
      })
      .catch(error => {
        console.error('Error updating menu:', error);
        this.isSaving = false;
      });
  }

  addCategory() {
    if (this.newCategoryName.trim()) {
      const newId = this.categories.length ? Math.max(...this.categories.map(cat => cat.id)) + 1 : 1;
      this.categories.push({
        id: newId,
        name: this.newCategoryName,
        subcategories: []
      });
      this.newCategoryName = '';
    }
  }

  addSubCategory(categoryIndex: number) {
    const subcategories = this.categories[categoryIndex].subcategories || [];
    if (this.newSubcategoryName[categoryIndex]?.trim()) {
      const newId = subcategories.length ? Math.max(...subcategories.map(sub => sub.id)) + 1 : 1;
      subcategories.push({
        id: newId,
        name: this.newSubcategoryName[categoryIndex]
      });
      this.newSubcategoryName[categoryIndex] = '';
    }
  }

  deleteCategory(index: number) {
    this.categories.splice(index, 1);
  }

  deleteSubCategory(categoryIndex: number, subcategoryIndex: number) {
    this.categories[categoryIndex].subcategories?.splice(subcategoryIndex, 1);
  }

  addMenuItem() {
    this.menuItems.push({
      itemId: uuidv4(),
      categoryId: undefined,
      name: '',
      description: '',
      price: '',
      imageUrl: null,
      preparations: [],
      variations: [],
      pairings: [],
      sides: [],
      displayDetails: {
        preparation: false,
        variation: false,
        pairing: false,
        side: false
      }
    });
  }

  removeMenuItem(index: number) {
    this.menuItems.splice(index, 1);
  }

  toggleDetail(detailType: 'preparation' | 'variation' | 'pairing' | 'side', itemIndex: number) {
    this.menuItems[itemIndex].displayDetails[detailType] = !this.menuItems[itemIndex].displayDetails[detailType];
  }

 
  onFileSelected(event: Event, itemIndex: number): void {
    this.isSaving = true;
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const filePath = `menu-images/${Date.now()}_${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);

      task.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe((url) => {
            this.menuItems[this.tempNum].imageUrl = url;
            this.isSaving = false;
          });
        })
      ).subscribe();
    }
  }
}

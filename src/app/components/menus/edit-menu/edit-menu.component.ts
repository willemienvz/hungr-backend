import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Restaurant } from '../../../shared/services/restaurant';
import { Menu } from '../../../shared/services/menu';
import { Category } from '../../../shared/services/category';
import { finalize } from 'rxjs';
import { MenuItem } from '../../../shared/services/menu-item';

@Component({
  selector: 'app-edit-menu',
  templateUrl: './edit-menu.component.html',
  styleUrl: './edit-menu.component.scss'
})
export class EditMenuComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  menuID: string='';
  restuarants: Restaurant[] = [];
  currentMenu:any;
  selectedCategoryIndex: number | null = null;
  filteredItems: any[] = [];
  isSaving: boolean = false;
  itemCounts:any;
  newMenu:any;
  showPopupProgress: boolean = false;
  selectedRestaurant: string = '';
  menuName:string='';
  newLabel: string = '';
  newSubcategoryName: string[] = [];
  categories: Category[] = [];
  isAddInputVisible: boolean[] = [];
  newCategoryName: string = '';
  showPopup: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  validationError:boolean = false;
  newPreparation: string = '';
  newVariation: string = '';
  newPairing: string = '';
  selectedCategoryId: number =0;
  newSide: string = '';
  constructor(private route: ActivatedRoute, private storage: AngularFireStorage, private firestore: AngularFirestore) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.menuID = params['menuID'];
    });
    this.fetchRestaurant();
    this.fetchMenu();
    
  }

  private fetchRestaurant() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    this.firestore.collection<Restaurant>('restuarants', ref => ref.where('ownerID', '==', OwnerID))
      .valueChanges()
      .subscribe(restuarants => {
        this.restuarants = restuarants;
      });
  }

  private fetchMenu() {
    this.firestore.collection<Menu>('menus', ref => ref.where('menuID', '==', this.menuID))
      .valueChanges()
      .subscribe(menu => {
        this.currentMenu = menu[0];
        this.menuName = this.currentMenu.menuName;
        this.selectedRestaurant = this.currentMenu.restaurantID;
        this.categories = this.currentMenu.categories;
        this.itemCounts = this.countItemsPerCategory(this.currentMenu);
        if (this.selectedCategoryIndex !== null) {
          this.filterItemsByCategory();
        } else {
          this.filteredItems = this.currentMenu.items;
        }
      });
  }

  addLabel(itemIndex: number): void {
    if (this.newLabel.trim()) {
      this.currentMenu.items[itemIndex].labels = this.newLabel.trim();
      this.newLabel = '';
      this.currentMenu.items[itemIndex].showLabelInput = false;
    }
  }
  countItemsPerCategory(menuData: any): { [key: number]: number } {
    const itemCounts: { [key: number]: number } = {};
  
    menuData.categories.forEach((category: Category) => {
      itemCounts[category.id] = 0;
    });
  
    menuData.items.forEach((item: any) => {
      if (itemCounts.hasOwnProperty(item.categoryId)) {
        itemCounts[item.categoryId]++;
      }
    });
  
    return itemCounts;
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
  onFileSelected(event: Event, itemIndex: number): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const filePath = `menu-images/${Date.now()}_${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);

      task.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe((url) => {
            this.currentMenu.items[itemIndex].imageUrl = url;
          });
        })
      ).subscribe();
    }
  }
  toggleLabelInput(itemIndex: number): void {
    this.currentMenu.items[itemIndex].showLabelInput = !this.currentMenu.items[itemIndex].showLabelInput;
  }
  toggleDetail(detailType: 'preparation' | 'variation' | 'pairing' | 'side', itemIndex: number): void {
    this.currentMenu.items[itemIndex].displayDetails[detailType] = !this.currentMenu.items[itemIndex].displayDetails[detailType];
  }

  toggleAddInput(index: number): void {
    this.isAddInputVisible[index] = !this.isAddInputVisible[index];
    this.newSubcategoryName[index] = ''; 
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  deleteCategory(index: number): void {
    this.categories.splice(index, 1);
    this.togglePopupMenu(index);
  }

  addSubCategory(index: number): void {
    const subcategories = this.categories[index].subcategories ?? (this.categories[index].subcategories = []);
    if (this.newSubcategoryName[index].trim()) {
      const newId = subcategories.length ? Math.max(...subcategories.map(sub => sub.id)) + 1 : 1;
      subcategories.push({
        id: newId,
        name: this.newSubcategoryName[index]
      });
      this.isAddInputVisible[index] = false;
      this.newSubcategoryName[index] = '';
    }
  }

  
  deleteSubCategory(categoryIndex: number, subcategoryIndex: number): void {
    this.categories[categoryIndex].subcategories?.splice(subcategoryIndex, 1);
  }

  openProgressPopup(){
    this.showPopupProgress = true;
    this.setAsDraft();
  }
  setAsDraft(){
    this.firestore
    .collection("menus")
    .doc(this.menuID)
    .update({'isDraft':true});
  }
  checkValidation() {
    this.validationError = !this.menuName || !this.selectedRestaurant;
  }
  getFile(itemIndex: number): void {
    this.fileInput.nativeElement.click();
  }

  saveMenu(): void {
    this.isSaving = true;
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    
    this.newMenu= {
      restaurantID: this.selectedRestaurant,
      categories: this.categories,
      items: this.currentMenu.items,
      Status: true,
      isDraft: false,
      menuName: this.menuName,
      qrAssigned: false,
      qrUrl: '',
      location: this.findCityAndProvince(this.selectedRestaurant)
    };
    this.firestore.collection('menus').doc(this.menuID).update(this.newMenu)
    .then(() => {
    })
    .catch(error => {
        console.error('Error updating menu:', error);
    })
    .finally(() => {
        this.loading();
        this.resetFilter();
    });
    this.loading();
    
  }
  findCityAndProvince(restaurantID: string|undefined): string {
    const foundRestaurant = this.restuarants.find(restaurant => restaurant.restaurantID === restaurantID);
    if (foundRestaurant) {
        return  foundRestaurant.city +', ' + foundRestaurant.province;
    }
    return '';
}
showPopupDialog(){
  this.showPopup = true;
}


addPreparation(itemIndex: number): void {
  if (this.newPreparation.trim()) {
    this.currentMenu.items[itemIndex].preparations.push(this.newPreparation.trim());
    this.newPreparation = '';
  }
}

removePreparation(itemIndex: number, prepIndex: number): void {
  this.currentMenu.items[itemIndex].preparations.splice(prepIndex, 1);
}

addVariation(itemIndex: number): void {
  if (this.newVariation.trim()) {
    this.currentMenu.items[itemIndex].variations.push(this.newVariation.trim());
    this.newVariation = '';
  }
}

removeVariation(itemIndex: number, variationIndex: number): void {
  this.currentMenu.items[itemIndex].variations.splice(variationIndex, 1);
}

addPairing(itemIndex: number): void {
  if (this.newPairing.trim()) {
    this.currentMenu.items[itemIndex].pairings.push(this.newPairing.trim());
    this.newPairing = '';
  }
}

removePairing(itemIndex: number, pairingIndex: number): void {
  this.currentMenu.items[itemIndex].pairings.splice(pairingIndex, 1);
}

addSide(itemIndex: number): void {
  if (this.newSide.trim()) {
    this.currentMenu.items[itemIndex].sides.push(this.newSide.trim());
    this.newSide = '';
  }
}

removeSide(itemIndex: number, sideIndex: number): void {
  this.currentMenu.items[itemIndex].sides.splice(sideIndex, 1);
}

loading():void{
  setTimeout(() => {
    this.isSaving =false;
  }, 800);
}


removeMenuItem(itemIndex: number): void {
  this.isSaving =true;
  const originalIndex = this.currentMenu.items.findIndex((item: MenuItem) => item === this.filteredItems[itemIndex]);
  if (originalIndex !== -1) {
    this.currentMenu.items.splice(originalIndex, 1);
  }
  this.filterItemsByCategory();

  this.loading();
}

addMenuItem(): void {
  this.currentMenu.items.push({
    categoryId:  this.selectedCategoryId,
    name: '',
    description: '',
    price: '',
    imageUrl: null,
    preparations: [],
    variations: [],
    pairings: [],
    sides: [],
    labels: '',
    showLabelInput: false,
    displayDetails: {
      preparation: false,
      variation: false,
      pairing: false,
      side: false,
    }
  });
  this.filterItemsByCategory();
}

selectCategory(index: number): void {
  this.selectedCategoryIndex = index;
  this.filterItemsByCategory();
}

filterItemsByCategory(): void {
  
  if (this.selectedCategoryIndex !== null) {
    this.selectedCategoryId = this.categories[this.selectedCategoryIndex].id;
    this.filteredItems = this.currentMenu.items.filter((item: MenuItem) => item.categoryId ===  this.selectedCategoryId);
  } else {
    this.filteredItems = [];
  }
}

resetFilter():void{
  this.selectedCategoryIndex = null;
}

closePopupProgress(){
  this.showPopupProgress = false;
}

}
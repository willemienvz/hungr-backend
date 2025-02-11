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

@Component({
  selector: 'app-add-menu',
  templateUrl: './add-menu.component.html',
  styleUrls: ['./add-menu.component.scss']
})
export class AddMenuComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  step = 1;
  currentMenuID:string='';
  logoUrl: string | null = null;
  restaurantName: string = '';
  newMenu:any;
  restaurantDescription: string = '';
  setAsDraftSaved: boolean = false;
  newLabel: string = '';
  menuItems: {
    itemId: string;
    categoryId?: number;
    name: string;
    description: string;
    price: string;
    imageUrl: string | null;
    preparations: string[];
    variations: string[];
    pairings: string[];
    sides: string[];
    labels: string;
    showLabelInput: boolean;
    displayDetails: {
      preparation: boolean;
      variation: boolean;
      pairing: boolean;
      side: boolean;
    }
  }[] = [];
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
  restuarants: Restaurant[] = [];
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
    side: false
  };
  tempNum:number =0;
  preparations: string[] = [];
  variations: string[] = [];
  pairings: string[] = [];
  sides: string[] = [];
  currentStep: number = 1; 
  user: any;
  OwnerID:string='';
  menuName:string='';
  validationError:boolean = false;
  menuSaved:boolean = false;
  menuNameError:boolean = false;
  restaurantError:boolean = false;
  selectedFileBulk: File | null = null;
  steps: string[] = ['Menu Details', 'Categories', 'Add Items', 'Done'];
  constructor(private storage: AngularFireStorage, private firestore: AngularFirestore, private papa: Papa, private toastr: ToastrService ) {}


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

  initializeArrays() {
    this.isPopupMenuOpen = Array(this.categories.length).fill(false);
    this.isAddInputVisible = Array(this.categories.length).fill(false);
    this.newSubcategoryName = Array(this.categories.length).fill('');
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
      }
    });
  }

  addMenuItemsFromCSV(data: any[]) {
    data.forEach((item) => {
      const newItem = {
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
          side: false
        }
      };
      this.menuItems.push(newItem);
    });
  }

  getCategoryIdByName(categoryName: string): number|undefined {
    const category = this.categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    return category ? category.id : undefined;
  }


  private addGenericCategories() {
    this.categories = [
      { id: 1, name: 'Starters', subcategories: [] },
      { id: 2, name: 'Mains', subcategories: [] },
      { id: 3, name: 'Desserts', subcategories: [] },
      { id: 4, name: 'Drinks', subcategories: [] }
    ];
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

  goToStep(step: number) {
    this.currentStep = step;
  }
  isValid():boolean {
    return this.validationError;
  }

  validateMenuName() {
    this.menuNameError = !this.menuName.trim();
  }

  validateRestaurant() {
    this.restaurantError = !this.selectedRestaurant.trim();
  }
  onPriceInput(event: any, menuItem: any): void {
    let inputValue = event.target.value;
    if (!inputValue.startsWith('R ')) {
      inputValue = 'R ' + inputValue.replace(/^R\s*/, '');
    }
    menuItem.price = inputValue;
    event.target.value = inputValue;
  }

  

  addMenu(userForm: NgForm) {

  }
  closePopup(){
    this.showPopup = false;
  }
  showPopupDialog(){
    this.showPopup = true;
  }

  closePopupProgress(){
    this.showPopupProgress = false;
  }

  openProgressPopup() {
    if (this.isValid()) {
      this.showPopupProgress = true;
      this.saveMenu();
    } else {
      this.validateMenuName();
      this.validateRestaurant();
    }
  }

  closePopupuploadFile(){
    this.uploadFilePopUp = false;
  }
  openPopupuploadFile(){
    this.uploadFilePopUp = true;
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
      this.initializeArrays(); 
    }
  }

  addSubCategory(index: number): void {
    const subcategories = this.categories[index].subcategories ?? (this.categories[index].subcategories = []);
    
    if (this.newSubcategoryName[index].trim()) {
      const newId = subcategories.length ? Math.max(...subcategories.map(sub => sub.id)) + 1 : 1;
      subcategories.push({
        id: newId*10000,
        name: this.newSubcategoryName[index]
      });
      this.isAddInputVisible[index] = false;
      this.newSubcategoryName[index] = '';
    }
  }
  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  deleteCategory(index: number): void {
    this.categories.splice(index, 1);
    this.initializeArrays(); 
  }

  deleteSubCategory(categoryIndex: number, subcategoryIndex: number): void {
    this.categories[categoryIndex].subcategories?.splice(subcategoryIndex, 1);
  }


  saveImageUrl(imageUrl: string, itemIndex: number): void {
    this.menuItems[itemIndex].imageUrl = imageUrl;
  }

  getFile(itemIndex: number): void {
    this.tempNum = itemIndex;
    this.fileInput.nativeElement.click();
  }

  downloadTemplate() {
    const csvContent = [
      `category,name,description,price,preparations,variations,pairings,sides,labels`,
      `Appetizers,Fried Calamari,Lightly breaded calamari served with marinara sauce,12.95,,Grilled|Fried,Sparkling Wine,Coleslaw|Fries,Spicy`,
      `Main Course,Grilled Salmon,Salmon fillet with a lemon butter sauce,19.99,Lemon Butter|Garlic Herb,,White Wine,Asparagus|Rice,Gluten-Free`,
      `Desserts,Chocolate Cake,Rich chocolate cake with a molten center,6.50,,Regular|Sugar-Free,,Ice Cream|Whipped Cream,`,
      `Beverages,Espresso,Strong Italian coffee,3.00,,Single|Double,,,`
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}


  deleteLabel(itemIndex: number, labelIndex: number) {
    this.menuItems[itemIndex].labels = '';
  }

    addMenuItem(): void {
      this.nextStep();
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
        labels: '',
        showLabelInput: false,
        displayDetails: {
          preparation: false,
          variation: false,
          pairing: false,
          side: false,
        }
      });
    }
  
    removeMenuItem(index: number): void {
      this.menuItems.splice(index, 1);
    }
  
    addPreparation(itemIndex: number): void {
      if (this.newPreparation.trim()) {
        this.menuItems[itemIndex].preparations.push(this.newPreparation.trim());
        this.newPreparation = '';
      }
    }
  
    removePreparation(itemIndex: number, prepIndex: number): void {
      this.menuItems[itemIndex].preparations.splice(prepIndex, 1);
    }
  
    addVariation(itemIndex: number): void {
      if (this.newVariation.trim()) {
        this.menuItems[itemIndex].variations.push(this.newVariation.trim());
        this.newVariation = '';
      }
    }
  
    removeVariation(itemIndex: number, variationIndex: number): void {
      this.menuItems[itemIndex].variations.splice(variationIndex, 1);
    }
  
    addPairing(itemIndex: number): void {
      if (this.newPairing.trim()) {
        this.menuItems[itemIndex].pairings.push(this.newPairing.trim());
        this.newPairing = '';
      }
    }
  
    removePairing(itemIndex: number, pairingIndex: number): void {
      this.menuItems[itemIndex].pairings.splice(pairingIndex, 1);
    }
  
    addSide(itemIndex: number): void {
      if (this.newSide.trim()) {
        this.menuItems[itemIndex].sides.push(this.newSide.trim());
        this.newSide = '';
      }
    }
  
    removeSide(itemIndex: number, sideIndex: number): void {
      this.menuItems[itemIndex].sides.splice(sideIndex, 1);
    }
  
    toggleDetail(detailType: 'preparation' | 'variation' | 'pairing' | 'side', itemIndex: number): void {
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
    
    saveMenu(): void {
      this.isSaving = true;
      console.log("Menu Items with IDs:", this.menuItems);
    
      if (this.currentMenuID.length < 1) {
        this.newMenu = {
          menuID: '1',
          restaurantID: this.selectedRestaurant,
          categories: this.categories,
          items: this.menuItems,
          OwnerID: this.OwnerID,
          Status: false,
          isDraft: true,
          menuName: this.menuName,
          qrAssigned: false,
          qrUrl: ''
        };
    
        this.firestore.collection('menus').add(this.newMenu)
          .then((data) => {
            this.currentMenuID = data.id;
            this.newMenu = {
              ...this.newMenu,
              menuID: data.id,
              location: this.findCityAndProvince(this.selectedRestaurant)
            };
    
            return this.firestore.collection('menus').doc(data.id).update(this.newMenu);
          })
          .then(() => {
            return this.firestore.collection('restuarants')
              .doc(this.selectedRestaurant)
              .update({ menuID: this.currentMenuID });
          })
          .then(() => {
            console.log('Restaurant ID edited');
            this.isSaving = false;
            this.doneSaveSubject.next(true); // Move this outside of Firestore subscriptions
            this.nextStep();
          })
          .catch(error => {
            console.error('Error adding menu: ', error);
          });
      } else {
        this.newMenu = {
          menuID: this.currentMenuID,
          restaurantID: this.selectedRestaurant,
          categories: this.categories,
          items: this.menuItems,
          OwnerID: this.OwnerID,
          Status: false,
          isDraft: true,
          menuName: this.menuName,
          qrAssigned: false,
          qrUrl: '',
          location: this.findCityAndProvince(this.selectedRestaurant)
        };
    
        this.firestore.collection('menus').doc(this.currentMenuID)
          .update(this.newMenu)
          .then(() => {
            this.doneSaveSubject.next(true); // Ensure it emits only once here
          });
      }
    }
    
    private handleDoneSaveChange() {
      this.toastr.success('Menu has been saved successfully!');
      console.log('doneSave changed to true');
    }

    toggleLabelInput(itemIndex: number): void {
      console.log(this.categories);
      this.menuItems[itemIndex].showLabelInput = !this.menuItems[itemIndex].showLabelInput;
    }
  
    addLabel(itemIndex: number): void {
      if (this.newLabel.trim()) {
        this.menuItems[itemIndex].labels = this.newLabel.trim();
        this.newLabel = '';
        this.menuItems[itemIndex].showLabelInput = false;
      }
    }

    setAsDraft() {
      this.saveMenu();
    
      this.doneSave$.pipe(take(1)).subscribe((doneSave) => {
        if (doneSave && !this.setAsDraftSaved) {
          this.firestore
            .collection("menus")
            .doc(this.currentMenuID)
            .update({ 'isDraft': true })
            .then(() => {
              this.setAsDraftSaved = true;
              this.toastr.success('This menu has been drafted');
            });
        }
      });
    }
    
    
    findCityAndProvince(restaurantID: string|undefined): string {
      const foundRestaurant = this.restuarants.find(restaurant => restaurant.restaurantID === restaurantID);
      if (foundRestaurant) {
          return  foundRestaurant.city +', ' + foundRestaurant.province;
      }
      return '';
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
    if (this.currentStep === 5) {
      if (!this.menuSaved){
        this.saveMenu();
        this.menuSaved = true;
      }
     
    }
  }
  
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }
  
  completeSetup() {
    // Handle the final step logic
    console.log("Setup completed!");
  }
}

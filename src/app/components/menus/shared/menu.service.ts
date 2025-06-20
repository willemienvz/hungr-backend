/* KB */ // Shared service for menu operations to unify functionality between add-menu and edit-menu
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ToastrService } from 'ngx-toastr';
import { Papa } from 'ngx-papaparse';
import { Category } from '../../../shared/services/category';
import { Restaurant } from '../../../shared/services/restaurant';

export interface MenuItemInterface {
  itemId: string;
  categoryId: number | null;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null; // Keep for backward compatibility
  imageUrls: string[]; // New array for multiple images
  preparations: string[];
  variations: string[];
  pairings: string[]; // Keep for backward compatibility
  pairingIds: string[]; // New array for menu item references
  sides: string[];
  labels: string[];
  showLabelInput: boolean;
  displayDetails: {
    preparation: boolean;
    variation: boolean;
    pairing: boolean;
    side: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private toastr: ToastrService,
    private papa: Papa
  ) {}

  // Validation methods
  validateMenuName(menuName: string): boolean {
    return !!menuName.trim();
  }

  validateRestaurant(selectedRestaurant: string): boolean {
    return !!selectedRestaurant.trim();
  }

  // Price formatting
  formatPriceInput(inputValue: string): string {
    if (!inputValue.startsWith('R ')) {
      inputValue = 'R ' + inputValue.replace(/^R\s*/, '');
    }
    return inputValue;
  }

  // Category management
  addCategory(categories: Category[], newCategoryName: string): Category[] {
    if (newCategoryName.trim()) {
      const newId = categories.length
        ? Math.max(...categories.map((cat) => cat.id)) + 1
        : 1;
      const newCategory: Category = {
        id: newId,
        name: newCategoryName.trim(),
        subcategories: [],
      };
      return [...categories, newCategory];
    }
    return categories;
  }

  addSubCategory(categories: Category[], categoryIndex: number, subcategoryName: string): Category[] {
    if (subcategoryName?.trim()) {
      const updatedCategories = [...categories];
      const category = updatedCategories[categoryIndex];
      const newSubId = category.subcategories.length
        ? Math.max(...category.subcategories.map((sub) => sub.id)) + 1
        : 1;
      category.subcategories.push({
        id: newSubId,
        name: subcategoryName.trim(),
      });
      return updatedCategories;
    }
    return categories;
  }

  deleteCategory(categories: Category[], index: number): Category[] {
    const updatedCategories = [...categories];
    updatedCategories.splice(index, 1);
    return updatedCategories;
  }

  deleteSubCategory(categories: Category[], categoryIndex: number, subcategoryIndex: number): Category[] {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].subcategories.splice(subcategoryIndex, 1);
    return updatedCategories;
  }

  // Menu item management
  createMenuItem(): MenuItemInterface {
    return {
      itemId: uuidv4(),
      categoryId: null,
      name: '',
      description: '',
      price: 'R ',
      imageUrl: null,
      imageUrls: [],
      preparations: [],
      variations: [],
      pairings: [],
      pairingIds: [],
      sides: [],
      labels: [],
      showLabelInput: false,
      displayDetails: {
        preparation: false,
        variation: false,
        pairing: false,
        side: false,
      },
    };
  }

  addMenuItem(menuItems: MenuItemInterface[]): MenuItemInterface[] {
    return [...menuItems, this.createMenuItem()];
  }

  removeMenuItem(menuItems: MenuItemInterface[], index: number): MenuItemInterface[] {
    const updatedItems = [...menuItems];
    updatedItems.splice(index, 1);
    return updatedItems;
  }

  // Detail management (preparations, variations, etc.)
  addToItemArray(menuItems: MenuItemInterface[], itemIndex: number, arrayType: string, newValue: string): MenuItemInterface[] {
    if (newValue.trim()) {
      const updatedItems = [...menuItems];
      (updatedItems[itemIndex] as any)[arrayType].push(newValue.trim());
      return updatedItems;
    }
    return menuItems;
  }

  removeFromItemArray(menuItems: MenuItemInterface[], itemIndex: number, arrayType: string, arrayIndex: number): MenuItemInterface[] {
    const updatedItems = [...menuItems];
    (updatedItems[itemIndex] as any)[arrayType].splice(arrayIndex, 1);
    return updatedItems;
  }

  // Menu item pairing management (reference-based)
  addMenuItemPairing(menuItems: MenuItemInterface[], itemIndex: number, pairingId: string): MenuItemInterface[] {
    const updatedItems = [...menuItems];
    if (!updatedItems[itemIndex].pairingIds) {
      updatedItems[itemIndex].pairingIds = [];
    }
    if (!updatedItems[itemIndex].pairingIds.includes(pairingId)) {
      updatedItems[itemIndex].pairingIds.push(pairingId);
    }
    return updatedItems;
  }

  removeMenuItemPairing(menuItems: MenuItemInterface[], itemIndex: number, pairingId: string): MenuItemInterface[] {
    const updatedItems = [...menuItems];
    if (updatedItems[itemIndex].pairingIds) {
      updatedItems[itemIndex].pairingIds = updatedItems[itemIndex].pairingIds.filter(id => id !== pairingId);
    }
    return updatedItems;
  }

  toggleDetail(menuItems: MenuItemInterface[], detailType: 'preparation' | 'variation' | 'pairing' | 'side', itemIndex: number): MenuItemInterface[] {
    const updatedItems = [...menuItems];
    updatedItems[itemIndex].displayDetails[detailType] = !updatedItems[itemIndex].displayDetails[detailType];
    return updatedItems;
  }

  // File upload
  uploadMenuItemImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const filePath = `menu-items/${Date.now()}_${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);

      task
        .snapshotChanges()
        .pipe(
          finalize(() => {
            fileRef.getDownloadURL().subscribe({
              next: (url) => resolve(url),
              error: (error) => reject(error)
            });
          })
        )
        .subscribe();
    });
  }

  updateMenuItemImage(menuItems: MenuItemInterface[], itemIndex: number, imageUrl: string): MenuItemInterface[] {
    const updatedItems = [...menuItems];
    updatedItems[itemIndex].imageUrl = imageUrl;
    return updatedItems;
  }

  /* KB: Add method to delete menu item image from Firebase Storage */
  deleteMenuItemImage(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Extract the file path from the Firebase Storage URL
        // Firebase URLs typically have format: https://firebasestorage.googleapis.com/.../menu-items%2F{filename}
        const decodedUrl = decodeURIComponent(imageUrl);
        const pathMatch = decodedUrl.match(/menu-items\/[^?]+/);
        
        if (pathMatch) {
          const filePath = pathMatch[0];
          const fileRef = this.storage.ref(filePath);
          
          fileRef.delete().subscribe({
            next: () => {
              console.log('Image deleted successfully from Firebase Storage');
              resolve();
            },
            error: (error) => {
              console.error('Error deleting image from Firebase Storage:', error);
              reject(error);
            }
          });
        } else {
          console.warn('Could not extract file path from URL:', imageUrl);
          resolve(); // Don't fail the operation if we can't delete the file
        }
      } catch (error) {
        console.error('Error parsing image URL:', error);
        reject(error);
      }
    });
  }

  // Restaurant operations
  fetchRestaurants(ownerId: string) {
    return this.firestore
      .collection<Restaurant>('restuarants', (ref) =>
        ref.where('ownerID', '==', ownerId)
      )
      .valueChanges();
  }

  /* KB: Sanitize data for Firebase - convert undefined to null and remove invalid values */
  private sanitizeDataForFirebase(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeDataForFirebase(item));
    }
    
    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const value = data[key];
          if (value !== undefined) {
            sanitized[key] = this.sanitizeDataForFirebase(value);
          }
        }
      }
      return sanitized;
    }
    
    return data;
  }

  // Menu operations
  saveMenu(menuData: any): Promise<string> {
    return new Promise((resolve, reject) => {
      /* KB: Sanitize data before saving to prevent Firebase errors */
      const sanitizedData = this.sanitizeDataForFirebase(menuData);
      
      this.firestore.collection('menus').add(sanitizedData)
        .then((docRef) => {
          this.toastr.success('Menu saved successfully!');
          resolve(docRef.id);
        })
        .catch((error) => {
          console.error('Error saving menu:', error);
          this.toastr.error('Error saving menu');
          reject(error);
        });
    });
  }

  updateMenu(menuId: string, menuData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      /* KB: Sanitize data before updating to prevent Firebase errors */
      const sanitizedData = this.sanitizeDataForFirebase(menuData);
      
      this.firestore.collection('menus').doc(menuId).update(sanitizedData)
        .then(() => {
          this.toastr.success('Menu updated successfully!');
          resolve();
        })
        .catch((error) => {
          console.error('Error updating menu:', error);
          this.toastr.error('Error updating menu');
          reject(error);
        });
    });
  }

  loadMenu(menuId: string) {
    return this.firestore.collection('menus').doc(menuId).valueChanges();
  }

  // Utility methods
  getGenericCategories(): Category[] {
    return [
      { id: 1, name: 'Appetizers', subcategories: [] },
      { id: 2, name: 'Main Courses', subcategories: [] },
      { id: 3, name: 'Desserts', subcategories: [] },
      { id: 4, name: 'Beverages', subcategories: [] },
    ];
  }

  getCategoryIdByName(categories: Category[], categoryName: string): number | null {
    const category = categories.find(
      (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    return category ? category.id : null;
  }

  initializeArrays(categoriesLength: number): string[] {
    return Array(categoriesLength).fill('');
  }

  findCityAndProvince(restaurants: Restaurant[], restaurantID: string | undefined): string {
    const restaurant = restaurants.find(r => r.restaurantID === restaurantID);
    return restaurant ? `${restaurant.city}, ${restaurant.province}` : '';
  }

  downloadTemplate(existingMenuItems?: MenuItemInterface[], categories?: Category[]) {
    const headers = 'name,description,price,category,preparations,variations,pairings,sides,labels';
    const rows: string[] = [headers];

    // Add existing menu items if provided
    if (existingMenuItems && existingMenuItems.length > 0 && categories) {
      existingMenuItems.forEach(item => {
        // Skip empty menu items (items with no name)
        if (!item.name.trim()) return;

        // Find category name by ID
        const categoryName = item.categoryId 
          ? categories.find(cat => cat.id === item.categoryId)?.name || ''
          : '';

        // Convert arrays to pipe-separated strings
        const preparations = item.preparations.join('|');
        const variations = item.variations.join('|');
        const pairings = item.pairings.join('|');
        const sides = item.sides.join('|');
        const labels = item.labels.join('|');

        // Escape commas and quotes in CSV values
        const escapeCsvValue = (value: string) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };

        const row = [
          escapeCsvValue(item.name),
          escapeCsvValue(item.description),
          escapeCsvValue(item.price),
          escapeCsvValue(categoryName),
          escapeCsvValue(preparations),
          escapeCsvValue(variations),
          escapeCsvValue(pairings),
          escapeCsvValue(sides),
          escapeCsvValue(labels),
        ].join(',');

        rows.push(row);
      });
    }

    // Add sample row if no existing items or as an example
    if (!existingMenuItems || existingMenuItems.length === 0) {
      rows.push('Sample Item,Sample Description,R 25.00,Appetizers,Grilled|Fried,Small|Large,Wine|Beer,Fries|Salad,Spicy');
    } else {
      // Add an empty sample row for reference when there are existing items
    //   rows.push(',,R ,,,,,,"Add new items below this line"');
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /* KB - File parsing methods for bulk upload */
  
  parseMenuFile(file: File, categories: Category[]): Promise<MenuItemInterface[]> {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        this.parseCsvFile(file, categories).then(resolve).catch(reject);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // For now, show error that Excel support needs to be added
        this.toastr.error('Excel file support coming soon. Please use CSV format.');
        reject(new Error('Excel files not yet supported'));
      } else {
        this.toastr.error('Unsupported file format. Please use CSV or Excel files.');
        reject(new Error('Unsupported file format'));
      }
    });
  }

  private parseCsvFile(file: File, categories: Category[]): Promise<MenuItemInterface[]> {
    return new Promise((resolve, reject) => {
      this.papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          try {
            const menuItems = this.convertCsvDataToMenuItems(result.data, categories);
            resolve(menuItems);
          } catch (error) {
            console.error('Error converting CSV data:', error);
            this.toastr.error('Error parsing CSV file. Please check the format.');
            reject(error);
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          this.toastr.error('Error reading CSV file.');
          reject(error);
        }
      });
    });
  }

  private convertCsvDataToMenuItems(csvData: any[], categories: Category[]): MenuItemInterface[] {
    const menuItems: MenuItemInterface[] = [];

    csvData.forEach((row: any) => {
      // Skip empty rows or rows without a name
      if (!row.name || !row.name.trim()) return;

      // Find category ID by name
      const categoryId = row.category 
        ? this.getCategoryIdByName(categories, row.category.trim())
        : null;

      // Parse pipe-separated arrays
      const parseArray = (value: string): string[] => {
        if (!value || !value.trim()) return [];
        return value.split('|').map(item => item.trim()).filter(item => item.length > 0);
      };

      // Ensure price has 'R ' prefix
      let price = row.price || 'R ';
      if (!price.startsWith('R ')) {
        price = 'R ' + price.replace(/^R\s*/, '');
      }

      const preparations = parseArray(row.preparations);
      const variations = parseArray(row.variations);
      const pairings = parseArray(row.pairings);
      const sides = parseArray(row.sides);
      const labels = parseArray(row.labels);

      const menuItem: MenuItemInterface = {
        itemId: uuidv4(),
        categoryId: categoryId,
        name: row.name.trim(),
        description: row.description ? row.description.trim() : '',
        price: price,
        imageUrl: null,
        imageUrls: [],
        preparations: preparations,
        variations: variations,
        pairings: pairings,
        pairingIds: [],
        sides: sides,
        labels: labels,
        showLabelInput: false,
        displayDetails: {
          preparation: preparations.length > 0,
          variation: variations.length > 0,
          pairing: pairings.length > 0,
          side: sides.length > 0,
        },
      };

      menuItems.push(menuItem);
    });

    return menuItems;
  }
} 
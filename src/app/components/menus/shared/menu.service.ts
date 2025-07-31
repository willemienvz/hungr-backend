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

/* KB: New interface for enhanced side management with optional pricing and allergens */
export interface SideItem {
  name: string;
  price?: string; // Optional price in same format as main item price (R 0.00)
  allergens?: string[]; // Optional allergen list for this specific side
}

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
  sides: (string | SideItem)[]; // Backward compatible - supports both formats
  allergens: string[]; // New field for item-level allergens
  labels: string[];
  showLabelInput: boolean;
  displayDetails: {
    preparation: boolean;
    variation: boolean;
    pairing: boolean;
    side: boolean;
    allergen: boolean;
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
      const newId = this.getNextUniqueId(categories);
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
      const newSubId = this.getNextUniqueId(updatedCategories);
      category.subcategories.push({
        id: newSubId,
        name: subcategoryName.trim(),
      });
      return updatedCategories;
    }
    return categories;
  }

  /**
   * CRITICAL FIX FOR CATEGORY ID CONFLICTS:
   * 
   * The original implementation assigned IDs separately for main categories and subcategories,
   * which caused conflicts where both could have the same ID. For example:
   * - Main category "Appetizers" might have ID: 1
   * - Subcategory "Hot Appetizers" under "Appetizers" might also have ID: 1
   * 
   * This caused issues when assigning menu items to categories because the system
   * couldn't distinguish between main categories and subcategories with the same ID.
   * 
   * The fix ensures ALL categories and subcategories get unique IDs across the entire
   * category hierarchy, eliminating conflicts and enabling proper category assignment.
   */
  
  // Helper method to get the next unique ID across all categories and subcategories
  private getNextUniqueId(categories: Category[]): number {
    const allIds: number[] = [];
    
    // Collect all main category IDs
    categories.forEach(category => {
      allIds.push(category.id);
      
      // Collect all subcategory IDs
      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          allIds.push(subcategory.id);
        });
      }
    });
    
    // Return the next available ID
    return allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
  }

  // Helper method to fix duplicate IDs in existing category structures
  fixCategoryIds(categories: Category[]): Category[] {
    const fixedCategories: Category[] = [];
    let currentId = 1;
    
    categories.forEach(category => {
      const fixedCategory: Category = {
        ...category,
        id: currentId++,
        subcategories: []
      };
      
      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          fixedCategory.subcategories!.push({
            ...subcategory,
            id: currentId++
          });
        });
      }
      
      fixedCategories.push(fixedCategory);
    });
    
    return fixedCategories;
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
      allergens: [],
      labels: [],
      showLabelInput: false,
      displayDetails: {
        preparation: false,
        variation: false,
        pairing: false,
        side: false,
        allergen: false,
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
      // Initialize array if it doesn't exist (for backward compatibility with older menu items)
      if (!(updatedItems[itemIndex] as any)[arrayType]) {
        (updatedItems[itemIndex] as any)[arrayType] = [];
      }
      (updatedItems[itemIndex] as any)[arrayType].push(newValue.trim());
      return updatedItems;
    }
    return menuItems;
  }

  removeFromItemArray(menuItems: MenuItemInterface[], itemIndex: number, arrayType: string, arrayIndex: number): MenuItemInterface[] {
    const updatedItems = [...menuItems];
    // Check if array exists before trying to remove from it
    if ((updatedItems[itemIndex] as any)[arrayType] && Array.isArray((updatedItems[itemIndex] as any)[arrayType])) {
      (updatedItems[itemIndex] as any)[arrayType].splice(arrayIndex, 1);
    }
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

  toggleDetail(menuItems: MenuItemInterface[], detailType: 'preparation' | 'variation' | 'pairing' | 'side' | 'allergen', itemIndex: number): MenuItemInterface[] {
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
    // First check main categories
    const category = categories.find(
      (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (category) return category.id;

    // Then check subcategories
    for (const cat of categories) {
      if (cat.subcategories) {
        const subcategory = cat.subcategories.find(
          (sub) => sub.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (subcategory) return subcategory.id;
      }
    }

    return null;
  }

  // Helper method to find category or subcategory by ID
  findCategoryById(categories: Category[], categoryId: number): { category: Category; subcategory?: Category } | null {
    // Check main categories first
    const mainCategory = categories.find(cat => cat.id === categoryId);
    if (mainCategory) {
      return { category: mainCategory };
    }

    // Check subcategories
    for (const category of categories) {
      if (category.subcategories) {
        const subcategory = category.subcategories.find(sub => sub.id === categoryId);
        if (subcategory) {
          return { category, subcategory };
        }
      }
    }

    return null;
  }

  // Diagnostic method to check for ID conflicts
  checkCategoryIdConflicts(categories: Category[]): { hasConflicts: boolean; conflicts: any[] } {
    const idMap = new Map<number, string[]>();
    const conflicts: any[] = [];

    // Collect all IDs and their sources
    categories.forEach(category => {
      const sources = idMap.get(category.id) || [];
      sources.push(`Main Category: ${category.name}`);
      idMap.set(category.id, sources);

      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          const subSources = idMap.get(subcategory.id) || [];
          subSources.push(`Subcategory: ${subcategory.name} (under ${category.name})`);
          idMap.set(subcategory.id, subSources);
        });
      }
    });

    // Find conflicts
    idMap.forEach((sources, id) => {
      if (sources.length > 1) {
        conflicts.push({ id, sources });
      }
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  // Helper method to display category structure for debugging
  displayCategoryStructure(categories: Category[]): void {
    console.log('=== Category Structure ===');
    categories.forEach(category => {
      console.log(`📁 ${category.name} (ID: ${category.id})`);
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach(subcategory => {
          console.log(`  📄 ${subcategory.name} (ID: ${subcategory.id})`);
        });
      }
    });
    console.log('=========================');
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
        allergens: [], // Initialize allergens as empty array
        labels: labels,
        showLabelInput: false,
        displayDetails: {
          preparation: preparations.length > 0,
          variation: variations.length > 0,
          pairing: pairings.length > 0,
          side: sides.length > 0,
          allergen: false,
        },
      };

      menuItems.push(menuItem);
    });

    return menuItems;
  }
} 
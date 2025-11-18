/* KB */ // Shared service for menu operations to unify functionality between add-menu and edit-menu
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { ToastrService } from 'ngx-toastr';
import { Papa } from 'ngx-papaparse';
import * as XLSX from 'xlsx';
import { Category } from '../../../shared/services/category';
import { Restaurant } from '../../../shared/services/restaurant';

/* KB: New interface for enhanced side management with optional pricing and allergens */
export interface SideItem {
  name: string;
  price?: string; // Optional price in same format as main item price (R 0.00)
  allergens?: string[]; // Optional allergen list for this specific side
}

/* KB: Interface for preparation items - simplified to text only */
export interface PreparationItem {
  name: string;
  // Removed price property - preparations are now text-only
}

/* KB: Interface for variation items with optional pricing */
export interface VariationItem {
  name: string;
  price?: string; // Optional price in same format as main item price (R 0.00)
}

/* KB: Interface for sauce items with optional pricing */
export interface SauceItem {
  name: string;
  price?: string; // Optional price in same format as main item price (R 0.00)
}

export interface MenuItemInterface {
  itemId: string;
  categoryId: number | null;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null; // Keep for backward compatibility
  imageUrls: string[]; // New array for multiple images
  preparations: string[]; // Simplified to string array only - no pricing
  variations: (string | VariationItem)[]; // Backward compatible - supports both formats
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
    sauce: boolean;
  };
  sauces: (string | SauceItem)[]; // Backward compatible - supports both formats
  // Custom heading overrides for detail sections
  customHeadings?: {
    preparation?: string;
    variation?: string;
    pairing?: string;
    side?: string;
    allergen?: string;
    sauce?: string;
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

  // Add method to check for duplicate menu names
  checkDuplicateMenuName(menuName: string, ownerId: string, excludeMenuId?: string): Observable<boolean> {
    if (!menuName || !menuName.trim()) {
      return of(false);
    }

    return this.firestore
      .collection('menus', (ref) => {
        let query = ref
          .where('OwnerID', '==', ownerId)
          .where('menuName', '==', menuName.trim());
        
        // Exclude current menu when editing
        if (excludeMenuId) {
          query = query.where('menuID', '!=', excludeMenuId);
        }
        
        return query;
      })
      .get()
      .pipe(
        map(querySnapshot => !querySnapshot.empty)
      );
  }

  // Price formatting - simplified to only add currency prefix if missing
  formatPriceInput(inputValue: string): string {
    if (!inputValue) return 'R 0.00';
    if (!inputValue.startsWith('R ')) {
      return 'R ' + inputValue.replace(/^R\s*/, '');
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

  // Helper method to convert existing PreparationItem objects to strings
  convertPreparationsToStrings(preparations: (string | PreparationItem)[]): string[] {
    return preparations.map(prep => {
      if (typeof prep === 'string') {
        return prep;
      } else {
        return prep.name; // Convert PreparationItem object to string
      }
    });
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
      preparations: [], // Now string array only
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
        sauce: false,
      },
      sauces: [],
      customHeadings: {},
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

  toggleDetail(menuItems: MenuItemInterface[], detailType: 'preparation' | 'variation' | 'pairing' | 'side' | 'allergen' | 'sauce', itemIndex: number): MenuItemInterface[] {
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
      .collection<Restaurant>('restaurants', (ref) =>
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
    // Define headers with all fields including pricing and custom headings
    const headers = [
      'name', 
      'description', 
      'price', 
      'category', 
      'preparations', 
      'variations', 
      'variation_prices', // New: pricing for variations
      'pairings', 
      'sides', 
      'side_prices', // New: pricing for sides
      'labels', 
      'allergens', 
      'sauces',
      'sauce_prices', // New: pricing for sauces
      'custom_preparation_heading', // New: custom headings
      'custom_variation_heading',
      'custom_pairing_heading',
      'custom_side_heading',
      'custom_allergen_heading',
      'custom_sauce_heading',
      'image_urls' // New: multiple image support
    ];
    
    const data: any[] = [headers];

    // Add existing menu items if provided
    if (existingMenuItems && existingMenuItems.length > 0 && categories) {
      existingMenuItems.forEach(item => {
        if (!item.name.trim()) return;

        const categoryName = item.categoryId 
          ? categories.find(cat => cat.id === item.categoryId)?.name || ''
          : '';

        // Enhanced field extraction with pricing support
        const preparations = item.preparations.join('|');
        const variations = item.variations.map(v => typeof v === 'string' ? v : v.name).join('|');
        const variationPrices = item.variations.map(v => typeof v === 'string' ? '' : (v.price || '')).join('|');
        const sides = item.sides.map(s => typeof s === 'string' ? s : s.name).join('|');
        const sidePrices = item.sides.map(s => typeof s === 'string' ? '' : (s.price || '')).join('|');
        const sauces = item.sauces.map(s => typeof s === 'string' ? s : s.name).join('|');
        const saucePrices = item.sauces.map(s => typeof s === 'string' ? '' : (s.price || '')).join('|');
        
        const row = [
          item.name,
          item.description,
          item.price,
          categoryName,
          preparations,
          variations,
          variationPrices,
          item.pairings.join('|'),
          sides,
          sidePrices,
          item.labels.join('|'),
          item.allergens.join('|'),
          sauces,
          saucePrices,
          item.customHeadings?.preparation || '',
          item.customHeadings?.variation || '',
          item.customHeadings?.pairing || '',
          item.customHeadings?.side || '',
          item.customHeadings?.allergen || '',
          item.customHeadings?.sauce || '',
          item.imageUrls.join('|')
        ];

        data.push(row);
      });
    }

    // Enhanced sample data
    if (!existingMenuItems || existingMenuItems.length === 0) {
      data.push([
        'Sample Item',
        'Sample Description', 
        'R 25.00',
        'Appetizers',
        'Grilled|Fried',
        'Small|Large',
        'R 5.00|R 8.00',
        'Wine|Beer',
        'Fries|Salad',
        'R 15.00|R 12.00',
        'Spicy|Popular',
        'Nuts|Dairy',
        'Hot Sauce|BBQ',
        'R 3.00|R 4.00',
        'Cooking Style',
        'Size Options',
        'Recommended Drinks',
        'Side Dishes',
        'Allergen Information',
        'Sauce Options',
        'https://example.com/image1.jpg|https://example.com/image2.jpg'
      ]);
    }


    // Create workbook with enhanced formatting
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Enhanced column widths
    const colWidths = [
      { wch: 20 }, // name
      { wch: 30 }, // description
      { wch: 12 }, // price
      { wch: 15 }, // category
      { wch: 20 }, // preparations
      { wch: 15 }, // variations
      { wch: 15 }, // variation_prices
      { wch: 15 }, // pairings
      { wch: 15 }, // sides
      { wch: 15 }, // side_prices
      { wch: 15 }, // labels
      { wch: 15 }, // allergens
      { wch: 15 }, // sauces
      { wch: 15 }, // sauce_prices
      { wch: 20 }, // custom_preparation_heading
      { wch: 20 }, // custom_variation_heading
      { wch: 20 }, // custom_pairing_heading
      { wch: 20 }, // custom_side_heading
      { wch: 20 }, // custom_allergen_heading
      { wch: 20 }, // custom_sauce_heading
      { wch: 30 }  // image_urls
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Menu Template');

    // Generate and download
    const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-template-enhanced.xlsx';
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
        this.parseXlsxFile(file, categories).then(resolve).catch(reject);
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

  private parseXlsxFile(file: File, categories: Category[]): Promise<MenuItemInterface[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert worksheet to JSON array
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row');
          }
          
          // Convert to the same format as CSV data
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          
          const csvData = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          
          const menuItems = this.convertCsvDataToMenuItems(csvData, categories);
          resolve(menuItems);
        } catch (error) {
          console.error('Error parsing XLSX file:', error);
          this.toastr.error('Error parsing Excel file. Please check the format.');
          reject(error);
        }
      };
      
      reader.onerror = () => {
        this.toastr.error('Error reading Excel file.');
        reject(new Error('File read error'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  private convertCsvDataToMenuItems(csvData: any[], categories: Category[]): MenuItemInterface[] {
    const menuItems: MenuItemInterface[] = [];
    const errors: string[] = [];

    csvData.forEach((row: any, index: number) => {
      // Skip empty rows
      if (!row.name || !row.name.trim()) return;

      try {
        // Validate required fields
        if (!row.name?.trim()) {
          errors.push(`Row ${index + 1}: Name is required`);
          return;
        }

        if (!row.price?.trim()) {
          errors.push(`Row ${index + 1}: Price is required`);
          return;
        }

        // Find category ID by name
        const categoryId = row.category 
          ? this.getCategoryIdByName(categories, row.category.trim())
          : null;

        if (row.category && !categoryId) {
          errors.push(`Row ${index + 1}: Category "${row.category}" not found`);
        }

        // Enhanced parsing with pricing support
        const parseArrayWithPrices = (names: string, prices: string): (string | any)[] => {
          if (!names || !names.trim()) return [];
          
          const nameArray = names.split('|').map(item => item.trim()).filter(item => item.length > 0);
          const priceArray = prices ? prices.split('|').map(item => item.trim()) : [];
          
          return nameArray.map((name, i) => {
            const price = priceArray[i] && priceArray[i] !== '' ? priceArray[i] : undefined;
            return price ? { name, price } : name;
          });
        };

        // Parse all fields with enhanced support
        const preparations = parseArrayWithPrices(row.preparations, '');
        const variations = parseArrayWithPrices(row.variations, row.variation_prices || '');
        const sides = parseArrayWithPrices(row.sides, row.side_prices || '');
        const sauces = parseArrayWithPrices(row.sauces, row.sauce_prices || '');
        
        const parseArray = (value: string): string[] => {
          if (!value || !value.trim()) return [];
          return value.split('|').map(item => item.trim()).filter(item => item.length > 0);
        };

        // Ensure price has 'R ' prefix
        let price = row.price || 'R ';
        if (!price.startsWith('R ')) {
          price = 'R ' + price.replace(/^R\s*/, '');
        }

        // Parse image URLs
        const imageUrls = parseArray(row.image_urls || '');

        const menuItem: MenuItemInterface = {
          itemId: uuidv4(),
          categoryId: categoryId,
          name: row.name.trim(),
          description: row.description ? row.description.trim() : '',
          price: price,
          imageUrl: imageUrls.length > 0 ? imageUrls[0] : null,
          imageUrls: imageUrls,
          preparations: preparations,
          variations: variations,
          pairings: parseArray(row.pairings),
          pairingIds: [],
          sides: sides,
          allergens: parseArray(row.allergens),
          labels: parseArray(row.labels),
          showLabelInput: false,
          displayDetails: {
            preparation: preparations.length > 0,
            variation: variations.length > 0,
            pairing: parseArray(row.pairings).length > 0,
            side: sides.length > 0,
            allergen: parseArray(row.allergens).length > 0,
            sauce: sauces.length > 0,
          },
          sauces: sauces,
          customHeadings: {
            preparation: row.custom_preparation_heading?.trim() || undefined,
            variation: row.custom_variation_heading?.trim() || undefined,
            pairing: row.custom_pairing_heading?.trim() || undefined,
            side: row.custom_side_heading?.trim() || undefined,
            allergen: row.custom_allergen_heading?.trim() || undefined,
            sauce: row.custom_sauce_heading?.trim() || undefined,
          }
        };

        menuItems.push(menuItem);
      } catch (error) {
        errors.push(`Row ${index + 1}: ${error.message}`);
      }
    });

    // Show errors if any
    if (errors.length > 0) {
      this.toastr.error(`Found ${errors.length} errors in the uploaded file. Please check the console for details.`);
      console.error('Bulk upload errors:', errors);
    }

    return menuItems;
  }
} 
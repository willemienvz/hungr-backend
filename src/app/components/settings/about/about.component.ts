import { Component, ViewChild, ElementRef } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { User } from '../../../shared/services/user';
import { Restaurant } from '../../../shared/services/restaurant';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { MediaUploadModalService } from '../../../shared/services/media-upload-modal.service';
import { MediaLibraryService } from '../../../shared/services/media-library.service';
import { MediaItem } from '../../../shared/types/media';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  @ViewChild('previewIframe') previewIframe: ElementRef;

  aboutText: string = '';
  businessHours: string = '';
  email: string = '';
  isSaving: boolean = false;
  cellphone: string = '';
  userDataID: string = '';
  isBusinessHoursVisible: boolean = true;
  isContactDetailsVisible: boolean = true;
  currentUser: any;
  mainImageUrl: string = '';
  additionalImageUrls: string[] = []; // Changed from additionalImageUrl to support multiple images
  userData$!: Observable<any>;
  about: any;
  hasUnsavedChanges: boolean = false;
  private originalValues: any = {};

  users: User[] = [];
  mainUserName: string = '';
  
  // Restaurant selection
  restaurants: Restaurant[] = [];
  selectedRestaurantId: string = '';
  selectedRestaurant: Restaurant | null = null;
  isLoadingRestaurants: boolean = false;

  // Menu selection for preview
  menus: any[] = [];
  selectedMenuId: string = '';
  isLoadingMenus: boolean = false;

  // Select options for app-form-select
  get restaurantSelectOptions() {
    return this.restaurants.map(restaurant => ({
      value: restaurant.restaurantID,
      label: `${restaurant.restaurantName} - ${restaurant.city}, ${restaurant.province}${!restaurant.status ? ' (Inactive)' : ''}`,
      disabled: !restaurant.status
    }));
  }

  get menuSelectOptions() {
    return this.menus.map(menu => ({
      value: menu.menuID || menu.menuId || menu.id || menu._id,
      label: menu.menuName || menu.name || 'Unnamed Menu'
    }));
  }

  // Preview URL management
  private readonly previewUrlBase = 'https://main.d1ovxejc04tu3k.amplifyapp.com/menu/';
  private cachedPreviewUrl: SafeResourceUrl | null = null;
  private lastSelectedMenuId: string | null = null;
  
  constructor(
    private storage: AngularFireStorage,
    private router: Router,
    public authService: AuthService,
    private firestore: AngularFirestore,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private mediaUploadModalService: MediaUploadModalService,
    private mediaLibraryService: MediaLibraryService,
    private sanitizer: DomSanitizer
  ) {
    this.authService.getCurrentUserId().then((uid) => {
      if (uid) {
        this.userDataID = uid;
        this.fetchUsers();
        this.fetchRestaurants();
      } else {
        console.log('No authenticated user');
        this.router.navigate(['/signin']);
      }
    });
  }

  private fetchUsers() {
    const user = JSON.parse(localStorage.getItem('user')!);
    this.firestore
      .collection<User>('users', (ref) => ref.where('uid', '==', user.uid))
      .valueChanges()
      .subscribe((result) => {
        if (result.length > 0 && result[0].about) {
          this.aboutText = result[0].about.aboutText || '';
          this.businessHours = result[0].about.businessHours || '';
          this.email = result[0].about.email || '';
          this.cellphone = (result[0].about.cellphone || '').replace(
            /\s+/g,
            ''
          );
          this.isBusinessHoursVisible =
            result[0].about.isBusinessHoursVisible ?? true;
          this.isContactDetailsVisible =
            result[0].about.isContactDetailsVisible ?? true;
          this.mainImageUrl = result[0].about.mainImageUrl || '';
          this.additionalImageUrls = result[0].about.additionalImageUrls || []; // Updated to use array
          this.setupChangeTracking(); // Store initial values as original
        }
      });
  }

  private fetchRestaurants() {
    this.isLoadingRestaurants = true;
    
    // Get current user's restaurants based on their role and parentId
    const user = JSON.parse(localStorage.getItem('user')!);
    console.log('Current user from localStorage:', user);
    
    // Also try to get user from auth service
    this.authService.getCurrentUserId().then((uid) => {
      if (uid) {
        console.log('Current user ID from auth service:', uid);
        
        // Get user document to check account type
        this.firestore.collection('users').doc(uid).valueChanges().subscribe({
          next: (userDoc: any) => {
            console.log('User document:', userDoc);
            
            let query;
            
            // For about page settings, always restrict to user's own restaurants
            // This ensures users can only edit about pages for restaurants they own
            query = this.firestore.collection('restaurants', ref => 
              ref.where('ownerID', '==', uid)
            );
            console.log('Fetching restaurants for ownerID:', uid);
            
            query.valueChanges().subscribe({
              next: (restaurants: any[]) => {
                console.log('Found restaurants:', restaurants);
                this.restaurants = restaurants;
                this.isLoadingRestaurants = false;
                
                // Don't auto-select - let user choose explicitly
              },
              error: (error) => {
                console.error('Error fetching restaurants:', error);
                this.isLoadingRestaurants = false;
                this.toastr.error('Failed to load restaurants');
              }
            });
          },
          error: (error) => {
            console.error('Error fetching user document:', error);
            this.isLoadingRestaurants = false;
            this.toastr.error('Failed to load user information');
          }
        });
      } else {
        console.log('No authenticated user ID');
        this.isLoadingRestaurants = false;
      }
    });
  }

  onRestaurantChange(restaurantId: string) {
    // Handle both direct value and event object (for compatibility)
    const id = typeof restaurantId === 'string' ? restaurantId : restaurantId;
    this.selectedRestaurantId = id;
    this.selectedRestaurant = this.restaurants.find(r => r.restaurantID === id) || null;
    
    if (this.selectedRestaurant) {
      this.loadAboutData();
      this.fetchMenus(); // Fetch menus when restaurant changes
    }
  }

  private fetchMenus() {
    if (!this.selectedRestaurantId) return;
    
    this.isLoadingMenus = true;
    
    // Fetch active menus for the selected restaurant
    // Note: Removed orderBy to avoid index requirement - can be added back after creating the index
    this.firestore.collection('menus', ref => 
      ref.where('restaurantID', '==', this.selectedRestaurantId)
         .where('status', '==', 'active')
    ).valueChanges().subscribe({
      next: (menus: any[]) => {
        console.log('Found menus for restaurant:', menus);
        console.log('Sample menu structure:', menus.length > 0 ? menus[0] : 'No menus');
        
        // Sort menus by creation date manually to avoid index requirement
        this.menus = menus.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return dateB.getTime() - dateA.getTime(); // Most recent first
        });
        this.isLoadingMenus = false;
        
        // Auto-select the first menu if available
        if (this.menus.length > 0 && !this.selectedMenuId) {
          // Try different possible field names for menu ID
          const firstMenu = this.menus[0];
          this.selectedMenuId = firstMenu.menuID || firstMenu.menuId || firstMenu.id || firstMenu._id;
          console.log('First menu object:', firstMenu);
          console.log('Auto-selected first menu:', this.selectedMenuId);
          
          // Log all possible ID fields for debugging
          console.log('Available ID fields:', {
            menuID: firstMenu.menuID,
            menuId: firstMenu.menuId,
            id: firstMenu.id,
            _id: firstMenu._id
          });
          
          // Force preview URL update after auto-selection
          setTimeout(() => {
            this.getPreviewUrl();
          }, 100);
        }
      },
      error: (error) => {
        console.error('Error fetching menus:', error);
        this.isLoadingMenus = false;
        
        // Provide more specific error messages
        if (error.code === 'permission-denied') {
          this.toastr.error('Permission denied: Unable to access menu data');
        } else if (error.message && error.message.includes('index')) {
          this.toastr.error('Database index issue: Please contact support');
        } else {
          this.toastr.error('Failed to load menus. Please try again.');
        }
      }
    });
  }

  getPreviewUrl(): SafeResourceUrl {
    console.log('getPreviewUrl called with selectedMenuId:', this.selectedMenuId);
    console.log('Available menus:', this.menus);
    
    // Only update the URL if the menu selection has changed
    if (this.selectedMenuId !== this.lastSelectedMenuId) {
      console.log('Updating preview URL due to menu change:', {
        oldId: this.lastSelectedMenuId,
        newId: this.selectedMenuId
      });

      this.lastSelectedMenuId = this.selectedMenuId;

      if (this.selectedMenuId) {
        const url = `${this.previewUrlBase}${this.selectedMenuId}/about`;
        console.log('Generated preview URL:', url);
        this.cachedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else if (this.menus.length > 0) {
        // If no menu is selected but menus are available, select the first one
        const firstMenu = this.menus[0];
        this.selectedMenuId = firstMenu.menuID || firstMenu.menuId || firstMenu.id || firstMenu._id;
        if (this.selectedMenuId) {
          const url = `${this.previewUrlBase}${this.selectedMenuId}/about`;
          console.log('Auto-generated preview URL:', url);
          this.cachedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        } else {
          console.warn('Could not determine menu ID from first menu:', firstMenu);
          this.cachedPreviewUrl = null;
        }
      } else {
        console.log('No menus available, setting cachedPreviewUrl to null');
        this.cachedPreviewUrl = null;
      }
    }

    console.log('Returning cachedPreviewUrl:', this.cachedPreviewUrl);
    return this.cachedPreviewUrl || this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  onMenuSelectionChange(event: any) {
    if (event.value === this.selectedMenuId) {
      console.log('Same menu selected, skipping update');
      return;
    }

    console.log('Selected menu:', event.value);
    this.selectedMenuId = event.value;
    
    // Force preview URL update
    setTimeout(() => {
      this.getPreviewUrl();
    }, 100);
  }

  // Method to manually refresh the preview
  refreshPreview() {
    console.log('Manually refreshing preview...');
    this.getPreviewUrl();
  }

  private loadAboutData() {
    if (!this.selectedRestaurantId) return;
    
    // Load about data for the selected restaurant
    this.firestore.collection('aboutPages').doc(this.selectedRestaurantId).valueChanges().subscribe({
      next: (aboutData: any) => {
        if (aboutData) {
          this.aboutText = aboutData.aboutText || '';
          this.businessHours = aboutData.businessHours || '';
          this.email = aboutData.email || '';
          this.cellphone = aboutData.cellphone || '';
          this.isBusinessHoursVisible = aboutData.isBusinessHoursVisible ?? true;
          this.isContactDetailsVisible = aboutData.isContactDetailsVisible ?? true;
          this.mainImageUrl = aboutData.mainImageUrl || '';
          this.additionalImageUrls = aboutData.additionalImageUrls || []; // Updated to use array
        } else {
          // Set default values for new restaurant
          this.aboutText = '';
          this.businessHours = '';
          this.email = '';
          this.cellphone = '';
          this.isBusinessHoursVisible = true;
          this.isContactDetailsVisible = true;
          this.mainImageUrl = '';
          this.additionalImageUrls = []; // Updated to use array
        }
        
        this.saveOriginalValues();
        this.hasUnsavedChanges = false;
      },
      error: (error) => {
        console.error('Error loading about data:', error);
        this.toastr.error('Failed to load about page data');
      }
    });
  }

  private saveOriginalValues() {
    this.originalValues = {
      aboutText: this.aboutText,
      businessHours: this.businessHours,
      email: this.email,
      cellphone: this.cellphone,
      isBusinessHoursVisible: this.isBusinessHoursVisible,
      isContactDetailsVisible: this.isContactDetailsVisible,
      mainImageUrl: this.mainImageUrl,
      additionalImageUrls: this.additionalImageUrls, // Updated to use array
    };
  }

  openMainImageUpload(): void {
    const dialogRef = this.mediaUploadModalService.openUploadModal({
      componentType: 'other',
      componentId: 'main-image',
      fieldName: 'mainImage',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 2 * 1024 * 1024, // 2MB
      allowMultiple: false,
      maxFiles: 1
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'save') {
        if (result.mediaItem) {
          // New upload or selection from media library
          this.onMainImageUploaded(result.mediaItem);
        }
      }
    });
  }

  openAdditionalImageUpload(): void {
    const dialogRef = this.mediaUploadModalService.openUploadModal({
      componentType: 'other',
      componentId: 'additional-image',
      fieldName: 'additionalImage',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 2 * 1024 * 1024, // 2MB
      allowMultiple: true, // Changed to allow multiple images
      maxFiles: 10 // Allow up to 10 additional images
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'save') {
        if (result.mediaItem) {
          // New upload or selection from media library
          this.onAdditionalImageUploaded(result.mediaItem);
        }
      }
    });
  }

  private async onMainImageUploaded(mediaItem: MediaItem): Promise<void> {
    try {
      this.isSaving = true;
      
      // Update about with media library reference
      this.mainImageUrl = mediaItem.url;
      
      // Track usage in media library - handle permission errors gracefully
      try {
        await this.mediaLibraryService.trackMediaUsage(mediaItem.id, {
          componentType: 'other',
          componentId: 'main-image',
          componentName: 'About',
          usageDate: new Date(),
          fieldName: 'mainImage'
        });
      } catch (trackingError) {
        console.warn('Could not track media usage (permission issue):', trackingError);
        // Continue with the upload even if tracking fails
      }

      this.isSaving = false;
      this.markAsChanged(); // Add this to enable save button
      this.toastr.success('Main image uploaded successfully!');
    } catch (error) {
      console.error('Error updating main image:', error);
      this.isSaving = false;
      this.toastr.error('Failed to update main image. Please try again.');
    }
  }

  private async onAdditionalImageUploaded(mediaItem: MediaItem): Promise<void> {
    try {
      this.isSaving = true;
      
      // Add new image to the array
      this.additionalImageUrls.push(mediaItem.url);
      
      // Track usage in media library - handle permission errors gracefully
      try {
        await this.mediaLibraryService.trackMediaUsage(mediaItem.id, {
          componentType: 'other',
          componentId: 'additional-image',
          componentName: 'About',
          usageDate: new Date(),
          fieldName: 'additionalImage'
        });
      } catch (trackingError) {
        console.warn('Could not track media usage (permission issue):', trackingError);
        // Continue with the upload even if tracking fails
      }

      this.isSaving = false;
      this.markAsChanged(); // Add this to enable save button
      this.toastr.success('Additional image uploaded successfully!');
    } catch (error) {
      console.error('Error updating additional image:', error);
      this.isSaving = false;
      this.toastr.error('Failed to update additional image. Please try again.');
    }
  }

  update() {
    if (!this.selectedRestaurantId) {
      this.toastr.error('Please select a restaurant first');
      return;
    }

    this.isSaving = true;
    const data = {
      restaurantId: this.selectedRestaurantId,
      aboutText: this.aboutText,
      businessHours: this.businessHours,
      email: this.email,
      cellphone: this.cellphone,
      isBusinessHoursVisible: this.isBusinessHoursVisible,
      isContactDetailsVisible: this.isContactDetailsVisible,
      mainImageUrl: this.mainImageUrl,
      additionalImageUrls: this.additionalImageUrls, // Updated to use array
      updatedAt: new Date(),
      updatedBy: this.userDataID
    };

    this.firestore
      .collection('aboutPages')
      .doc(this.selectedRestaurantId)
      .set(data, { merge: true })
      .then(() => {
        this.isSaving = false;
        this.markAsSaved();
        this.toastr.success(`About page updated successfully for ${this.selectedRestaurant?.restaurantName || 'restaurant'}`);
      })
      .catch((error) => {
        this.isSaving = false;
        console.error('Error updating about page data:', error);
        this.toastr.error('Failed to update about page');
      });
  }

  removeMainImg() {
    this.mainImageUrl = '';
    this.markAsChanged();
  }

  removeAdditionalImg(index: number) {
    // Remove image at specific index
    if (index >= 0 && index < this.additionalImageUrls.length) {
      this.additionalImageUrls.splice(index, 1);
      this.markAsChanged();
    }
  }

  removeAllAdditionalImgs() {
    this.additionalImageUrls = [];
    this.markAsChanged();
  }

  private setupChangeTracking() {
    // Store original values for comparison
    this.originalValues = {
      aboutText: this.aboutText,
      businessHours: this.businessHours,
      cellphone: this.cellphone,
      email: this.email,
      isContactDetailsVisible: this.isContactDetailsVisible,
      isBusinessHoursVisible: this.isBusinessHoursVisible,
      mainImageUrl: this.mainImageUrl,
      additionalImageUrls: this.additionalImageUrls // Updated to use array
    };
  }

  markAsChanged() {
    this.hasUnsavedChanges = true;
  }

  private markAsSaved() {
    this.hasUnsavedChanges = false;
    this.setupChangeTracking(); // Update original values
  }

  discardChanges() {
    // Reset to original values
    this.aboutText = this.originalValues.aboutText || '';
    this.businessHours = this.originalValues.businessHours || '';
    this.email = this.originalValues.email || '';
    this.cellphone = this.originalValues.cellphone || '';
    this.isBusinessHoursVisible = this.originalValues.isBusinessHoursVisible ?? true;
    this.isContactDetailsVisible = this.originalValues.isContactDetailsVisible ?? true;
    this.mainImageUrl = this.originalValues.mainImageUrl || '';
    this.additionalImageUrls = this.originalValues.additionalImageUrls || []; // Updated to use array
    
    // Reset change tracking
    this.hasUnsavedChanges = false;
    this.setupChangeTracking();
    
    this.toastr.info('Changes discarded');
  }

  async navigateWithUnsavedChangesCheck(route: string) {
    if (this.hasUnsavedChanges) {
      const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
        width: '400px',
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result === true) {
          this.router.navigate([route]);
        }
      });
    } else {
      this.router.navigate([route]);
    }
  }
}

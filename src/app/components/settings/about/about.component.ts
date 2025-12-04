import { Component, ViewChild, ElementRef } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { User } from '../../../shared/services/user';
import { Restaurant } from '../../../shared/services/restaurant';
import { MatDialog } from '@angular/material/dialog';
import { ToastService } from '../../../shared/services/toast.service';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { MediaUploadModalService } from '../../../shared/services/media-upload-modal.service';
import { MediaLibraryService } from '../../../shared/services/media-library.service';
import { MediaItem } from '../../../shared/types/media';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

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
  // Select options for app-form-select
  restaurantOptions: any[] = [];
  menuOptions: any[] = [];

  updateRestaurantOptions() {
    this.restaurantOptions = this.restaurants.map(restaurant => ({
      value: restaurant.restaurantID,
      label: `${restaurant.restaurantName} - ${restaurant.city}, ${restaurant.province}${!restaurant.status ? ' (Inactive)' : ''}`,
      disabled: !restaurant.status
    }));
  }

  updateMenuOptions() {
    this.menuOptions = this.menus.map(menu => ({
      value: menu.menuID || menu.menuId || menu.id || menu._id,
      label: menu.menuName || menu.name || 'Unnamed Menu'
    }));
  }

  // Preview URL management
  private readonly previewUrlBase = environment.menuUrl;
  previewUrl: SafeResourceUrl | null = null;
  private lastSelectedMenuId: string | null = null;
  private cachedPreviewUrl: SafeResourceUrl | null = null;
  private previewTimestamp: number = Date.now(); // For cache busting to force refresh

  constructor(
    private storage: AngularFireStorage,
    private router: Router,
    public authService: AuthService,
    private firestore: AngularFirestore,
    private dialog: MatDialog,
    private toast: ToastService,
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
                this.updateRestaurantOptions();
                this.isLoadingRestaurants = false;

                // Don't auto-select - let user choose explicitly
              },
              error: (error) => {
                console.error('Error fetching restaurants:', error);
                this.isLoadingRestaurants = false;
                this.toast.error('Failed to load restaurants');
              }
            });
          },
          error: (error) => {
            console.error('Error fetching user document:', error);
            this.isLoadingRestaurants = false;
            this.toast.error('Failed to load user information');
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

    console.log('Fetching menus for restaurantID:', this.selectedRestaurantId);

    // Fetch menus for the selected restaurant (no status filter to avoid index issues)
    // Filter client-side like other components do
    this.firestore.collection('menus', ref =>
      ref.where('restaurantID', '==', this.selectedRestaurantId)
    ).valueChanges({ idField: 'menuID' }).subscribe({
      next: (menus: any[]) => {
        console.log('Found menus for restaurant (before filtering):', menus);
        console.log('Sample menu structure:', menus.length > 0 ? menus[0] : 'No menus');

        // Filter active menus (not drafts and has Status truthy, similar to branding component)
        // Handle both boolean Status and string Status values
        const activeMenus = menus.filter(menu => {
          const isNotDraft = !menu.isDraft;
          const hasActiveStatus = menu.Status === true || menu.Status === 'active' || (menu.Status && menu.Status !== 'draft' && menu.Status !== false);
          return isNotDraft && hasActiveStatus;
        });

        console.log('Active menus after filtering:', activeMenus);

        // Sort menus by creation date manually to avoid index requirement
        this.menus = activeMenus.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return dateB.getTime() - dateA.getTime(); // Most recent first
        });

        // Ensure each menu has menuID set (use idField value or existing menuID)
        this.menus = this.menus.map(menu => ({
          ...menu,
          menuID: menu.menuID || menu.id || menu._id || menu.firestoreId
        }));

        this.updateMenuOptions();
        this.isLoadingMenus = false;

        console.log('Final menus array:', this.menus);
        console.log('Menu count:', this.menus.length);

        // Auto-select will happen in getPreviewUrl() getter when template accesses it
        // This ensures it works even if selectedMenuId was previously set to empty string
      },
      error: (error) => {
        console.error('Error fetching menus:', error);
        this.isLoadingMenus = false;

        // Provide more specific error messages
        if (error.code === 'permission-denied') {
          this.toast.error('Permission denied: Unable to access menu data');
        } else if (error.message && error.message.includes('index')) {
          this.toast.error('Database index issue: Please contact support');
        } else {
          this.toast.error('Failed to load menus. Please try again.');
        }
      }
    });
  }

  getPreviewUrl(): SafeResourceUrl {
    // Auto-select first menu if menus are available but no menu is selected
    if (!this.selectedMenuId && this.menus.length > 0) {
      const firstMenu = this.menus[0];
      this.selectedMenuId = firstMenu.menuID || firstMenu.menuId || firstMenu.id || firstMenu._id;
      console.log('Auto-selected first menu:', this.selectedMenuId);
      // Reset lastSelectedMenuId to force URL update
      this.lastSelectedMenuId = null;
    }

    // Always include timestamp for cache busting to ensure fresh content
    if (this.selectedMenuId) {
      const url = `${this.previewUrlBase}${this.selectedMenuId}/about?t=${this.previewTimestamp}`;
      this.cachedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.lastSelectedMenuId = this.selectedMenuId;
    } else {
      this.cachedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
    }

    return this.cachedPreviewUrl || this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  private refreshPreview() {
    // Force refresh by updating timestamp
    this.previewTimestamp = Date.now();
    console.log('Auto-refreshing preview...');
  }

  onMenuSelectionChange(event: any) {
    const newValue = event.value || (typeof event === 'string' ? event : null);
    if (newValue === this.selectedMenuId) {
      console.log('Same menu selected, skipping update');
      return;
    }

    console.log('Selected menu:', newValue);
    this.selectedMenuId = newValue;
    // Force refresh when menu changes
    this.refreshPreview();
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
        this.toast.error('Failed to load about page data');
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
      this.toast.success('Main image uploaded successfully!');
    } catch (error) {
      console.error('Error updating main image:', error);
      this.isSaving = false;
      this.toast.error('Failed to update main image. Please try again.');
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
      this.toast.success('Additional image uploaded successfully!');
    } catch (error) {
      console.error('Error updating additional image:', error);
      this.isSaving = false;
      this.toast.error('Failed to update additional image. Please try again.');
    }
  }

  update() {
    if (!this.selectedRestaurantId) {
      this.toast.error('Please select a restaurant first');
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
        this.toast.success(`About page updated successfully for ${this.selectedRestaurant?.restaurantName || 'restaurant'}`);
        // Auto-refresh preview after saving
        this.refreshPreview();
      })
      .catch((error) => {
        this.isSaving = false;
        console.error('Error updating about page data:', error);
        this.toast.error('Failed to update about page');
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

    this.toast.info('Changes discarded');
    // Auto-refresh preview after discarding
    this.refreshPreview();
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

import { Component } from '@angular/core';
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

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
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
  
  constructor(
    private storage: AngularFireStorage,
    private router: Router,
    public authService: AuthService,
    private firestore: AngularFirestore,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private mediaUploadModalService: MediaUploadModalService,
    private mediaLibraryService: MediaLibraryService
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
            query = this.firestore.collection('restuarants', ref => 
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
    this.selectedRestaurantId = restaurantId;
    this.selectedRestaurant = this.restaurants.find(r => r.restaurantID === restaurantId) || null;
    
    if (this.selectedRestaurant) {
      this.loadAboutData();
    }
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
      
      // Track usage in media library
      await this.mediaLibraryService.trackMediaUsage(mediaItem.id, {
        componentType: 'other',
        componentId: 'main-image',
        componentName: 'About',
        usageDate: new Date(),
        fieldName: 'mainImage'
      });

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
      
      // Track usage in media library
      await this.mediaLibraryService.trackMediaUsage(mediaItem.id, {
        componentType: 'other',
        componentId: 'additional-image',
        componentName: 'About',
        usageDate: new Date(),
        fieldName: 'additionalImage'
      });

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

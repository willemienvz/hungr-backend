import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';
import { Branding } from '../../../shared/services/branding';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';
import { MediaUploadModalService } from '../../../shared/services/media-upload-modal.service';
import { MediaLibraryService } from '../../../shared/services/media-library.service';
import { MediaItem } from '../../../shared/types/media';
import { AuthService } from '../../../shared/services/auth.service';

import { BrandingPreviewMessage } from '../../../types/branding-preview';

@Component({
  selector: 'app-branding',
  templateUrl: './branding.component.html',
  styleUrls: ['./branding.component.scss'],
})
export class BrandingComponent implements OnInit {
  @ViewChild('previewIframe') previewIframe: ElementRef;

  isSaving: boolean = false;
  imageUrl: string | null = null;
  user: any;
  OwnerID: string = '';
  brand: Branding[] = [];
  brandingData: any = null; // Current branding data with media library integration
  menus: any[] = [];
  activeMenus: any[] = [];
  selectedMenuId: string = '';
  isTooltipOpen: boolean = false;
  lastSavedDocId: string | null = null;
  tooltipOpen: { [key: string]: boolean } = {};
  
  // Preview mode management
  isPreviewMode: boolean = false;
  originalSettings: any = {};
  previewDocId: string | null = null;
  hasUnsavedChanges: boolean = false;
  private previewSaveTimer: any = null;
  
  // Debounce mechanism to prevent duplicate calls
  private lastChangeTime: number = 0;
  private lastChangeValue: any = null;
  private lastChangeType: string = '';
  
  // Color settings
  backgroundColor: string = '#FFFFFF';
  primaryColor: string = '#000000';
  secondaryColor: string = '#666666';
  accentColor: string = '#FF0000';
  mainHeadingColor: string = '#000000';
  subHeadingColor: string = '#333333';
  bodyColor: string = '#666666';

  // Typeface settings - Updated with Google fonts
  typefaces: string[] = [
    'Raleway',
    'Rubik',
    'Commissioner',
    'Merriweather',
    'Manrope',
    'Poppins'
  ];
  mainHeadingTypeface: string = 'Raleway';
  subHeadingTypeface: string = 'Raleway';
  bodyTypeface: string = 'Raleway';

  // Font size settings
  fontSizes: string[] = ['Large', 'Medium', 'Small'];
  mainHeadingSize: string = 'Large';
  subHeadingSize: string = 'Medium';
  bodySize: string = 'Small';

  // Letter case settings
  letterCases: any[] = [
    { display: 'ABC', value: 'uppercase' },
    { display: 'Abc', value: 'capitalize' },
    { display: 'abc', value: 'lowercase' },
  ];
  mainHeadingCase: string = 'uppercase';
  subHeadingCase: string = 'capitalize';
  bodyCase: string = 'lowercase';

  private readonly previewUrlBase = environment.menuUrl;
  private cachedPreviewUrl: SafeResourceUrl | null = null;
  private lastSelectedMenuId: string | null = null;

  constructor(
    private storage: AngularFireStorage,
    private firestore: AngularFirestore,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private mediaUploadModalService: MediaUploadModalService,
    private mediaLibraryService: MediaLibraryService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Subscribe to authentication state changes
    this.authService.afAuth.authState.subscribe((user) => {
      if (user) {
        this.user = user;
        this.OwnerID = user.uid;
        console.log('User authenticated with Firebase, owner ID:', this.OwnerID);
        console.log('User auth state:', user);
        
        // First fetch branding data
        this.fetchBrandingData();
        // Then fetch available menus
        this.fetchMenus();
        // Also fetch branding collection data
        this.fetchBranding();
      } else {
        console.error('No authenticated user found');
        this.toastr.error('Please log in to access branding settings');
      }
    });
  }

  // Debug method to check authentication status
  private async checkAuthStatus(): Promise<boolean> {
    try {
      const currentUser = await this.authService.afAuth.currentUser;
      console.log('Current auth user:', currentUser);
      console.log('Component OwnerID:', this.OwnerID);
      console.log('Component user:', this.user);
      return !!currentUser;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  }

  private verifyMenuCollection() {
    console.log('Verifying menu collection structure...');
    this.firestore
      .collection('menus')
      .get()
      .toPromise()
      .then(snapshot => {
        console.log('Total menus in collection:', snapshot?.size);
        snapshot?.forEach(doc => {
          const data = doc.data();
          console.log('Menu document:', {
            id: doc.id,
            parentID: data['parentID'],
            name: data['name']
          });
        });
      })
      .catch(error => {
        console.error('Error verifying menu collection:', error);
      });
  }

  fetchMenus() {
    console.log('Fetching menus for owner ID:', this.OwnerID);
    this.firestore
      .collection('menus', (ref) => 
        ref.where('OwnerID', '==', this.OwnerID)
      )
      .valueChanges({ idField: 'menuID' })
      .subscribe((menus: any[]) => {
        // Filter active menus (not drafts and has Status true)
        this.activeMenus = menus.filter(menu => !menu.isDraft && menu.Status);
        this.menus = this.activeMenus;
        
        console.log('Active menus:', this.activeMenus);
        
        // Set default selected menu if available and not already set
        if (this.menus.length > 0 && !this.selectedMenuId) {
          this.selectedMenuId = this.menus[0].menuID;
          console.log('Default menu selected:', this.selectedMenuId);
        }
      }, error => {
        console.error('Error fetching menus:', error);
      });
  }

  getPreviewUrl(): SafeResourceUrl {
    // Only update the URL if the menu selection has changed
    if (this.selectedMenuId !== this.lastSelectedMenuId) {
      console.log('Updating preview URL due to menu change:', {
        oldId: this.lastSelectedMenuId,
        newId: this.selectedMenuId
      });
      
      this.lastSelectedMenuId = this.selectedMenuId;
      
      if (this.selectedMenuId) {
        const url = `${this.previewUrlBase}${this.selectedMenuId}`;
        this.cachedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else if (this.menus.length > 0) {
        // If no menu is selected but menus are available, select the first one
        this.selectedMenuId = this.menus[0].menuID;
        const url = `${this.previewUrlBase}${this.selectedMenuId}`;
        this.cachedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else {
        this.cachedPreviewUrl = null;
      }
    }
    
    return this.cachedPreviewUrl || this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  logSelection(event: any) {
    if (event.value === this.selectedMenuId) {
      console.log('Same menu selected, skipping update');
      return;
    }
    
    console.log('Selected menu:', event.value);
    this.selectedMenuId = event.value;
    // No need to force change detection here
  }

  openImageUploadModal() {
    const dialogRef = this.mediaUploadModalService.openLogoUpload('branding');

    dialogRef.afterClosed().subscribe((result: any) => {
      console.log('Modal result:', result);
      if (result) {
        // Check if result is a MediaItem (direct result from media library)
        if (result.id && result.url) {
          // Direct MediaItem result from upload or selection
          console.log('Processing MediaItem:', result);
          this.onLogoUploaded(result);
        } else if (result.action === 'save') {
          if (result.mediaItem) {
            // Legacy format with mediaItem property
            console.log('Processing new media item:', result.mediaItem);
            this.onLogoUploaded(result.mediaItem);
          } else if (result.existingMediaUrl) {
            // Existing image kept (no new upload)
            console.log('Keeping existing image:', result.existingMediaUrl);
            this.imageUrl = result.existingMediaUrl;
            // Trigger preview mode for image changes
            this.triggerPreviewForImageChange();
          } else {
            // No images - this shouldn't happen with save action, but handle it
            console.log('Save with no images - keeping current state');
          }
        } else if (result.action === 'remove') {
          // Image was removed
          console.log('Removing image');
          this.imageUrl = null;
          // Trigger preview mode for image removal
          this.triggerPreviewForImageChange();
        }
      }
    });
  }

  private async onLogoUploaded(mediaItem: MediaItem): Promise<void> {
    try {
      this.isSaving = true;
      
      // Update branding with media library reference
      this.imageUrl = mediaItem.url;
      
      // Track usage in media library
      await this.mediaLibraryService.trackMediaUsage(mediaItem.id, {
        componentType: 'branding',
        componentId: 'logo',
        componentName: 'Branding',
        usageDate: new Date(),
        fieldName: 'logo'
      });

      // Save the logo with media library integration
      await this.saveLogoWithMediaLibrary(mediaItem);
      
      this.isSaving = false;
      this.toastr.success('Logo uploaded successfully!');
      
      // Trigger preview mode for image changes
      this.triggerPreviewForImageChange();
    } catch (error) {
      console.error('Error updating logo:', error);
      this.isSaving = false;
      this.toastr.error('Failed to update logo. Please try again.');
    }
  }



  fetchBranding() {
    this.firestore
      .collection<Branding>('branding', (ref) =>
        ref.where('parentID', '==', this.OwnerID)
      )
      .valueChanges()
      .subscribe((brand) => {
        this.brand = brand;
      });
  }

  openTooltip(tooltip: string) {
    this.tooltipOpen[tooltip] = true;
  }

  removeImg() {
    this.imageUrl = '';
  }

  // Enhanced method to remove logo with media library integration
  async removeLogoWithMediaLibrary(): Promise<void> {
    try {
      this.isSaving = true;
      
      // Check authentication status
      const isAuthenticated = await this.checkAuthStatus();
      if (!isAuthenticated || !this.OwnerID) {
        throw new Error('User not authenticated');
      }
      
      console.log('Removing logo with OwnerID:', this.OwnerID, 'lastSavedDocId:', this.lastSavedDocId);
      
      // Clear the image URL
      this.imageUrl = '';
      
      // Update branding to remove media library reference
      if (this.lastSavedDocId) {
        await this.firestore
          .collection('branding')
          .doc(this.lastSavedDocId)
          .update({
            imageUrl: '',
            logoMediaId: null,
            parentID: this.OwnerID
          });
        console.log('Logo removed from branding with media library reference');
      } else {
        // If no document exists, create one
        console.log('No existing branding document found, creating new one');
        const docRef = await this.firestore
          .collection('branding')
          .add({
            imageUrl: '',
            logoMediaId: null,
            parentID: this.OwnerID
          });
        this.lastSavedDocId = docRef.id;
        console.log('Created new branding document with ID:', docRef.id);
      }
      
      this.isSaving = false;
      this.toastr.success('Logo removed successfully!');
      
      // Trigger preview mode for image changes
      this.triggerPreviewForImageChange();
    } catch (error) {
      console.error('Error removing logo:', error);
      this.isSaving = false;
      this.toastr.error('Failed to remove logo. Please try again.');
    }
  }

  closeTooltip(tooltip: string) {
    this.tooltipOpen[tooltip] = false;
  }

  applyChanges(type: string, value: any): void {
    // Debounce duplicate events
    const currentTime = Date.now();
    if (this.lastChangeType === type && 
        this.lastChangeValue === value && 
        (currentTime - this.lastChangeTime) < 100) {
      return;
    }
    
    this.lastChangeTime = currentTime;
    this.lastChangeValue = value;
    this.lastChangeType = type;
    
    // Enable preview mode on first change
    if (!this.isPreviewMode) {
      this.enablePreviewMode();
    }
    
    switch (type) {
      case 'Background Color':
        this.backgroundColor = value;
        this.sendPreviewUpdate('backgroundColor', value);
        break;
      case 'Primary Color':
        this.primaryColor = value;
        this.sendPreviewUpdate('primaryColor', value);
        break;
      case 'Secondary Color':
        this.secondaryColor = value;
        this.sendPreviewUpdate('secondaryColor', value);
        break;
      case 'Accent Color':
        this.accentColor = value;
        this.sendPreviewUpdate('accentColor', value);
        break;
      case 'Main Heading Color':
        this.mainHeadingColor = value;
        this.sendPreviewUpdate('mainHeadingColor', value);
        break;
      case 'Sub Heading Color':
        this.subHeadingColor = value;
        this.sendPreviewUpdate('subHeadingColor', value);
        break;
      case 'Body Color':
        this.bodyColor = value;
        this.sendPreviewUpdate('bodyColor', value);
        break;
      case 'Main Heading Typeface':
        this.mainHeadingTypeface = value;
        this.sendPreviewUpdate('mainHeadingTypeface', value);
        break;
      case 'Sub Heading Typeface':
        this.subHeadingTypeface = value;
        this.sendPreviewUpdate('subHeadingTypeface', value);
        break;
      case 'Body Typeface':
        this.bodyTypeface = value;
        this.sendPreviewUpdate('bodyTypeface', value);
        break;
      case 'Main Heading Size':
        this.mainHeadingSize = value;
        this.sendPreviewUpdate('mainHeadingSize', value);
        break;
      case 'Sub Heading Size':
        this.subHeadingSize = value;
        this.sendPreviewUpdate('subHeadingSize', value);
        break;
      case 'Body Size':
        this.bodySize = value;
        this.sendPreviewUpdate('bodySize', value);
        break;
      case 'Main Heading Case':
        this.mainHeadingCase = this.getCase(value);
        this.sendPreviewUpdate('mainHeadingCase', this.mainHeadingCase);
        break;
      case 'Sub Heading Case':
        this.subHeadingCase = this.getCase(value);
        this.sendPreviewUpdate('subHeadingCase', this.subHeadingCase);
        break;
      case 'Body Case':
        this.bodyCase = this.getCase(value);
        this.sendPreviewUpdate('bodyCase', this.bodyCase);
        break;
      default:
        console.warn('Unrecognized setting type');
    }
    
    // Mark as having unsaved changes and update preview
    this.hasUnsavedChanges = true;
    this.savePreviewSettings();
  }

  getCase(value: string) {
    if (value === 'uppercase') return 'uppercase';
    if (value === 'ABC') return 'uppercase';
    if (value === 'lowercase') return 'lowercase';
    if (value === 'abc') return 'lowercase';
    if (value === 'Abc') return 'capitalize';
    if (value === 'capitalize') return 'capitalize';
    return '';
  }

  saveImageUrl(imageUrl: string): void {
    const brandingData = { imageUrl, parentID: this.OwnerID };

    if (this.lastSavedDocId) {
      this.firestore
        .collection('branding')
        .doc(this.lastSavedDocId)
        .update(brandingData)
        .then(() => console.log('Image URL updated in Firestore'))
        .catch((err) =>
          console.error('Error updating image URL in Firestore:', err)
        );
    } else {
      const brandingRef = this.firestore.collection('branding', (ref) =>
        ref.where('parentID', '==', this.OwnerID)
      );
      brandingRef
        .get()
        .toPromise()
        .then((querySnapshot) => {
          if (!querySnapshot || querySnapshot.empty) {
            this.firestore
              .collection('branding')
              .add(brandingData)
              .then((docRef) => {
                console.log(
                  'Image URL saved to Firestore with new document ID:',
                  docRef.id
                );
                this.lastSavedDocId = docRef.id; // Save this ID for future updates
              })
              .catch((err) =>
                console.error('Error saving image URL to Firestore:', err)
              );
          } else {
            this.lastSavedDocId = querySnapshot.docs[0].id;
            this.firestore
              .collection('branding')
              .doc(this.lastSavedDocId)
              .update(brandingData)
              .then(() =>
                console.log('Image URL updated in existing Firestore document')
              )
              .catch((err) =>
                console.error('Error updating image URL in Firestore:', err)
              );
          }
        })
        .catch((err) => {
          console.error('Error fetching existing branding data:', err);
        });
    }
  }

  // Enhanced method to save logo with media library integration
  async saveLogoWithMediaLibrary(mediaItem: MediaItem): Promise<void> {
    try {
      const brandingData = { 
        imageUrl: mediaItem.url, 
        logoMediaId: mediaItem.id,
        parentID: this.OwnerID 
      };

      if (this.lastSavedDocId) {
        await this.firestore
          .collection('branding')
          .doc(this.lastSavedDocId)
          .update(brandingData);
        console.log('Logo with media library reference updated in Firestore');
      } else {
        const brandingRef = this.firestore.collection('branding', (ref) =>
          ref.where('parentID', '==', this.OwnerID)
        );
        const querySnapshot = await brandingRef.get().toPromise();
        
        if (!querySnapshot || querySnapshot.empty) {
          const docRef = await this.firestore
            .collection('branding')
            .add(brandingData);
          console.log(
            'Logo with media library reference saved to Firestore with new document ID:',
            docRef.id
          );
          this.lastSavedDocId = docRef.id;
        } else {
          this.lastSavedDocId = querySnapshot.docs[0].id;
          await this.firestore
            .collection('branding')
            .doc(this.lastSavedDocId)
            .update(brandingData);
          console.log('Logo with media library reference updated in existing Firestore document');
        }
      }
    } catch (error) {
      console.error('Error saving logo with media library:', error);
      throw error;
    }
  }

  saveAll() {
    console.log('All changes saved');
  }

  fetchBrandingData(): void {
    const brandingRef = this.firestore.collection('branding', (ref) =>
      ref.where('parentID', '==', this.OwnerID)
    );
    brandingRef
      .get()
      .toPromise()
      .then(async (querySnapshot) => {
        if (!querySnapshot || querySnapshot.empty) {
          // Handle the case where there is no existing branding data
          console.log('No existing branding data found.');
          // Store current default settings as original
          this.storeOriginalSettings();
        } else {
          // Safely extract the first document, if it exists
          const brandingDoc = querySnapshot.docs[0];
          if (brandingDoc) {
            const brandingData = brandingDoc.data() as any;
            
            // Handle media library integration for logo
            if (brandingData.logoMediaId) {
              try {
                const mediaItem = await this.mediaLibraryService.getMediaById(brandingData.logoMediaId);
                brandingData.logoMediaItem = mediaItem;
                brandingData.imageUrl = mediaItem?.url; // Maintain backward compatibility
              } catch (error) {
                console.warn('Media item not found for branding logo:', error);
                // Fallback to existing imageUrl if available
                if (!brandingData.imageUrl) {
                  brandingData.imageUrl = '';
                }
              }
            }
            
            this.loadBrandingSettings(brandingData);
            this.lastSavedDocId = brandingDoc.id; // Save the document ID for future updates
            console.log('Branding data loaded:', brandingData);
            // Store these loaded settings as the original
            this.storeOriginalSettings();
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching branding data:', error);
      });
  }

  getBrandingSettings(): any {
    return {
      backgroundColor: this.backgroundColor,
      primaryColor: this.primaryColor,
      secondaryColor: this.secondaryColor,
      accentColor: this.accentColor,
      mainHeadingColor: this.mainHeadingColor,
      subHeadingColor: this.subHeadingColor,
      bodyColor: this.bodyColor,
      mainHeadingTypeface: this.mainHeadingTypeface,
      subHeadingTypeface: this.subHeadingTypeface,
      bodyTypeface: this.bodyTypeface,
      mainHeadingSize: this.mainHeadingSize,
      subHeadingSize: this.subHeadingSize,
      bodySize: this.bodySize,
      mainHeadingCase: this.mainHeadingCase,
      subHeadingCase: this.subHeadingCase,
      bodyCase: this.bodyCase,
      imageUrl: this.imageUrl,
    };
  }

  loadBrandingSettings(brandingData: any): void {
    console.log(brandingData);
    
    // Store the complete branding data for template access
    this.brandingData = brandingData;
    
    this.backgroundColor = brandingData?.backgroundColor ?? '#FFFFFF';
    this.primaryColor = brandingData?.primaryColor ?? '#000000';
    this.secondaryColor = brandingData?.secondaryColor ?? '#666666';
    this.accentColor = brandingData?.accentColor ?? '#FF0000';
    this.mainHeadingColor = brandingData?.mainHeadingColor ?? '#000000';
    this.subHeadingColor = brandingData?.subHeadingColor ?? '#333333';
    this.bodyColor = brandingData?.bodyColor ?? '#666666';
    this.mainHeadingTypeface = brandingData?.mainHeadingTypeface ?? 'Raleway';
    this.subHeadingTypeface = brandingData?.subHeadingTypeface ?? 'Raleway';
    this.bodyTypeface = brandingData?.bodyTypeface ?? 'Raleway';
    this.mainHeadingSize = brandingData?.mainHeadingSize ?? 'Large';
    this.subHeadingSize = brandingData?.subHeadingSize ?? 'Medium';
    this.bodySize = brandingData?.bodySize ?? 'Small';
    this.mainHeadingCase = brandingData?.mainHeadingCase ?? 'uppercase';
    this.subHeadingCase = brandingData?.subHeadingCase ?? 'capitalize';
    this.bodyCase = brandingData?.bodyCase ?? 'lowercase';
    this.imageUrl = brandingData?.imageUrl ?? null;
  }

  updateBrandingDetails(): void {
    // Use new preview system if in preview mode
    if (this.isPreviewMode) {
      this.savePreviewAsDefault();
    } else {
      // Legacy save method for direct saves
      this.legacySave();
    }
  }

  legacySave(): void {
    this.isSaving = true;
    const brandingDetails = this.getBrandingSettings();
    brandingDetails.parentID = this.OwnerID;
    console.log(brandingDetails);
    
    if (this.lastSavedDocId) {
      this.firestore
        .collection('branding')
        .doc(this.lastSavedDocId)
        .update(brandingDetails)
        .then(() => {
          this.isSaving = false;
          this.storeOriginalSettings(); // Update original settings
          this.toastr.success('Branding successfully updated');
        })
        .catch((err) => {
          this.toastr.error(
            'An error occurred, please try again later or contact admin'
          );
          this.isSaving = false;
        });
    } else {
      const brandingRef = this.firestore.collection('branding', (ref) =>
        ref.where('parentID', '==', this.OwnerID)
      );
      brandingRef
        .get()
        .toPromise()
        .then((querySnapshot) => {
          if (!querySnapshot || querySnapshot.empty) {
            this.firestore
              .collection('branding')
              .add(brandingDetails)
              .then((docRef) => {
                this.toastr.success('Branding successfully updated');
                this.isSaving = false;
                this.lastSavedDocId = docRef.id;
                this.storeOriginalSettings(); // Update original settings
              })
              .catch((err) => {
                this.toastr.error(
                  'An error occurred, please try again later or contact admin'
                );
                this.isSaving = false;
              });
          } else {
            this.lastSavedDocId = querySnapshot.docs[0].id;
            this.firestore
              .collection('branding')
              .doc(this.lastSavedDocId)
              .update(brandingDetails)
              .then(() => {
                this.toastr.success('Branding successfully updated');
                this.isSaving = false;
                this.storeOriginalSettings(); // Update original settings
              })
              .catch((err) => {
                this.toastr.error(
                  'An error occurred, please try again later or contact admin'
                );
                this.isSaving = false;
              });
          }
        })
        .catch((err) => {
          this.toastr.error('Error fetching existing branding data');
        });
    }
  }

  discardChanges(): void {
    if (this.isPreviewMode) {
      this.revertToOriginalSettings();
    } else if (this.lastSavedDocId) {
      this.firestore
        .collection('branding')
        .doc(this.lastSavedDocId)
        .get()
        .toPromise()
        .then((doc) => {
          if (doc.exists) {
            const brandingData = doc.data();
            this.loadBrandingSettings(brandingData);
            this.toastr.info('Changes discarded');
          }
        })
        .catch((error) => {
          this.toastr.error('Error discarding changes');
          console.error('Discard error:', error);
        });
    } else {
      this.toastr.warning('No saved branding data to discard');
    }
  }

  // Preview mode management methods
  storeOriginalSettings(): void {
    this.originalSettings = this.getBrandingSettings();
    console.log('Original settings stored:', this.originalSettings);
  }

  enablePreviewMode(): void {
    if (!this.isPreviewMode) {
      this.isPreviewMode = true;
      this.cdr.detectChanges(); // Force change detection
      console.log('Preview mode enabled');
    }
  }

  savePreviewSettings(): void {
    if (!this.isPreviewMode) return;
    // Debounce rapid writes during slider/color changes
    if (this.previewSaveTimer) {
      clearTimeout(this.previewSaveTimer);
    }
    this.previewSaveTimer = setTimeout(() => {
      this.savePreviewSettingsImmediate();
    }, 400);
  }

  private savePreviewSettingsImmediate(): void {
    if (!this.isPreviewMode) return;

    const previewData = {
      ...this.getBrandingSettings(),
      parentID: this.OwnerID,
      isPreview: true,
      originalDocId: this.lastSavedDocId,
      previewTimestamp: Date.now()
    };

    if (this.previewDocId) {
      // Update existing preview document
      this.firestore
        .collection('branding-preview')
        .doc(this.previewDocId)
        .set(previewData, { merge: true })
        .then(() => {
          console.log('Preview settings upserted');
        })
        .catch((error) => {
          console.warn('Non-fatal preview save error:', error);
        });
    } else {
      // Create new preview document
      this.firestore
        .collection('branding-preview')
        .add(previewData)
        .then((docRef) => {
          this.previewDocId = docRef.id;
          console.log('Preview settings saved with ID:', docRef.id);
        })
        .catch((error) => {
          console.warn('Non-fatal preview save error:', error);
        });
    }
  }

  savePreviewAsDefault(): void {
    if (!this.isPreviewMode || !this.hasUnsavedChanges) {
      this.toastr.warning('No changes to save');
      return;
    }

    this.isSaving = true;
    const brandingDetails = this.getBrandingSettings();
    brandingDetails.parentID = this.OwnerID;

    if (this.lastSavedDocId) {
      // Update existing document
      this.firestore
        .collection('branding')
        .doc(this.lastSavedDocId)
        .update(brandingDetails)
        .then(() => {
          this.isSaving = false;
          this.hasUnsavedChanges = false;
          this.clearPreviewMode();
          this.storeOriginalSettings(); // Store new settings as original
          this.toastr.success('Branding successfully updated');
        })
        .catch((err) => {
          this.toastr.error('An error occurred, please try again later or contact admin');
          this.isSaving = false;
        });
    } else {
      // Create new document
      this.firestore
        .collection('branding')
        .add(brandingDetails)
        .then((docRef) => {
          this.lastSavedDocId = docRef.id;
          this.isSaving = false;
          this.hasUnsavedChanges = false;
          this.clearPreviewMode();
          this.storeOriginalSettings(); // Store new settings as original
          this.toastr.success('Branding successfully saved');
        })
        .catch((err) => {
          this.toastr.error('An error occurred, please try again later or contact admin');
          this.isSaving = false;
        });
    }
  }

  revertToOriginalSettings(): void {
    if (this.originalSettings) {
      this.loadBrandingSettings(this.originalSettings);
      this.clearPreviewMode();
      this.toastr.info('Changes reverted to original settings');
    } else {
      this.toastr.warning('No original settings to revert to');
    }
  }

  clearPreviewMode(): void {
    console.log('Clearing preview mode...');
    this.isPreviewMode = false;
    this.hasUnsavedChanges = false;
    
    // Always clean up all preview documents for this restaurant (more reliable)
    this.cleanupAllPreviewDocuments();
    
    // Reset preview doc ID
    this.previewDocId = null;
  }

  cleanupAllPreviewDocuments(): void {
    console.log('🧹 Starting cleanup of all preview documents for parentID:', this.OwnerID);
    
    this.firestore
      .collection('branding-preview', ref => 
        ref.where('parentID', '==', this.OwnerID)
      )
      .get()
      .toPromise()
      .then((querySnapshot) => {
        if (querySnapshot && !querySnapshot.empty) {
          console.log('🗑️ Found', querySnapshot.size, 'preview documents to clean up');
          const batch = this.firestore.firestore.batch();
          querySnapshot.docs.forEach(doc => {
            console.log('🗑️ Deleting preview document:', doc.id);
            batch.delete(doc.ref);
          });
          return batch.commit();
        } else {
          console.log('✅ No preview documents found to clean up');
        }
        return Promise.resolve();
      })
      .then(() => {
        console.log('✅ All preview documents cleaned up successfully');
      })
      .catch((error) => {
        console.error('❌ Error cleaning up preview documents:', error);
      });
  }

  triggerPreviewForImageChange(): void {
    // Enable preview mode on image change
    if (!this.isPreviewMode) {
      this.enablePreviewMode();
    }
    
    // Mark as having unsaved changes and update preview
    this.hasUnsavedChanges = true;
    this.savePreviewSettings();
  }

  private sendPreviewUpdate(property: string, value: string) {
    if (!this.previewIframe?.nativeElement?.contentWindow) {
      console.warn('Preview iframe not ready');
      return;
    }

    const message: BrandingPreviewMessage = {
      type: 'BRANDING_UPDATE',
      payload: { property, value }
    };

    // Get the target origin from the iframe's src
    const iframeUrl = new URL(this.previewIframe.nativeElement.src);
    const targetOrigin = `${iframeUrl.protocol}//${iframeUrl.host}`;

    this.previewIframe.nativeElement.contentWindow.postMessage(message, targetOrigin);
    this.hasUnsavedChanges = true;
  }
}

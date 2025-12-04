import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { catchError, finalize, startWith, map, takeUntil } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { Menu } from '../../../shared/services/menu';
import { dateRangeValidator } from '../../../shared/validators/date-range-validator';
import { timeRangeValidator } from '../../../shared/validators/time-range-validator';
import { ToastService } from '../../../shared/services/toast.service';
import { of, Observable, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MediaUploadModalService } from '../../../shared/services/media-upload-modal.service';
import { MediaLibraryService } from '../../../shared/services/media-library.service';
import { SpecialsService } from '../../../shared/services/specials.service';
import { MediaItem } from '../../../shared/types/media';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { SPECIAL_TYPE_OPTIONS, SpecialTypeOption, SpecialType } from '../shared/special-types.constants';
import { AddedItem } from '../../../types/special';

@Component({
  selector: 'app-add-special',
  templateUrl: './add-special.component.html',
  styleUrls: ['./add-special.component.scss'],
})
export class AddSpecialComponent implements OnInit, OnDestroy {
  isSaving: boolean = false;
  currentStep = 1;
  selectedSpecialType: SpecialType = SpecialType.PERCENTAGE_DISCOUNT;
  
  // Subscription management
  private destroy$ = new Subject<void>();
  uploadDone: boolean = false;
  specialForm: FormGroup;
  specialTypes: SpecialTypeOption[] = SPECIAL_TYPE_OPTIONS;
  weekdays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  selectedDays: string[] = ['Mon'];
  menus: Menu[] = [];
  selectedMenu: Menu | null = null;
  addedItems: AddedItem[] = [];
  imageUploadProgress: number = 0;
  uploadedImageUrl: string | null = null;
  owner: string = '';
  hasUnsavedChanges: boolean = false;

  showSuccessPopup: boolean = false;
  successPopupMessage: string = '';

  // Add new properties for autocomplete
  menuItemAutocompleteControl = new FormControl('');
  filteredMenuItems: Observable<any[]> = new Observable();
  selectedMenuItem: any = null;

  // Media library integration properties
  selectedMediaItem: MediaItem | null = null;
  mediaId: string | null = null;

  // Computed properties for navigation
  get showNextButton(): boolean {
    console.log('showNextButton called, currentStep:', this.currentStep, 'result:', this.currentStep < 5);
    return this.currentStep < 5;
  }

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private fb: FormBuilder,
    private toast: ToastService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private mediaUploadModalService: MediaUploadModalService,
    private mediaLibraryService: MediaLibraryService,
    private specialsService: SpecialsService
  ) {
    this.specialForm = this.fb.group(
      {
        menu: [null, Validators.required],
        specialTitle: ['', Validators.required],
        dateFrom: ['', Validators.required],
        dateTo: ['', Validators.required],
        typeSpecial: ['', Validators.required],
        typeSpecialDetails: [''],
        comboPrice: [''],
        percentage: [''],
        amount: ['', Validators.required],
        featureSpecialUnder: [''],
        timeFrom: ['00:00', Validators.required],
        timeTo: ['00:00', Validators.required],
        isAllDay: [true],
        customPromotionalText: ['', [Validators.maxLength(500)]],
        selectedCategories: [[]],
        selectedCategory: [''], // Single category selection for Category Special
        discountType: ['percentage'],
      },
      {
        validators: [dateRangeValidator(), timeRangeValidator()],
      }
    );
  }

  ngOnInit() {
    // Read step from route parameter
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const step = params['step'];
        if (step) {
          const stepNumber = parseInt(step, 10);
          if (stepNumber >= 1 && stepNumber <= 5) {
            this.currentStep = stepNumber;
          } else {
            // Invalid step, redirect to step 1
            this.router.navigate(['/specials/add-new-special/1'], { replaceUrl: true });
          }
        } else {
          // No step specified, default to step 1
          this.currentStep = 1;
          this.router.navigate(['/specials/add-new-special/1'], { replaceUrl: true });
        }
      });

    this.fetchMenus();
    this.trackFormChanges();
    // Auto-select first special type
    if (this.specialTypes.length > 0) {
      this.specialForm.patchValue({
        typeSpecial: this.specialTypes[0].id
      });
      this.selectedSpecialType = this.specialTypes[0].id;
      this.onSpecialTypeChange();
    }
    console.log('Component initialized, hasUnsavedChanges:', this.hasUnsavedChanges);
    this.setupMenuItemAutocomplete();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private trackFormChanges() {
    this.specialForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.hasUnsavedChanges = true;
      });
  }

  private markAsChanged() {
    this.hasUnsavedChanges = true;
  }

  private markAsSaved() {
    this.hasUnsavedChanges = false;
  }

  async navigateWithUnsavedChangesCheck(route: string) {
    if (this.hasUnsavedChanges) {
      const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
        width: '400px',
        disableClose: true
      });

      dialogRef.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe((result) => {
          if (result === true) {
            this.router.navigate([route]);
          }
        });
    } else {
      this.router.navigate([route]);
    }
  }
  addItem(): void {
    const selectedType = this.selectedSpecialType;

    if (selectedType === SpecialType.PERCENTAGE_DISCOUNT) {
      // Percentage Discount
      const percentage = this.specialForm.get('percentage')?.value;
      if (this.selectedMenuItem && percentage) {
        this.addedItems.push({
          name: this.selectedMenuItem.name,
          itemId: this.selectedMenuItem.itemId, // Add itemId for frontend matching
          amount: `${percentage}%`
        });
        this.specialForm.get('percentage')?.reset();
        this.menuItemAutocompleteControl.setValue('');
        this.selectedMenuItem = null;
      }
    } else if (selectedType === SpecialType.PRICE_DISCOUNT) {
      // Price Discount
      const amount = this.specialForm.get('amount')?.value;
      if (this.selectedMenuItem && amount) {
        this.addedItems.push({
          name: this.selectedMenuItem.name,
          itemId: this.selectedMenuItem.itemId, // Add itemId for frontend matching
          amount: amount
        });
        this.specialForm.get('amount')?.reset();
        this.menuItemAutocompleteControl.setValue('');
        this.selectedMenuItem = null;
      }
    } else if (selectedType === SpecialType.CATEGORY_SPECIAL) {
      // Category Special - Single category selection
      const selectedCategory = this.specialForm.get('selectedCategory')?.value;
      const discountType = this.specialForm.get('discountType')?.value || 'percentage';
      const amount = this.specialForm.get('amount')?.value;

      if (selectedCategory && amount) {
        const category = this.selectedMenu?.categories?.find((cat: any) => (cat.id || cat.name) === selectedCategory);
        const categoryName = category?.name || selectedCategory;

        const displayAmount = discountType === 'percentage' ? `${amount}%` : `R${amount}`;
        const itemName = `Category: ${categoryName}`;

        this.addedItems.push({
          name: itemName,
          categoryId: selectedCategory,
          amount: displayAmount,
          discountType: discountType,
          selectedCategories: [selectedCategory] // Store for backend compatibility
        });

        // Reset form fields
        this.specialForm.patchValue({
          selectedCategory: '',
          amount: '',
          discountType: 'percentage'
        });
      }
    } else if (selectedType === SpecialType.COMBO_DEAL) {
      // Combo Special
      const comboItemNames = this.specialForm.get('typeSpecialDetails')?.value;
      const percentage = this.specialForm.get('percentage')?.value;

      if (Array.isArray(comboItemNames) && comboItemNames.length > 0 && percentage) {
        // Get the actual menu items to extract their IDs
        const comboItems = comboItemNames.map(itemName => {
          const menuItem = this.selectedMenu?.items.find(item => item.name === itemName);
          return menuItem;
        }).filter(item => item !== undefined);

        // Extract item IDs - menu items should always have itemId
        const comboItemIds = comboItems.map(item => {
          if (!item.itemId) {
            console.error('Menu item missing itemId:', item);
            throw new Error(`Menu item "${item.name}" is missing itemId`);
          }
          return item.itemId;
        });
        const displayNames = comboItemNames.join(', ');

        this.addedItems.push({
          name: `Combo: ${displayNames}`,
          comboItemIds: comboItemIds, // Store item IDs or names as fallback
          comboItemNames: comboItemNames, // Store names for display/backward compatibility
          amount: `${percentage}%`,
        });
        this.specialForm.get('typeSpecialDetails')?.reset();
        this.specialForm.get('percentage')?.reset();
      }
    }
    this.markAsChanged();
  }
  getSpecialTypeLabel(type: SpecialType): string {
    const typeOption = this.specialTypes.find(t => t.id === type);
    return typeOption ? typeOption.name : 'Special Type';
  }
  removeItem(index: number): void {
    this.addedItems.splice(index, 1); // Remove the item at the specified index
    this.markAsChanged();
  }
  // Price formatting is now handled by PriceInputComponent
  // Removed addPrefixIfNeeded() and preventDeletion() methods

  private fetchMenus() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    this.owner = user.uid;
    this.firestore
      .collection<Menu>('menus', (ref) => ref.where('OwnerID', '==', OwnerID))
      .valueChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe((menus) => {
        this.menus = menus;
        // Auto-select first menu if available
        if (menus.length > 0) {
          this.specialForm.patchValue({
            menu: menus[0].menuID
          });
          this.onMenuChange();
        }
      });
  }

  onMenuChange() {
    const menuControl = this.specialForm.get('menu');
    if (menuControl?.value) {
      this.specialForm.enable();
      this.selectedMenu = this.menus.find((menu) => menu.menuID === menuControl.value) || null;

      // Reset the autocomplete and selected item when menu changes
      this.menuItemAutocompleteControl.setValue('');
      this.selectedMenuItem = null;
      this.setupMenuItemAutocomplete();
    } else {
      this.specialForm.disable();
      menuControl?.enable();
      this.specialForm.reset({ menu: null });
    }
  }

  toggleSelection(day: string) {
    const index = this.selectedDays.indexOf(day);
    if (index >= 0) {
      this.selectedDays.splice(index, 1);
    } else {
      this.selectedDays.push(day);
    }
    this.markAsChanged();
  }

  isSelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  openImageUploadModal() {
    const dialogRef = this.mediaUploadModalService.openSpecialImageUpload('new-special');

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          if (result) {
            // Handle different result formats from the modal
            let mediaItem: MediaItem | null = null;
            
            if (result.id && result.url) {
              // Direct MediaItem result
              mediaItem = result;
            } else if (result.mediaItem) {
              // Enhanced format with mediaItem property
              mediaItem = result.mediaItem;
            } else if (result.action === 'save' && result.existingMediaUrl) {
              // Existing image kept (no new upload)
              this.uploadedImageUrl = result.existingMediaUrl;
              this.uploadDone = true;
              this.markAsChanged();
              this.toast.success('Image updated successfully!');
              return;
            } else if (result.action === 'remove') {
              // Image was removed
              this.selectedMediaItem = null;
              this.mediaId = null;
              this.uploadedImageUrl = null;
              this.uploadDone = false;
              this.markAsChanged();
              this.toast.success('Image removed successfully!');
              return;
            }

            if (mediaItem) {
              this.selectedMediaItem = mediaItem;
              this.mediaId = mediaItem.id;
              this.uploadedImageUrl = mediaItem.url;
              this.uploadDone = true;
              this.markAsChanged();
              this.toast.success('Image uploaded successfully!');
            }
          }
        },
        error: (error) => {
          console.error('Error in image upload modal:', error);
          this.toast.error('Failed to open image upload modal. Please try again.');
        }
      });
  }

  // Add method to handle media deletion
  onDeleteMedia() {
    if (this.mediaId) {
      // Delete from media library service
      this.mediaLibraryService.deleteMedia(this.mediaId)
        .then(() => {
          // Reset state
          this.selectedMediaItem = null;
          this.mediaId = null;
          this.uploadedImageUrl = null;
          this.uploadDone = false;
          this.markAsChanged();
          this.toast.success('Image deleted successfully!');
        })
        .catch((error) => {
          console.error('Error deleting media:', error);
          this.toast.error('Failed to delete image. Please try again.');
        });
    } else {
      // Just reset state if no media ID (local upload)
      this.selectedMediaItem = null;
      this.mediaId = null;
      this.uploadedImageUrl = null;
      this.uploadDone = false;
      this.markAsChanged();
      this.toast.success('Image removed successfully!');
    }
  }

  // Removed uploadImageToFirebase method - now handled by MediaLibraryService

  onSubmit() {
    this.isSaving = true;
    const formValue = this.specialForm.getRawValue();

    // Collect selected categories from added items for category specials
    let selectedCategories: string[] = [];
    if (this.selectedSpecialType === SpecialType.CATEGORY_SPECIAL) {
      selectedCategories = this.addedItems
        .filter(item => item.selectedCategories)
        .flatMap(item => item.selectedCategories || []);
      // Remove duplicates
      selectedCategories = [...new Set(selectedCategories)];
    }

    // Prepare data object, filtering out undefined values to prevent Firebase errors
    const data: any = {
      ...formValue,
      addedItems: this.addedItems,
      selectedDays: this.selectedDays,
      OwnerID: this.owner,
      active: true,
      isDraft: false
    };

    // Only include imageUrl if it has a valid value
    if (this.uploadedImageUrl) {
      data.imageUrl = this.uploadedImageUrl;
    }

    // Only include selectedCategories if there are any
    if (selectedCategories.length > 0) {
      data.selectedCategories = selectedCategories;
    }

    // Only include discountType for category specials
    if (this.selectedSpecialType === SpecialType.CATEGORY_SPECIAL) {
      const discountType = this.specialForm.get('discountType')?.value;
      if (discountType) {
        data.discountType = discountType;
      }
    }

    // Use the new SpecialsService with media library integration
    this.specialsService.createSpecial(data, this.mediaId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (specialId) => {
          // Track media usage if media was uploaded
          if (this.mediaId) {
            this.specialsService.trackMediaUsage(this.mediaId, specialId, 'image')
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  console.log('Media usage tracked successfully');
                },
                error: (error) => {
                  console.warn('Failed to track media usage:', error);
                }
              });
          }

          this.isSaving = false;
          this.markAsSaved();
          this.showSuccess('Special saved successfully!');
        },
        error: (error) => {
          console.error('Error saving special:', error);
          this.isSaving = false;
          this.toast.error('Failed to save special');
        }
      });
  }

  // Removed cancelUpload() method - handled by ImageUploadModalComponent

  onDraftSave() {
    this.isSaving = true;

    const formValue = this.specialForm.getRawValue();

    // Collect selected categories from added items for category specials
    let selectedCategories: string[] = [];
    if (this.selectedSpecialType === SpecialType.CATEGORY_SPECIAL) {
      selectedCategories = this.addedItems
        .filter(item => item.selectedCategories)
        .flatMap(item => item.selectedCategories || []);
      // Remove duplicates
      selectedCategories = [...new Set(selectedCategories)];
    }

    const data = {
      ...formValue,
      addedItems: this.addedItems,
      selectedDays: this.selectedDays,
      imageUrl: this.uploadedImageUrl,
      specialID: '1',
      OwnerID: this.owner,
      active: false,
      isDraft: true,
      selectedCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
      discountType: this.selectedSpecialType === SpecialType.CATEGORY_SPECIAL ?
        this.specialForm.get('discountType')?.value : undefined
    };

    this.firestore
      .collection('specials')
      .add(data)
      .then((results) => {
        const newData = {
          ...data,
          specialID: results.id,
        };
        return this.firestore
          .collection('specials')
          .doc(results.id)
          .update(newData);
      })
      .then(() => {
        this.isSaving = false;
        this.markAsSaved();
        this.toast.success('Draft saved successfully.');
      })
      .catch((error) => {
        console.error('Error saving draft to Firestore:', error);
        this.isSaving = false;
        this.toast.error('Failed to save draft.');
      });
  }

  private showSuccess(message: string) {
    this.successPopupMessage = message;
    this.showSuccessPopup = true;
  }
  nextStep() {
    if (this.currentStep < 5) {
      this.currentStep++;
      this.router.navigate([`/specials/add-new-special/${this.currentStep}`], { replaceUrl: true });
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.router.navigate([`/specials/add-new-special/${this.currentStep}`], { replaceUrl: true });
    }
  }

  navigateToStep(step: number): void {
    if (step >= 1 && step <= 5) {
      this.currentStep = step;
      this.router.navigate([`/specials/add-new-special/${step}`], { replaceUrl: true });
    }
  }

  onBackButtonClick() {
    if (this.currentStep > 1) {
      this.previousStep();
    } else {
      this.navigateWithUnsavedChangesCheck('/specials');
    }
  }

  // Method to check if Step 1 form is invalid
  isStep1Invalid(): boolean {
    const dateFrom = this.specialForm.get('dateFrom')?.value;
    const dateTo = this.specialForm.get('dateTo')?.value;

    return (
      this.specialForm.get('specialTitle')?.invalid ||
      this.specialForm.get('menu')?.invalid ||
      this.specialForm.get('typeSpecial')?.invalid ||
      !dateFrom ||
      !dateTo ||
      dateFrom.toString().trim() === '' ||
      dateTo.toString().trim() === '' ||
      this.specialForm.errors?.['dateRangeInvalid']
    );
  }

  isStep2Invalid(): boolean {
    const selectedDaysValid = this.selectedDays.length > 0;
    const isAllDay = this.specialForm.get('isAllDay')?.value;
    
    if (isAllDay) {
      return !selectedDaysValid;
    }
    
    const timeFrom = this.specialForm.get('timeFrom')?.value;
    const timeTo = this.specialForm.get('timeTo')?.value;
    const timesValid = timeFrom && timeTo && 
                      timeFrom.toString().trim() !== '' && 
                      timeTo.toString().trim() !== '';
    
    return !selectedDaysValid || !timesValid || this.specialForm.errors?.['timeRangeInvalid'];
  }

  isStep3Invalid(): boolean {
    // Step 3 is invalid if no items have been added
    return this.addedItems.length === 0;
  }

  onSpecialTypeChange() {
    const typeControl = this.specialForm.get('typeSpecial');
    if (typeControl?.value) {
      this.selectedSpecialType = typeControl.value;

      // Reset/clear all type-specific form controls when special type changes
      this.specialForm.patchValue({
        typeSpecialDetails: '',
        comboPrice: '',
        percentage: '',
        amount: '',
        featureSpecialUnder: '',
        selectedCategory: '',
        selectedCategories: [],
        discountType: 'percentage'
      });

      // Clear autocomplete control
      this.menuItemAutocompleteControl.setValue('');
      this.selectedMenuItem = null;

      // Clear added items from previous type
      this.addedItems = [];

      // Auto-select first item/category when special type changes
      if (this.selectedMenu) {
        if (this.selectedSpecialType === SpecialType.PERCENTAGE_DISCOUNT && this.selectedMenu.items?.length > 0) {
          this.specialForm.patchValue({
            typeSpecialDetails: this.selectedMenu.items[0].name
          });
        } else if (this.selectedSpecialType === SpecialType.CATEGORY_SPECIAL && this.selectedMenu.categories?.length > 0) {
          this.specialForm.patchValue({
            selectedCategory: this.selectedMenu.categories[0].id || this.selectedMenu.categories[0].name
          });
        }
      }
    }
  }

  private setupMenuItemAutocomplete() {
    this.filteredMenuItems = this.menuItemAutocompleteControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterMenuItems(value || ''))
    );
  }

  private filterMenuItems(value: string): any[] {
    if (!this.selectedMenu?.items) return [];

    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    return this.selectedMenu.items.filter(item =>
      item.name.toLowerCase().includes(filterValue)
    );
  }

  displayFn = (menuItem: any): string => {
    return menuItem?.name || '';
  }

  onMenuItemSelected(event: MatAutocompleteSelectedEvent) {
    const selectedItem = event.option.value;
    if (selectedItem) {
      this.selectedMenuItem = selectedItem;
      this.specialForm.patchValue({
        typeSpecialDetails: selectedItem.name
      });
      // Keep the selected item's name in the input
      this.menuItemAutocompleteControl.setValue(selectedItem);
    }
  }
}

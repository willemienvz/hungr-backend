import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { catchError, finalize, startWith, map } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { Menu } from '../../../shared/services/menu';
import { dateRangeValidator } from '../../../shared/validators/date-range-validator';
import { timeRangeValidator } from '../../../shared/validators/time-range-validator';
import { ToastrService } from 'ngx-toastr';
import { of, Observable, Subscription } from 'rxjs';
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
  selector: 'app-edit-special',
  templateUrl: './edit-special.component.html',
  styleUrls: ['./edit-special.component.scss'],
})
export class EditSpecialComponent implements OnInit, OnDestroy {
  isSaving: boolean = false;
  currentStep = 1;
  selectedSpecialType: SpecialType = SpecialType.PERCENTAGE_DISCOUNT;
  specialForm: FormGroup;
  specialTypes: SpecialTypeOption[] = SPECIAL_TYPE_OPTIONS;
  weekdays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  selectedDays: string[] = [];
  menus: Menu[] = [];
  selectedMenu: Menu | null = null;
  addedItems: AddedItem[] = [];
  uploadedImageUrl: string | null = null;
  owner: string = '';
  specialId: string = '';
  hasUnsavedChanges: boolean = false;
  showSuccessPopup: boolean = false;
  successPopupMessage: string = '';
  specialData: any = null;

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
    private route: ActivatedRoute,
    private router: Router,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private dialog: MatDialog,
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
        typeSpecialDetails: [[]],
        comboPrice: [''],
        percentage: [''],
        amount: ['', Validators.required],
        featureSpecialUnder: [''],
        timeFrom: ['00:00', Validators.required],
        timeTo: ['00:00', Validators.required],
      },
      {
        validators: [dateRangeValidator(), timeRangeValidator()],
      }
    );
  }

  ngOnInit() {
    this.specialId = this.route.snapshot.paramMap.get('id') || '';
    const stepParam = this.route.snapshot.paramMap.get('step');
    if (stepParam) {
      this.currentStep = parseInt(stepParam, 10);
    }
    this.fetchSpecialData();
    this.fetchMenus();
    this.trackFormChanges();
    this.setupMenuItemAutocomplete();
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions if any
  }

  private trackFormChanges() {
    this.specialForm.valueChanges.subscribe(() => {
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

      dialogRef.afterClosed().subscribe((result) => {
        if (result === true) {
          this.router.navigate([route]);
        }
      });
    } else {
      this.router.navigate([route]);
    }
  }
  onDraftSave() {
    this.isSaving = true;

    const formValue = this.specialForm.getRawValue();
    const data = {
      ...formValue,
      addedItems: this.addedItems,
      selectedDays: this.selectedDays,
      imageUrl: this.uploadedImageUrl,
      OwnerID: this.owner,
      active: false,
      isDraft: true,
    };

    this.firestore
      .collection('specials')
      .doc(this.specialId)
      .update(data)
      .then(() => {
        this.isSaving = false;
        this.markAsSaved();
        this.toastr.success('Draft saved successfully.');
      })
      .catch((error) => {
        console.error('Error saving draft to Firestore:', error);
        this.isSaving = false;
        this.toastr.error('Failed to save draft.');
      });
  }

  fetchSpecialData() {
    this.specialsService.getSpecialById(this.specialId).subscribe((special) => {
      if (special) {
        this.specialData = special;
        this.specialForm.patchValue(special);
        this.addedItems = special.addedItems || [];
        this.selectedDays = special.selectedDays || [];
        this.uploadedImageUrl = special.imageUrl || null;
        this.selectedMediaItem = special.mediaItem || null;
        this.mediaId = special.mediaId || null;
        this.selectedSpecialType = special.typeSpecial || SpecialType.PERCENTAGE_DISCOUNT;

        // Try setting selectedMenu after menus are loaded
        if (this.menus.length > 0) {
          this.setSelectedMenu((special as any).menu);
        }
      }
    });
  }

  fetchMenus() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    this.owner = user.uid;

    this.firestore
      .collection<Menu>('menus', (ref) => ref.where('OwnerID', '==', OwnerID))
      .valueChanges()
      .subscribe((menus) => {
        this.menus = menus;

        if (this.specialData?.menu) {
          this.setSelectedMenu(this.specialData.menu);
        }
      });
  }
  setSelectedMenu(menuId: string) {
    this.selectedMenu =
      this.menus.find((menu) => menu.menuID === menuId) || null;
  }
  updateSpecial() {
    this.isSaving = true;
    const formValue = this.specialForm.getRawValue();
    
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

    // Use the new SpecialsService with media library integration
    this.specialsService.updateSpecial(this.specialId, data).subscribe({
      next: () => {
        // Update media usage if media was changed
        if (this.mediaId && this.mediaId !== this.specialData?.mediaId) {
          this.specialsService.trackMediaUsage(this.mediaId, this.specialId, 'image').subscribe({
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
        this.showSuccess('Special updated successfully!');
        this.router.navigate(['/specials']);
      },
      error: (error) => {
        console.error('Error updating special:', error);
        this.isSaving = false;
        this.toastr.error('Failed to update special');
      }
    });
  }

  onMenuChange() {
    const menuControl = this.specialForm.get('menu');
    if (menuControl?.value) {
      this.specialForm.enable();
      this.selectedMenu =
        this.menus.find((menu) => menu.menuID === menuControl.value) || null;
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
  addItem(): void {
    const selectedType = this.selectedSpecialType;

    if (selectedType === SpecialType.PERCENTAGE_DISCOUNT) {
      // Percentage Discount
      const selectedItemName =
        this.specialForm.get('typeSpecialDetails')?.value;
      const percentage = this.specialForm.get('percentage')?.value;

      if (selectedItemName && percentage) {
        this.addedItems.push({
          name: selectedItemName,
          itemId: this.selectedMenuItem?.itemId, // Add itemId if available
          amount: `${percentage}%`
        });
        this.specialForm.get('typeSpecialDetails')?.reset();
        this.specialForm.get('percentage')?.reset();
      }
    } else if (selectedType === SpecialType.PRICE_DISCOUNT) {
      // Price Discount
      const selectedItemName =
        this.specialForm.get('typeSpecialDetails')?.value;
      const amount = this.specialForm.get('amount')?.value;

      if (selectedItemName && amount) {
        this.addedItems.push({
          name: selectedItemName,
          itemId: this.selectedMenuItem?.itemId, // Add itemId if available
          amount: amount
        });
        this.specialForm.get('typeSpecialDetails')?.reset();
        this.specialForm.get('amount')?.reset();
      }
    } else if (selectedType === SpecialType.CATEGORY_SPECIAL) {
      // Category Special
      const categoryName = this.specialForm.get('featureSpecialUnder')?.value;
      const amount = this.specialForm.get('amount')?.value;

      if (categoryName && amount) {
        this.addedItems.push({
          name: `Category: ${categoryName}`,
          categoryId: categoryName, // Add categoryId for category specials
          amount: amount,
        });
        this.specialForm.get('featureSpecialUnder')?.reset();
        this.specialForm.get('amount')?.reset();
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

  isSelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  removeItem(index: number): void {
    this.addedItems.splice(index, 1);
    this.markAsChanged();
  }

  openImageUploadModal() {
    const dialogRef = this.mediaUploadModalService.openSpecialImageUpload(this.specialId);

    dialogRef.afterClosed().subscribe({
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
            this.markAsChanged();
            this.toastr.success('Image updated successfully!');
            return;
          } else if (result.action === 'remove') {
            // Image was removed
            this.selectedMediaItem = null;
            this.mediaId = null;
            this.uploadedImageUrl = null;
            this.markAsChanged();
            this.toastr.success('Image removed successfully!');
            return;
          }

          if (mediaItem) {
            this.selectedMediaItem = mediaItem;
            this.mediaId = mediaItem.id;
            this.uploadedImageUrl = mediaItem.url;
            this.markAsChanged();
            this.toastr.success('Image uploaded successfully!');
          }
        }
      },
      error: (error) => {
        console.error('Error in image upload modal:', error);
        this.toastr.error('Failed to open image upload modal. Please try again.');
      }
    });
  }

  // Removed uploadFileToFirebase method - now handled by MediaLibraryService

  showSuccess(message: string) {
    this.successPopupMessage = message;
    this.showSuccessPopup = true;
  }

  nextStep() {
    if (this.currentStep < 5) {
      this.currentStep++;
      this.router.navigate([`/specials/edit-special/${this.specialId}/${this.currentStep}`], { replaceUrl: true });
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

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.router.navigate([`/specials/edit-special/${this.specialId}/${this.currentStep}`], { replaceUrl: true });
    }
  }

  navigateToStep(step: number): void {
    if (step >= 1 && step <= 5) {
      this.currentStep = step;
      this.router.navigate([`/specials/edit-special/${this.specialId}/${step}`], { replaceUrl: true });
    }
  }

  onSpecialTypeChange() {
    this.selectedSpecialType = this.specialForm.get('typeSpecial')?.value;

    // Reset/clear all type-specific form controls when special type changes
    this.specialForm.patchValue({
      typeSpecialDetails: [],
      comboPrice: '',
      percentage: '',
      amount: '',
      featureSpecialUnder: ''
    });

    // Clear autocomplete control
    this.menuItemAutocompleteControl.setValue('');
    this.selectedMenuItem = null;

    // Clear added items from previous type
    this.addedItems = [];
  }

  onBackButtonClick() {
    this.navigateWithUnsavedChangesCheck('/specials');
  }

  isStep2Invalid(): boolean {
    const timeFrom = this.specialForm.get('timeFrom')?.value;
    const timeTo = this.specialForm.get('timeTo')?.value;
    return (
      this.selectedDays.length === 0 ||
      !timeFrom ||
      !timeTo ||
      timeFrom.toString().trim() === '' ||
      timeTo.toString().trim() === '' ||
      this.specialForm.errors?.['timeRangeInvalid']
    );
  }

  getSpecialTypeLabel(typeId: number): string {
    const type = this.specialTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unknown Type';
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

  onMenuItemRemove() {
    this.selectedMenuItem = null;
    this.specialForm.get('typeSpecialDetails')?.setValue(null);
    this.markAsChanged();
  }
}

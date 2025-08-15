import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { catchError, finalize, startWith, map } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { Menu } from '../../../shared/services/menu';
import { dateRangeValidator } from '../../../shared/validators/date-range-validator';
import { timeRangeValidator } from '../../../shared/validators/time-range-validator';
import { ToastrService } from 'ngx-toastr';
import { of, Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MediaUploadModalService } from '../../../shared/services/media-upload-modal.service';
import { MediaLibraryService } from '../../../shared/services/media-library.service';
import { SpecialsService } from '../../../shared/services/specials.service';
import { MediaItem } from '../../../shared/types/media';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { SPECIAL_TYPE_OPTIONS, SpecialTypeOption } from '../shared/special-types.constants';

@Component({
  selector: 'app-add-special',
  templateUrl: './add-special.component.html',
  styleUrls: ['./add-special.component.scss'],
})
export class AddSpecialComponent implements OnInit {
  isSaving: boolean = false;
  currentStep = 1;
  selectedSpecialType: number = 1;
  uploadDone: boolean = false;
  specialForm: FormGroup;
  specialTypes: SpecialTypeOption[] = SPECIAL_TYPE_OPTIONS;
  weekdays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  selectedDays: string[] = ['Mon'];
  menus: Menu[] = [];
  selectedMenu: Menu | null = null;
  addedItems: { name: string; amount: string }[] = [];
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
    private toastr: ToastrService,
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
      },
      {
        validators: [dateRangeValidator(), timeRangeValidator()],
      }
    );
  }

  ngOnInit() {
    // Read step from route parameter
    this.route.params.subscribe((params) => {
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
  addItem(): void {
    const selectedType = this.selectedSpecialType;

    if (selectedType === 1) {
      // Percentage Discount
      const percentage = this.specialForm.get('percentage')?.value;
      if (this.selectedMenuItem && percentage) {
        this.addedItems.push({ 
          name: this.selectedMenuItem.name, 
          amount: `${percentage}%` 
        });
        this.specialForm.get('percentage')?.reset();
        this.menuItemAutocompleteControl.setValue('');
        this.selectedMenuItem = null;
      }
    } else if (selectedType === 2) {
      // Price Discount
      const amount = this.specialForm.get('amount')?.value;
      if (this.selectedMenuItem && amount) {
        this.addedItems.push({ 
          name: this.selectedMenuItem.name, 
          amount: amount
        });
        this.specialForm.get('amount')?.reset();
        this.menuItemAutocompleteControl.setValue('');
        this.selectedMenuItem = null;
      }
    } else if (selectedType === 4) {
      // Category Special
      const categoryName = this.specialForm.get('featureSpecialUnder')?.value;
      const amount = this.specialForm.get('amount')?.value;

      if (categoryName && amount) {
        this.addedItems.push({
          name: `Category: ${categoryName}`,
          amount: amount,
        });
        this.specialForm.get('featureSpecialUnder')?.reset();
        this.specialForm.get('amount')?.reset();
      }
    } else if (selectedType === 3) {
      // Combo Special
      const comboItems = this.specialForm.get('typeSpecialDetails')?.value;
      const percentage = this.specialForm.get('percentage')?.value;

      if (Array.isArray(comboItems) && comboItems.length > 0 && percentage) {
        const comboItemNames = comboItems.join(', ');
        this.addedItems.push({
          name: `Combo: ${comboItemNames}`,
          amount: `${percentage}%`,
        });
        this.specialForm.get('typeSpecialDetails')?.reset();
        this.specialForm.get('percentage')?.reset();
      }
    }
    this.markAsChanged();
  }
  getSpecialTypeLabel(type: number): string {
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

    dialogRef.afterClosed().subscribe((result: MediaItem | undefined) => {
      if (result) {
        this.selectedMediaItem = result;
        this.mediaId = result.id;
        this.uploadedImageUrl = result.url;
        this.uploadDone = true;
        this.markAsChanged();
        this.toastr.success('Image uploaded successfully!');
      }
    });
  }

  // Removed uploadImageToFirebase method - now handled by MediaLibraryService

  onSubmit() {
    this.isSaving = true;
    const formValue = this.specialForm.getRawValue();
    const data = {
      ...formValue,
      addedItems: this.addedItems,
      selectedDays: this.selectedDays,
      imageUrl: this.uploadedImageUrl,
      OwnerID: this.owner,
      active: true,
      isDraft: false,
    };

    // Use the new SpecialsService with media library integration
    this.specialsService.createSpecial(data, this.mediaId || undefined).subscribe({
      next: (specialId) => {
        // Track media usage if media was uploaded
        if (this.mediaId) {
          this.specialsService.trackMediaUsage(this.mediaId, specialId, 'image').subscribe({
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
        this.toastr.error('Failed to save special');
      }
    });
  }

  // Removed cancelUpload() method - handled by ImageUploadModalComponent

  onDraftSave() {
    this.isSaving = true;

    const formValue = this.specialForm.getRawValue();
    const data = {
      ...formValue,
      addedItems: this.addedItems,
      selectedDays: this.selectedDays,
      imageUrl: this.uploadedImageUrl,
      specialID: '1',
      OwnerID: this.owner,
      active: false,
      isDraft: true,
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
        this.toastr.success('Draft saved successfully.');
      })
      .catch((error) => {
        console.error('Error saving draft to Firestore:', error);
        this.isSaving = false;
        this.toastr.error('Failed to save draft.');
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
      this.router.navigate(['/specials']);
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
        featureSpecialUnder: ''
      });
      
      // Clear autocomplete control
      this.menuItemAutocompleteControl.setValue('');
      this.selectedMenuItem = null;
      
      // Clear added items from previous type
      this.addedItems = [];
      
      // Auto-select first item/category when special type changes
      if (this.selectedMenu) {
        if (this.selectedSpecialType === 1 && this.selectedMenu.items?.length > 0) {
          this.specialForm.patchValue({
            typeSpecialDetails: this.selectedMenu.items[0].name
          });
        } else if (this.selectedSpecialType === 4 && this.selectedMenu.categories?.length > 0) {
          this.specialForm.patchValue({
            featureSpecialUnder: this.selectedMenu.categories[0].id
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

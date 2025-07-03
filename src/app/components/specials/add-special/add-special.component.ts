import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Menu } from '../../../shared/services/menu';
import { dateRangeValidator } from '../../../shared/validators/date-range-validator';
import { timeRangeValidator } from '../../../shared/validators/time-range-validator';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ImageUploadModalComponent, ImageUploadConfig, ImageUploadData, ImageUploadResult } from '../../shared/image-upload-modal/image-upload-modal.component';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';

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
  specialTypes = [
    { id: 1, name: 'Weekly Special' },
    { id: 2, name: 'Category special' },
    { id: 3, name: 'Combo special' },
  ];
  weekdays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  selectedDays: string[] = [];
  menus: Menu[] = [];
  selectedMenu: Menu | null = null;
  addedItems: { name: string; amount: string }[] = [];
  imageUploadProgress: number = 0;
  uploadedImageUrl: string | null = null;
  owner: string = '';
  hasUnsavedChanges: boolean = false;

  showSuccessPopup: boolean = false;
  successPopupMessage: string = '';

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private router: Router
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
        timeFrom: ['', Validators.required],
        timeTo: ['', Validators.required],
      },
      {
        validators: [dateRangeValidator(), timeRangeValidator()],
      }
    );
  }

  ngOnInit() {
    this.fetchMenus();
    this.trackFormChanges();
    console.log('Component initialized, hasUnsavedChanges:', this.hasUnsavedChanges);
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
      // Weekly Special
      const selectedItemName =
        this.specialForm.get('typeSpecialDetails')?.value;
      const amount = this.specialForm.get('amount')?.value;

      if (selectedItemName && amount) {
        this.addedItems.push({ name: selectedItemName, amount });
        this.specialForm.get('typeSpecialDetails')?.reset();
        this.specialForm.get('amount')?.reset();
      }
    } else if (selectedType === 2) {
      // Category Special
      const categoryName = this.specialForm.get('featureSpecialUnder')?.value;
      const percentage = this.specialForm.get('percentage')?.value;

      if (categoryName && percentage) {
        this.addedItems.push({
          name: `Category: ${categoryName}`,
          amount: `${percentage}%`,
        });
        this.specialForm.get('featureSpecialUnder')?.reset();
        this.specialForm.get('percentage')?.reset();
      }
    } else if (selectedType === 3) {
      // Combo Special
      const comboItems = this.specialForm.get('typeSpecialDetails')?.value; // Array of items
      const comboPrice = this.specialForm.get('comboPrice')?.value;

      if (Array.isArray(comboItems) && comboItems.length > 0 && comboPrice) {
        const comboItemNames = comboItems.join(', ');
        this.addedItems.push({
          name: `Combo: ${comboItemNames}`,
          amount: comboPrice,
        });
        this.specialForm.get('typeSpecialDetails')?.reset();
        this.specialForm.get('comboPrice')?.reset();
      }
    }
    this.markAsChanged();
  }
  getSpecialTypeLabel(type: number): string {
    switch (type) {
      case 1:
        return 'Weekly Special';
      case 2:
        return 'Category Special';
      case 3:
        return 'Combo Special';
      default:
        return 'Special Type';
    }
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
        console.log(menus);
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

  isSelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  openImageUploadModal() {
    const config: ImageUploadConfig = {
      title: 'Upload Special Image',
      formats: ['PNG', 'JPG'],
      maxFileSize: 5000, // 5MB as per original requirement
      dimensions: '1080x1080',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      allowMultiple: false,
      maxFiles: 1
    };

    const dialogRef = this.dialog.open(ImageUploadModalComponent, {
      width: '600px',
      panelClass: 'image-upload-modal-panel',
      data: {
        config: config,
        currentImageUrl: this.uploadedImageUrl
      }
    });

    dialogRef.afterClosed().subscribe((result: ImageUploadResult) => {
      if (result?.action === 'save' && result.files && result.files.length > 0) {
        this.isSaving = true;
        this.uploadImageToFirebase(result.files[0]);
      } else if (result?.action === 'remove') {
        this.uploadedImageUrl = null;
      }
    });
  }

  uploadImageToFirebase(file: File) {
    const filePath = `images/${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, file);

    uploadTask.percentageChanges().subscribe((progress) => {
      this.imageUploadProgress = progress || 0;
    });

    uploadTask
      .snapshotChanges()
      .pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe({
            next: (url) => {
              this.uploadedImageUrl = url;

              this.uploadDone = true;
              this.isSaving = false;
              this.markAsChanged();
            },
            error: (err) => {
              console.error('Failed to get download URL:', err);
              this.isSaving = false;
            },
          });
        }),
        catchError((err) => {
          console.error('Upload failed:', err);
          this.isSaving = false;
          return of();
        })
      )
      .subscribe();
  }

  onSubmit() {
    this.isSaving = true;
    const formValue = this.specialForm.getRawValue();
    const data = {
      ...formValue,
      addedItems: this.addedItems,
      selectedDays: this.selectedDays,
      imageUrl: this.uploadedImageUrl,
      OwnerID: this.owner,
      specialID: '1',
      active: true,
      isDraft: false,
    };

    this.firestore
      .collection('specials')
      .add(data)
      .then((results) => {
        const newData = {
          ...data,
          specialID: results.id,
        };
        this.firestore.collection('specials').doc(results.id).update(newData);
        this.isSaving = false;
        this.markAsSaved();
        this.showSuccess('Special saved successfully!');
      })
      .catch((error) => {
        console.error('Error saving to Firestore:', error);
        this.isSaving = false;
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
    if (this.currentStep === 1) {
      // Mark all required fields as touched to show validation errors
      const controlsToCheck = [
        'specialTitle',
        'menu',
        'typeSpecial',
        'dateFrom',
        'dateTo',
      ];

      let hasErrors = false;
      controlsToCheck.forEach((controlName) => {
        const control = this.specialForm.get(controlName);
        control?.markAsTouched();
        if (control?.invalid) {
          hasErrors = true;
        }
      });

      // Explicitly check that date fields have actual values (not empty strings)
      const dateFrom = this.specialForm.get('dateFrom')?.value;
      const dateTo = this.specialForm.get('dateTo')?.value;
      
      // Enhanced validation: check for null, undefined, empty string, or whitespace
      if (!dateFrom || !dateTo || 
          dateFrom.toString().trim() === '' || 
          dateTo.toString().trim() === '') {
        // Mark date fields as touched and invalid to show error messages
        this.specialForm.get('dateFrom')?.markAsTouched();
        this.specialForm.get('dateTo')?.markAsTouched();
        this.specialForm.get('dateFrom')?.setErrors({ 'required': true });
        this.specialForm.get('dateTo')?.setErrors({ 'required': true });
        hasErrors = true;
        
        // Show user feedback
        this.toastr.error('Please fill in both start date and end date before proceeding.');
      }

      // Check for form-level validation errors (like date range)
      if (this.specialForm.errors?.['dateRangeInvalid']) {
        hasErrors = true;
        this.toastr.error('Start date must be before end date.');
      }

      // Prevent navigation if there are any errors
      if (hasErrors) {
        console.log('Form validation failed, preventing navigation to step 2');
        return;
      }

      console.log('Form validation passed, proceeding to step 2');
    }

    if (this.currentStep < 5) this.currentStep++;
  }

  previousStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  navigateToStep(step: number): void {
    if (step < this.currentStep && step >= 1) {
      this.currentStep = step;
    }
  }

  onSpecialTypeChange() {
    this.selectedSpecialType = this.specialForm.get('typeSpecial')?.value;
  }

  onBackButtonClick() {
    this.navigateWithUnsavedChangesCheck('/specials');
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
}

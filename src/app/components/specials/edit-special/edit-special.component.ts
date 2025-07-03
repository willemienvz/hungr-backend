import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Menu } from '../../../shared/services/menu';
import { dateRangeValidator } from '../../../shared/validators/date-range-validator';
import { timeRangeValidator } from '../../../shared/validators/time-range-validator';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ImageUploadModalComponent, ImageUploadConfig, ImageUploadData, ImageUploadResult } from '../../shared/image-upload-modal/image-upload-modal.component';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';

@Component({
  selector: 'app-edit-special',
  templateUrl: './edit-special.component.html',
  styleUrls: ['./edit-special.component.scss'],
})
export class EditSpecialComponent implements OnInit {
  isSaving: boolean = false;
  currentStep = 1;
  selectedSpecialType: number = 1;
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
  uploadedImageUrl: string | null = null;
  owner: string = '';
  specialId: string = '';
  hasUnsavedChanges: boolean = false;
  showSuccessPopup: boolean = false;
  successPopupMessage: string = '';
  specialData: any = null;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private dialog: MatDialog
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
    this.specialId = this.route.snapshot.paramMap.get('id') || '';
    this.fetchSpecialData();
    this.fetchMenus();
    this.trackFormChanges();
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
    this.firestore
      .collection('specials')
      .doc(this.specialId)
      .valueChanges()
      .subscribe((data: any) => {
        if (data) {
          this.specialData = data;
          this.specialForm.patchValue(data);
          this.addedItems = data.addedItems || [];
          this.selectedDays = data.selectedDays || [];
          this.uploadedImageUrl = data.imageUrl || null;
          this.selectedSpecialType = data.typeSpecial || 1;

          // Try setting selectedMenu after menus are loaded
          if (this.menus.length > 0) {
            this.setSelectedMenu(data.menu);
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
    const data = {
      ...formValue,
      addedItems: this.addedItems,
      selectedDays: this.selectedDays,
      imageUrl: this.uploadedImageUrl,
      OwnerID: this.owner,
      active: true,
      isDraft: false,
    };

    this.firestore
      .collection('specials')
      .doc(this.specialId)
      .update(data)
      .then(() => {
        this.isSaving = false;
        this.markAsSaved();
        this.showSuccess('Special updated successfully!');
        this.router.navigate(['/specials']);
      })
      .catch((error) => {
        console.error('Error updating Firestore:', error);
        this.isSaving = false;
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

  isSelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  removeItem(index: number): void {
    this.addedItems.splice(index, 1);
    this.markAsChanged();
  }

  openImageUploadModal() {
    const config: ImageUploadConfig = {
      title: 'Upload Special Image',
      maxFileSize: 5000, // 5MB in KB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      allowMultiple: false,
      maxFiles: 1
    };

    const data: ImageUploadData = {
      config: config,
      currentImageUrl: this.uploadedImageUrl || undefined
    };

    const dialogRef = this.dialog.open(ImageUploadModalComponent, {
      width: '500px',
      data: data
    });

    dialogRef.afterClosed().subscribe((result: ImageUploadResult | undefined) => {
      if (result && result.action === 'save') {
        if (result.imageUrl) {
          this.uploadedImageUrl = result.imageUrl;
          this.toastr.success('Image uploaded successfully!');
        } else if (result.files && result.files.length > 0) {
          // If we get new files, we need to upload them to Firebase
          this.uploadFileToFirebase(result.files[0]);
        }
      } else if (result && result.action === 'remove') {
        this.uploadedImageUrl = null;
        this.toastr.info('Image removed');
      }
    });
  }

  private uploadFileToFirebase(file: File) {
    const filePath = `specials/${Date.now()}_${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, file);

    uploadTask.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe({
                     next: (url) => {
             this.uploadedImageUrl = url;
             this.markAsChanged();
             this.toastr.success('Image uploaded successfully!');
           },
          error: (err) => {
            console.error('Failed to get download URL:', err);
            this.toastr.error('Failed to upload image');
          }
        });
      })
    ).subscribe({
      error: (err) => {
        console.error('Upload failed:', err);
        this.toastr.error('Failed to upload image');
      }
    });
  }

  showSuccess(message: string) {
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

  onBackButtonClick() {
    this.navigateWithUnsavedChangesCheck('/specials');
  }
}

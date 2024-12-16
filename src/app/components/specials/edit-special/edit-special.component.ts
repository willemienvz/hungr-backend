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

@Component({
  selector: 'app-edit-special',
  templateUrl: './edit-special.component.html',
  styleUrls: ['./edit-special.component.scss']
})
export class EditSpecialComponent implements OnInit {
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
  showImageUploadModal: boolean = false;
  uploadedImageUrl: string | null = null;
  owner: string = '';
  specialId: string = '';
  showSuccessPopup: boolean = false;
  successPopupMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.specialForm = this.fb.group({
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
    }, {
      validators: [dateRangeValidator(), timeRangeValidator()]
    });
  }

  ngOnInit() {
    this.specialId = this.route.snapshot.paramMap.get('id') || '';
    this.fetchSpecialData();
    this.fetchMenus();
  }

  fetchSpecialData() {
    this.firestore.collection('specials').doc(this.specialId).valueChanges()
      .subscribe((data: any) => {
        if (data) {
          this.specialForm.patchValue(data);
          this.addedItems = data.addedItems || [];
          this.selectedDays = data.selectedDays || [];
          this.uploadedImageUrl = data.imageUrl || null;
          this.selectedSpecialType = data.typeSpecial || 1;
        }
      });
  }

  fetchMenus() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    this.owner = user.uid;
    this.firestore.collection<Menu>('menus', ref => ref.where('OwnerID', '==', OwnerID))
      .valueChanges()
      .subscribe(menus => this.menus = menus);
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
    };

    this.firestore.collection('specials').doc(this.specialId).update(data)
      .then(() => {
        this.isSaving = false;
        this.showSuccess('Special updated successfully!');
        this.router.navigate(['/specials']);
      })
      .catch(error => {
        console.error('Error updating Firestore:', error);
        this.isSaving = false;
      });
  }

  onMenuChange() {
    const menuControl = this.specialForm.get('menu');
    if (menuControl?.value) {
      this.specialForm.enable();
      this.selectedMenu = this.menus.find(menu => menu.menuID === menuControl.value) || null;
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
  }
  addItem(): void {
    const selectedType = this.selectedSpecialType;
  
    if (selectedType === 1) { // Weekly Special
      const selectedItemName = this.specialForm.get('typeSpecialDetails')?.value;
      const amount = this.specialForm.get('amount')?.value;
  
      if (selectedItemName && amount) {
        this.addedItems.push({ name: selectedItemName, amount });
        this.specialForm.get('typeSpecialDetails')?.reset();
        this.specialForm.get('amount')?.reset();
      }
    } 
    else if (selectedType === 2) { // Category Special
      const categoryName = this.specialForm.get('featureSpecialUnder')?.value;
      const percentage = this.specialForm.get('percentage')?.value;
  
      if (categoryName && percentage) {
        this.addedItems.push({ name: `Category: ${categoryName}`, amount: `${percentage}%` });
        this.specialForm.get('featureSpecialUnder')?.reset();
        this.specialForm.get('percentage')?.reset();
      }
    } 
    else  if (selectedType === 3) { // Combo Special
      const comboItems = this.specialForm.get('typeSpecialDetails')?.value; // Array of items
      const comboPrice = this.specialForm.get('comboPrice')?.value;
  
      if (Array.isArray(comboItems) && comboItems.length > 0 && comboPrice) {
        const comboItemNames = comboItems.join(', ');
        this.addedItems.push({ name: `Combo: ${comboItemNames}`, amount: comboPrice });
        this.specialForm.get('typeSpecialDetails')?.reset();
        this.specialForm.get('comboPrice')?.reset();
      }
    }
  }

  isSelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }


  removeItem(index: number): void {
    this.addedItems.splice(index, 1);
  }

  openImageUploadModal() {
    this.showImageUploadModal = true;
  }

  closeImageUploadModal() {
    this.showImageUploadModal = false;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    this.uploadImageToFirebase(file);
  }

  uploadImageToFirebase(file: File) {
    const filePath = `images/${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, file);

    uploadTask.percentageChanges().subscribe(progress => {
      this.imageUploadProgress = progress || 0;
    });

    uploadTask.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe(url => {
          this.uploadedImageUrl = url;
          this.uploadDone = true;
        });
      })
    ).subscribe();
  }

  showSuccess(message: string) {
    this.successPopupMessage = message;
    this.showSuccessPopup = true;
  }

  nextStep() {
    if (this.currentStep < 5) this.currentStep++;
  }

  previousStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  onSpecialTypeChange() {
    this.selectedSpecialType = this.specialForm.get('typeSpecial')?.value;
  }

  getSpecialTypeLabel(type: number): string {
    switch (type) {
      case 1: return 'Weekly Special';
      case 2: return 'Category Special';
      case 3: return 'Combo Special';
      default: return 'Special Type';
    }
  }
}

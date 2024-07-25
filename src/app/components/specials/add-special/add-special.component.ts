import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';
import { Menu } from '../../../shared/services/menu';
import { dateRangeValidator } from '../../../shared/validators/date-range-validator';
import { timeRangeValidator } from '../../../shared/validators/time-range-validator';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-add-special',
  templateUrl: './add-special.component.html',
  styleUrls: ['./add-special.component.scss']
})
export class AddSpecialComponent implements OnInit {
  isSaving: boolean = false;
  uploadDone: boolean = false;
  specialForm: FormGroup;
  specialTypes = [
    { id: 1, name: 'Weekly Special' },
    { id: 2, name: 'Category special' },
    { id: 3, name: 'Discount special' },
    { id: 4, name: 'Combo special' },
    { id: 5, name: 'Item promotion (e.g. new items'}
  ];
  weekdays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  selectedDays: string[] = [];
  menus: Menu[] = [];
  selectedMenu: Menu | null = null;
  addedItems: { name: string; amount: number }[] = [];
  imageUploadProgress: number = 0;
  showImageUploadModal: boolean = false;
  uploadedImageUrl: string | null = null;
  owner: string = '';

  showSuccessPopup: boolean = false;
  successPopupMessage: string = '';

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.specialForm = this.fb.group({
      menu: [null, Validators.required],
      specialTitle: [{ value: '', disabled: true }, Validators.required],
      dateFrom: [{ value: '', disabled: true }, Validators.required],
      dateTo: [{ value: '', disabled: true }, Validators.required],
      typeSpecial: [{ value: '', disabled: true }, Validators.required],
      typeSpecialDetails: [{ value: '', disabled: true }],
      amount: [{ value: '', disabled: true }],
      featureSpecialUnder: [{ value: '', disabled: true }],
      timeFrom: [{ value: '', disabled: true }, Validators.required],
      timeTo: [{ value: '', disabled: true }, Validators.required],
    }, {
      validators: [dateRangeValidator(), timeRangeValidator()]
    });
  }

  ngOnInit() {
    this.fetchMenus();
    this.addPrefixIfNeeded();
  }

  addPrefixIfNeeded() {
    const amountControl = this.specialForm.get('amount');
    if (amountControl && !amountControl.value.startsWith('R')) {
      amountControl.setValue('R' + amountControl.value);
    }
  }

  preventDeletion(event: any) {
    const inputElement = event.target;
    const currentValue = inputElement.value;

    if (!currentValue.startsWith('R')) {
      inputElement.value = 'R' + currentValue.replace(/R/g, '');
      this.specialForm.get('amount')?.setValue(inputElement.value);
    }
  }

  private fetchMenus() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    this.owner = user.uid;
    this.firestore.collection<Menu>('menus', ref => ref.where('OwnerID', '==', OwnerID))
      .valueChanges()
      .subscribe(menus => {
        this.menus = menus;
        console.log(menus);
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

  addItem() {
    const typeSpecialDetailsControl = this.specialForm.get('typeSpecialDetails');
    const amountControl = this.specialForm.get('amount');

    if (typeSpecialDetailsControl?.value && amountControl?.value) {
      const item = {
        name: typeSpecialDetailsControl.value,
        amount: parseFloat(amountControl.value)
      };

      if (!this.addedItems.find(i => i.name === item.name)) {
        this.addedItems.push(item);
        console.log('Added Items:', this.addedItems);
      }

      typeSpecialDetailsControl.reset();
      amountControl.reset();
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

  isSelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  removeItem(index: number) {
    this.addedItems.splice(index, 1);
    console.log('Updated Items:', this.addedItems);
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
          console.log('Uploaded Image URL:', url);
          this.uploadDone = true;
        });
      })
    ).subscribe();
  }

  onSubmit() {
    this.isSaving = true;
    if (this.specialForm.valid) {
      const formValue = this.specialForm.getRawValue();
      const data = {
        ...formValue,
        addedItems: this.addedItems,
        selectedDays: this.selectedDays,
        imageUrl: this.uploadedImageUrl, 
        OwnerID: this.owner,
        specialID: '1',
        active: true
      };
      this.firestore.collection('specials').add(data)
        .then((results) => {
          const newData = {
            ...data,
            specialID: results.id
          };
          this.firestore.collection('specials').doc(results.id).update(newData);
          this.isSaving = false;
          this.showSuccess('Special saved successfully!'); 
        })
        .catch(error => {
          console.error('Error saving to Firestore:', error);
          this.isSaving = false;
        });
    }else{
      this.isSaving = false;
      this.toastr.error('Some fields have not been completed. ');
    }
  }

  cancelUpload() {
    this.uploadedImageUrl = '';
    this.closeImageUploadModal();
  }

  onDraftSave() {
    this.isSaving = true;
    if (this.specialForm.valid) {
      const formValue = this.specialForm.getRawValue();
      const data = {
        ...formValue,
        addedItems: this.addedItems,
        selectedDays: this.selectedDays,
        imageUrl: this.uploadedImageUrl, 
        specialID: '1',
        OwnerID: this.owner,
        active: false
      };
      this.firestore.collection('specials').add(data)
        .then((results) => {
          const newData = {
            ...data,
            specialID: results.id
          };
          this.firestore.collection('specials').doc(results.id).update(newData);
          this.isSaving = false;
          this.showSuccess('Draft saved successfully!'); 
        })
        .catch(error => {
          console.error('Error saving draft to Firestore:', error);
          this.isSaving = false;
        });
    }else{
      this.isSaving = false;
      this.toastr.error('Some fields have not been completed. ');
    }
  }

  private showSuccess(message: string) {
    this.successPopupMessage = message;
    this.showSuccessPopup = true;
    
  }
}

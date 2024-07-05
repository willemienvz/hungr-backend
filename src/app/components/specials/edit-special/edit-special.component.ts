import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { Menu } from '../../../shared/services/menu';
import { dateRangeValidator } from '../../../shared/validators/date-range-validator';
import { timeRangeValidator } from '../../../shared/validators/time-range-validator';
import { Special } from '../../../shared/services/special';

@Component({
  selector: 'app-edit-special',
  templateUrl: './edit-special.component.html',
  styleUrls: ['./edit-special.component.scss']
})
export class EditSpecialComponent implements OnInit {
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
  specialID: string = '';
  showSuccessPopup: boolean = false;
  successPopupMessage: string = '';

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.specialForm = this.fb.group({
      menu: [{ value: '', disabled: true }, Validators.required],
      specialTitle: ['', Validators.required],
      dateFrom: ['', Validators.required],
      dateTo: ['', Validators.required],
      typeSpecial: ['', Validators.required],
      typeSpecialDetails: [''],
      amount: [''],
      featureSpecialUnder: [''],
      timeFrom: ['', Validators.required],
      timeTo: ['', Validators.required],
    }, {
      validators: [dateRangeValidator(), timeRangeValidator()]
    });
  }

  ngOnInit() {
    this.fetchMenus();
    this.loadSpecial();
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

  private loadSpecial() {
    this.specialID = this.route.snapshot.paramMap.get('id')!;
    console.log(this.route.snapshot.paramMap);
    this.firestore.collection('specials').doc(this.specialID).valueChanges().subscribe((special) => {
      if (special) {
        // Type assertion to help TypeScript understand `special`'s shape
        const data = special as Special;

        // Enable form controls to allow setting values
        this.specialForm.enable();

        // Remove any existing added items and days to avoid duplicates
        this.addedItems = [];
        this.selectedDays = [];

        // Patch form values
        this.specialForm.patchValue({
          menu: data.menu,
          specialTitle: data.specialTitle,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
          typeSpecial: data.typeSpecial,
          typeSpecialDetails: data.typeSpecialDetails,
          featureSpecialUnder: data.featureSpecialUnder,
          timeFrom: data.timeFrom,
          timeTo: data.timeTo
        });

        // Set additional properties
        this.selectedMenu = this.menus.find(menu => menu.menuID === data.menu) || null;
        this.addedItems = data.addedItems || [];
        this.selectedDays = data.selectedDays || [];
        this.uploadedImageUrl = data.imageUrl || '';
      }
    });
  }

  onMenuChange() {
    const menuControl = this.specialForm.get('menu');
    if (menuControl?.value) {
      this.specialForm.enable();
      menuControl.disable();
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
          this.showImageUploadModal = false;
        });
      })
    ).subscribe();
  }

  submitForm() {
    if (this.specialForm.valid) {
      this.isSaving = true;
      const data: Special = {
        ...this.specialForm.value,
        addedItems: this.addedItems,
        selectedDays: this.selectedDays,
        imageUrl: this.uploadedImageUrl,
        owner: this.owner
      };

      this.firestore.collection('specials').doc(this.specialID).update(data)
        .then(() => {
          console.log('Special updated successfully');
          this.isSaving = false;
          this.showSuccessPopup = true;
          this.successPopupMessage = 'Special updated successfully!';
          setTimeout(() => {
            this.showSuccessPopup = false;
            this.router.navigate(['/specials']);
          }, 2000);
        })
        .catch(error => {
          console.error('Error updating special:', error);
          this.isSaving = false;
        });
    }
  }

  cancel() {
    this.router.navigate(['/specials']);
  }

  cancelUpload() {
    this.uploadedImageUrl = '';
    this.closeImageUploadModal();
  }
}

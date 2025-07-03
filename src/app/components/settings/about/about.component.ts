import { Component } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { User } from '../../../shared/services/user';
import { MatDialog } from '@angular/material/dialog';
import { ImageUploadModalComponent, ImageUploadConfig, ImageUploadData, ImageUploadResult } from '../../shared/image-upload-modal/image-upload-modal.component';
import { ToastrService } from 'ngx-toastr';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';

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
  additionalImageUrl: string = '';
  userData$!: Observable<any>;
  about: any;
  hasUnsavedChanges: boolean = false;
  private originalValues: any = {};

  users: User[] = [];
  mainUserName: string = '';
  constructor(
    private storage: AngularFireStorage,
    private router: Router,
    public authService: AuthService,
    private firestore: AngularFirestore,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    this.authService.getCurrentUserId().then((uid) => {
      if (uid) {
        this.userDataID = uid;
        this.fetchUsers();
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
          this.additionalImageUrl = result[0].about.additionalImageUrl || '';
          this.setupChangeTracking(); // Store initial values as original
        }
      });
  }

  openMainImageUpload(): void {
    const config: ImageUploadConfig = {
      title: 'Upload Main Image',
      formats: ['PNG', 'JPG'],
      maxFileSize: 1000, // 1MB
      dimensions: '1080x720',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      allowMultiple: false,
      maxFiles: 1
    };

    const data: ImageUploadData = {
      config: config,
      currentImageUrl: this.mainImageUrl || undefined
    };

    const dialogRef = this.dialog.open(ImageUploadModalComponent, {
      width: '600px',
      panelClass: 'image-upload-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe((result: ImageUploadResult) => {
      if (result?.action === 'save') {
        if (result.files && result.files.length > 0) {
          this.uploadImageToFirebase(result.files[0], 'main');
        } else if (result.imageUrls && result.imageUrls.length > 0) {
          this.mainImageUrl = result.imageUrls[0];
        }
      } else if (result?.action === 'remove') {
        this.mainImageUrl = '';
      }
    });
  }

  openAdditionalImageUpload(): void {
    const config: ImageUploadConfig = {
      title: 'Upload Additional Image',
      formats: ['PNG', 'JPG'],
      maxFileSize: 1000, // 1MB
      dimensions: '1080x720',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      allowMultiple: false,
      maxFiles: 1
    };

    const data: ImageUploadData = {
      config: config,
      currentImageUrl: this.additionalImageUrl || undefined
    };

    const dialogRef = this.dialog.open(ImageUploadModalComponent, {
      width: '600px',
      panelClass: 'image-upload-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe((result: ImageUploadResult) => {
      if (result?.action === 'save') {
        if (result.files && result.files.length > 0) {
          this.uploadImageToFirebase(result.files[0], 'additional');
        } else if (result.imageUrls && result.imageUrls.length > 0) {
          this.additionalImageUrl = result.imageUrls[0];
        }
      } else if (result?.action === 'remove') {
        this.additionalImageUrl = '';
      }
    });
  }

  private uploadImageToFirebase(file: File, type: 'main' | 'additional'): void {
    this.isSaving = true;
    const filePath = `about-images/${Date.now()}_${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const task = this.storage.upload(filePath, file);

    task
      .snapshotChanges()
      .pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe({
            next: (url) => {
              if (type === 'main') {
                this.mainImageUrl = url;
                this.toastr.success('Main image uploaded successfully!');
              } else {
                this.additionalImageUrl = url;
                this.toastr.success('Additional image uploaded successfully!');
              }
              this.isSaving = false;
            },
            error: (error) => {
              console.error('Error getting download URL:', error);
              this.toastr.error('Error uploading image');
              this.isSaving = false;
            }
          });
        })
      )
      .subscribe({
        error: (error) => {
          console.error('Error uploading file:', error);
          this.toastr.error('Error uploading image');
          this.isSaving = false;
        }
      });
  }

  update() {
    this.isSaving = true;
    const data = {
      about: {
        aboutText: this.aboutText,
        businessHours: this.businessHours,
        email: this.email,
        cellphone: this.cellphone,
        isBusinessHoursVisible: this.isBusinessHoursVisible,
        isContactDetailsVisible: this.isContactDetailsVisible,
        mainImageUrl: this.mainImageUrl,
        additionalImageUrl: this.additionalImageUrl,
      },
    };

    this.firestore
      .doc(`users/${this.userDataID}`)
      .update(data)
      .then(() => {
        this.isSaving = false;
        this.markAsSaved();
        this.toastr.success('About section updated successfully');
      })
      .catch((error) => {
        this.isSaving = false;
        console.error('Error updating user data:', error);
      });
  }

  removeMainImg() {
    this.mainImageUrl = '';
    this.markAsChanged();
  }

  removeSecImg() {
    this.additionalImageUrl = '';
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
      isBusinessHoursVisible: this.isBusinessHoursVisible
    };
  }

  markAsChanged() {
    this.hasUnsavedChanges = true;
  }

  private markAsSaved() {
    this.hasUnsavedChanges = false;
    this.setupChangeTracking(); // Update original values
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

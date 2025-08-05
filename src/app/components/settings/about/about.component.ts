import { Component } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { User } from '../../../shared/services/user';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { MediaUploadModalService } from '../../../shared/services/media-upload-modal.service';
import { MediaLibraryService } from '../../../shared/services/media-library.service';
import { MediaItem } from '../../../shared/types/media';

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
    private toastr: ToastrService,
    private mediaUploadModalService: MediaUploadModalService,
    private mediaLibraryService: MediaLibraryService
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
    const dialogRef = this.mediaUploadModalService.openUploadModal({
      componentType: 'other',
      componentId: 'main-image',
      fieldName: 'mainImage',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 2 * 1024 * 1024, // 2MB
      allowMultiple: false,
      maxFiles: 1
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'save') {
        if (result.mediaItem) {
          // New upload or selection from media library
          this.onMainImageUploaded(result.mediaItem);
        } else if (result.existingMediaUrl) {
          // Existing image kept (no new upload)
          this.mainImageUrl = result.existingMediaUrl;
        }
      } else if (result?.action === 'remove') {
        this.mainImageUrl = '';
      }
    });
  }

  openAdditionalImageUpload(): void {
    const dialogRef = this.mediaUploadModalService.openUploadModal({
      componentType: 'other',
      componentId: 'additional-image',
      fieldName: 'additionalImage',
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      maxFileSize: 2 * 1024 * 1024, // 2MB
      allowMultiple: false,
      maxFiles: 1
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.action === 'save') {
        if (result.mediaItem) {
          // New upload or selection from media library
          this.onAdditionalImageUploaded(result.mediaItem);
        } else if (result.existingMediaUrl) {
          // Existing image kept (no new upload)
          this.additionalImageUrl = result.existingMediaUrl;
        }
      } else if (result?.action === 'remove') {
        this.additionalImageUrl = '';
      }
    });
  }

  private async onMainImageUploaded(mediaItem: MediaItem): Promise<void> {
    try {
      this.isSaving = true;
      
      // Update about with media library reference
      this.mainImageUrl = mediaItem.url;
      
      // Track usage in media library
      await this.mediaLibraryService.trackMediaUsage(mediaItem.id, {
        componentType: 'other',
        componentId: 'main-image',
        componentName: 'About',
        usageDate: new Date(),
        fieldName: 'mainImage'
      });

      this.isSaving = false;
      this.toastr.success('Main image uploaded successfully!');
    } catch (error) {
      console.error('Error updating main image:', error);
      this.isSaving = false;
      this.toastr.error('Failed to update main image. Please try again.');
    }
  }

  private async onAdditionalImageUploaded(mediaItem: MediaItem): Promise<void> {
    try {
      this.isSaving = true;
      
      // Update about with media library reference
      this.additionalImageUrl = mediaItem.url;
      
      // Track usage in media library
      await this.mediaLibraryService.trackMediaUsage(mediaItem.id, {
        componentType: 'other',
        componentId: 'additional-image',
        componentName: 'About',
        usageDate: new Date(),
        fieldName: 'additionalImage'
      });

      this.isSaving = false;
      this.toastr.success('Additional image uploaded successfully!');
    } catch (error) {
      console.error('Error updating additional image:', error);
      this.isSaving = false;
      this.toastr.error('Failed to update additional image. Please try again.');
    }
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

import { Component } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { User } from '../../../shared/services/user';

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

  users: User[] = [];
  mainUserName: string = '';
  constructor(
    private storage: AngularFireStorage,
    private router: Router,
    public authService: AuthService,
    private firestore: AngularFirestore
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
        }
      });
  }

  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const filePath = `menu-images/${Date.now()}_${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);

      task
        .snapshotChanges()
        .pipe(
          finalize(() => {
            fileRef.getDownloadURL().subscribe((url) => {
              this.mainImageUrl = url;
            });
          })
        )
        .subscribe();
    }
  }
  onFileSelected1(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const filePath = `menu-images/${Date.now()}_${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);

      task
        .snapshotChanges()
        .pipe(
          finalize(() => {
            fileRef.getDownloadURL().subscribe((url) => {
              this.additionalImageUrl = url;
            });
          })
        )
        .subscribe();
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
      })
      .catch((error) => {
        this.isSaving = false;
        console.error('Error updating user data:', error);
      });
  }

  removeMainImg() {
    this.mainImageUrl = '';
  }

  removeSecImg() {
    this.additionalImageUrl = '';
  }
}

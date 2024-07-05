import { Component } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  aboutText: string = '';
  businessHours: string = '';
  email: string = '';
  isSaving: boolean = false; 
  cellphone: string = '';
  userDataID:string = '';
  isBusinessHoursVisible: boolean = true;
  isContactDetailsVisible: boolean = true;
  currentUser:any;
  mainImageUrl: string = '';
  additionalImageUrl: string= '';
  userData$!: Observable<any>;

  constructor(private storage: AngularFireStorage,private router: Router,public authService: AuthService, private firestore: AngularFirestore) {
    this.authService.getCurrentUserId().then((uid) => {
      if (uid) {
        console.log(uid);
        this.userDataID = uid;
      } else {
        console.log("No authenticated user");
        this.router.navigate(['/signin']);
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

      task.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe((url) => {
            this.mainImageUrl = url;
          });
        })
      ).subscribe();
    }
  }
  onFileSelected1(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const filePath = `menu-images/${Date.now()}_${file.name}`;
      const fileRef = this.storage.ref(filePath);
      const task = this.storage.upload(filePath, file);

      task.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe((url) => {
            this.additionalImageUrl = url;
          });
        })
      ).subscribe();
    }
  }


  update(){
    this.isSaving = true; 
    const data = {
      about :{
        aboutText: this.aboutText,
        businessHours: this.businessHours,
        email: this.email,
        cellphone: this.cellphone,
        isBusinessHoursVisible: this.isBusinessHoursVisible,
        isContactDetailsVisible: this.isContactDetailsVisible,
        mainImageUrl: this.mainImageUrl,
        additionalImageUrl: this.additionalImageUrl
      }
      
    };


    this.firestore.doc(`users/${this.userDataID}`).update(data)
    .then(() => {
      this.isSaving = false;
    })
    .catch((error) => {
     this.isSaving = false;
      console.error('Error updating user data:', error);
    });
  }
}

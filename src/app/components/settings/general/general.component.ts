import { Component } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { Observable, map } from 'rxjs';
import { ContentfulService } from '../../../shared/services/contentful.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../shared/services/notifications.service';

@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss'],
})
export class GeneralComponent {
  isTooltipOpen: boolean = false;
  aboutUsVisible: boolean = true;
  emailNotificationsEnabled: boolean = false;
  tipsAndTutorialsEnabled: boolean = false;
  userInsightsEnabled: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  currentUser: any;
  currentUserData!: User;
  userdateAll: any;
  accountForm!: FormGroup;
  userDataID: string = '';
  isSaving: boolean = false;
  userData$!: Observable<any>;
  constructor(
    private router: Router,
    public authService: AuthService,
    private formBuilder: FormBuilder,
    private firestore: AngularFirestore,
    private notificationService: NotificationsService
  ) {
    this.authService.getCurrentUserId().then((uid) => {
      if (uid) {
        console.log(uid);
        this.userDataID = uid;
        const userString = localStorage.getItem('user');
        if (userString) {
          this.currentUser = JSON.parse(userString);
          console.log(this.currentUser);
        }
        this.userData$ = this.firestore
          .doc(`users/${this.userDataID}`)
          .valueChanges();
        this.userData$.subscribe((data) => {
          this.currentUserData = data;
          console.log('currentUserData', this.currentUserData);
          this.updateFormWithUserData();
        });
      } else {
        console.log('No authenticated user');
        this.router.navigate(['/signin']);
      }
    });
  }

  ngOnInit(): void {
    this.accountForm = this.formBuilder.group({
      name: ['', Validators.required],
      surname: ['', Validators.required],
      password: ['', Validators.required],
      email: [{ value: '', disabled: true }, Validators.required],
      phone: ['', Validators.required],
    });
  }

  getUserData() {}

  updateFormWithUserData() {
    if (this.currentUserData && this.accountForm) {
      this.accountForm.patchValue({
        name: this.currentUserData.firstName,
        surname: this.currentUserData.Surname,
        email: this.currentUserData.email,
        phone: this.currentUserData.cellphoneNumber,
      });
    }
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  opentooltip() {
    this.isTooltipOpen != this.isTooltipOpen;
  }

  saveAccountDetails() {}

  saveAll() {
    this.isSaving = true;
    const userToSave: Partial<User> = {
      firstName: this.accountForm.get('name')?.value,
      Surname: this.accountForm.get('surname')?.value,
      cellphoneNumber: this.accountForm.get('phone')?.value,
      marketingConsent: this.currentUserData.marketingConsent,
      tipsTutorials: this.currentUserData.tipsTutorials,
      userInsights: this.currentUserData.userInsights,
      aboutUsDisplayed: this.currentUserData.aboutUsDisplayed,
    };

    this.firestore
      .doc(`users/${this.currentUserData.uid}`)
      .update(userToSave)
      .then(() => {
        this.isSaving = false;
        this.notificationService.addNotification('Your profile was updated');
      })
      .catch((error) => {
        this.isSaving = false;
        console.error('Error updating user data:', error);
      });
  }

  saveProfile() {
    //TODO
  }

  cancelSubscribtion() {
    //TODO
  }

  upgrade() {
    //TODO
  }
}

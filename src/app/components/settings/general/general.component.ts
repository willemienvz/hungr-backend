import { Component } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { Observable, map } from 'rxjs';
import { ContentfulService } from '../../../shared/services/contentful.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../shared/services/notifications.service';
import { MatDialog } from '@angular/material/dialog';
import { UnsavedChangesDialogComponent } from '../../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { PayFastService } from '../../../shared/services/payfast.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  currentUserData: User | null = null;
  userdateAll: any;
  accountForm!: FormGroup;
  userDataID: string = '';
  isSaving: boolean = false;
  isCancellingSubscription: boolean = false;
  userData$!: Observable<any>;
  hasUnsavedChanges: boolean = false;
  private originalFormValues: any = {};
  subscriptionData: any = null;
  constructor(
    private router: Router,
    public authService: AuthService,
    private formBuilder: FormBuilder,
    private firestore: AngularFirestore,
    private notificationService: NotificationsService,
    private dialog: MatDialog,
    private payfastService: PayFastService,
    private snackBar: MatSnackBar
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
        
        // Load subscription data
        this.loadSubscriptionData();
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
    this.setupFormTracking();
  }

  private setupFormTracking() {
    // Track form changes
    this.accountForm.valueChanges.subscribe(() => {
      this.markAsChanged();
    });
  }

  private markAsChanged() {
    this.hasUnsavedChanges = true;
  }

  private markAsSaved() {
    this.hasUnsavedChanges = false;
    this.originalFormValues = { ...this.accountForm.value };
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

  getUserData() { }

  updateFormWithUserData() {
    if (this.currentUserData && this.accountForm) {
      this.accountForm.patchValue({
        name: this.currentUserData.firstName || '',
        surname: this.currentUserData.Surname || '',
        email: this.currentUserData.email || '',
        phone: this.currentUserData.cellphoneNumber || '',
      });
      this.markAsSaved(); // Mark as saved since we're loading data
    }
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  opentooltip() {
    this.isTooltipOpen != this.isTooltipOpen;
  }

  saveAccountDetails() { }

  saveAll() {
    if (!this.currentUserData) {
      console.error('No user data available');
      return;
    }

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
        this.markAsSaved();
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

  async cancelSubscription() {
    if (!this.subscriptionData || !this.subscriptionData.token) {
      this.snackBar.open('No active subscription found', 'Dismiss', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Subscription',
        message: 'Are you sure you want to cancel your subscription? You will lose access to all features at the end of your current billing period.'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === true) {
        this.isCancellingSubscription = true;
        try {
          const success = await this.payfastService.cancelSubscription(
            this.subscriptionData.token,
            'User requested cancellation'
          );

          if (success) {
            // Update subscription status in Firestore
            await this.firestore
              .collection('subscriptions')
              .doc(this.subscriptionData.id)
              .update({
                status: 'cancelled',
                cancellationDate: new Date(),
                cancellationReason: 'User requested cancellation'
              });

            // Update user subscription status
            await this.firestore
              .doc(`users/${this.userDataID}`)
              .update({
                subscriptionStatus: 'cancelled',
                subscriptionPlan: 'none'
              });

            this.snackBar.open('Subscription cancelled successfully', 'Dismiss', { duration: 5000 });
            
            // Reload subscription data
            this.loadSubscriptionData();
          } else {
            this.snackBar.open('Failed to cancel subscription. Please try again or contact support.', 'Dismiss', { duration: 5000 });
          }
        } catch (error) {
          console.error('Error cancelling subscription:', error);
          this.snackBar.open('An error occurred while cancelling your subscription. Please contact support.', 'Dismiss', { duration: 5000 });
        } finally {
          this.isCancellingSubscription = false;
        }
      }
    });
  }

  upgrade() {
    //TODO
  }

  private loadSubscriptionData() {
    this.firestore
      .collection('subscriptions', ref =>
        ref.where('userId', '==', this.userDataID)
           .where('status', '==', 'active')
      )
      .get()
      .subscribe(querySnapshot => {
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data() as any;
          this.subscriptionData = {
            id: querySnapshot.docs[0].id,
            ...docData
          };
          console.log('Subscription data loaded:', this.subscriptionData);
        } else {
          this.subscriptionData = null;
          console.log('No active subscription found');
        }
      }, error => {
        console.error('Error loading subscription data:', error);
        this.subscriptionData = null;
      });
  }
}

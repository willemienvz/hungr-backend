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
import { SubscriptionService } from '../../../shared/services/subscription.service';
import { ChangeSubscriptionDialogComponent, ChangeSubscriptionData } from './change-subscription-dialog/change-subscription-dialog.component';

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
  isPausing: boolean = false;
  isResuming: boolean = false;
  isChangingSubscription: boolean = false;
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
    private snackBar: MatSnackBar,
    private subscriptionService: SubscriptionService
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

  async pauseSubscription() {
    if (!this.subscriptionData || this.subscriptionData.status !== 'active') {
      this.snackBar.open('No active subscription found', 'Dismiss', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '400px',
      data: {
        title: 'Pause Subscription',
        message: 'Are you sure you want to pause your subscription? Billing will be paused and menus will be hidden.'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === true) {
        this.isPausing = true;
        try {
          const response = await this.subscriptionService.pauseSubscription(1);
          
          if (response.success) {
            this.snackBar.open('Subscription paused successfully', 'Dismiss', { duration: 5000 });
            // Reload subscription data
            this.loadSubscriptionData();
          } else {
            this.snackBar.open(
              response.error?.message || 'Failed to pause subscription. Please try again or contact support.',
              'Dismiss',
              { duration: 5000 }
            );
          }
        } catch (error: any) {
          console.error('Error pausing subscription:', error);
          const errorMessage = error?.message || 'An error occurred while pausing your subscription. Please contact support.';
          this.snackBar.open(errorMessage, 'Dismiss', { duration: 5000 });
        } finally {
          this.isPausing = false;
        }
      }
    });
  }

  async cancelSubscription() {
    if (!this.subscriptionData || (this.subscriptionData.status !== 'active' && this.subscriptionData.status !== 'paused')) {
      this.snackBar.open('No active or paused subscription found', 'Dismiss', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Subscription',
        message: 'Are you sure you want to cancel your subscription? This will permanently end your subscription and stop all future billing. You will lose access to all features immediately.'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === true) {
        this.isCancellingSubscription = true;
        try {
          const response = await this.subscriptionService.cancelSubscription();

          if (response.success) {
            this.snackBar.open('Subscription cancelled successfully', 'Dismiss', { duration: 5000 });
            // Reload subscription data
            this.loadSubscriptionData();
          } else {
            this.snackBar.open(
              response.error?.message || 'Failed to cancel subscription. Please try again or contact support.',
              'Dismiss',
              { duration: 5000 }
            );
          }
        } catch (error: any) {
          console.error('Error cancelling subscription:', error);
          const errorMessage = error?.message || 'An error occurred while cancelling your subscription. Please contact support.';
          this.snackBar.open(errorMessage, 'Dismiss', { duration: 5000 });
        } finally {
          this.isCancellingSubscription = false;
        }
      }
    });
  }

  async resumeSubscription() {
    if (!this.subscriptionData || this.subscriptionData.status !== 'paused') {
      this.snackBar.open('No paused subscription found', 'Dismiss', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
      width: '400px',
      data: {
        title: 'Resume Subscription',
        message: 'Are you sure you want to resume your subscription? Billing will resume and menus will become visible again.'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === true) {
        this.isResuming = true;
        try {
          const response = await this.subscriptionService.unpauseSubscription();
          
          if (response.success) {
            this.snackBar.open('Subscription resumed successfully', 'Dismiss', { duration: 5000 });
            // Reload subscription data
            this.loadSubscriptionData();
          } else {
            this.snackBar.open(
              response.error?.message || 'Failed to resume subscription. Please try again or contact support.',
              'Dismiss',
              { duration: 5000 }
            );
          }
        } catch (error: any) {
          console.error('Error resuming subscription:', error);
          const errorMessage = error?.message || 'An error occurred while resuming your subscription. Please contact support.';
          this.snackBar.open(errorMessage, 'Dismiss', { duration: 5000 });
        } finally {
          this.isResuming = false;
        }
      }
    });
  }

  async changeSubscription() {
    if (!this.subscriptionData || this.subscriptionData.status !== 'active') {
      this.snackBar.open('No active subscription found', 'Dismiss', { duration: 5000 });
      return;
    }

    // Prepare current subscription data for the dialog
    const dialogData: ChangeSubscriptionData = {
      currentAmount: this.subscriptionData.recurringAmount || this.subscriptionData.amount || 99900,
      currentFrequency: this.subscriptionData.frequency ? parseInt(this.subscriptionData.frequency) : 3,
      currentCycles: this.subscriptionData.cycles ? parseInt(this.subscriptionData.cycles) : 0,
      currentBillingDate: this.subscriptionData.nextBillingDate 
        ? (this.subscriptionData.nextBillingDate.toDate ? this.subscriptionData.nextBillingDate.toDate().toISOString().split('T')[0] : this.subscriptionData.nextBillingDate)
        : undefined
    };

    const dialogRef = this.dialog.open(ChangeSubscriptionDialogComponent, {
      width: '600px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        // User submitted the form with changes
        this.isChangingSubscription = true;
        try {
          const response = await this.subscriptionService.updateSubscription(result);
          
          if (response.success) {
            const updatedFields = response.data?.updatedFields || [];
            this.snackBar.open(
              `Subscription updated successfully. Changed: ${updatedFields.join(', ')}`,
              'Dismiss',
              { duration: 5000 }
            );
            // Reload subscription data
            this.loadSubscriptionData();
          } else {
            this.snackBar.open(
              response.error?.message || 'Failed to update subscription. Please try again or contact support.',
              'Dismiss',
              { duration: 5000 }
            );
          }
        } catch (error: any) {
          console.error('Error updating subscription:', error);
          const errorMessage = error?.message || 'An error occurred while updating your subscription. Please contact support.';
          this.snackBar.open(errorMessage, 'Dismiss', { duration: 5000 });
        } finally {
          this.isChangingSubscription = false;
        }
      }
      // If result is null/undefined, user cancelled - no action needed
    });
  }

  upgrade() {
    //TODO
  }

  private loadSubscriptionData() {
    // Load subscription data (active, paused, or cancelled)
    this.firestore
      .collection('subscriptions', ref =>
        ref.where('userId', '==', this.userDataID)
           .orderBy('updated_at', 'desc')
           .limit(1)
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
          // Fallback: check user document for subscription status
          this.firestore
            .doc(`users/${this.userDataID}`)
            .get()
            .subscribe(userDoc => {
              const userData = userDoc.data() as any;
              if (userData?.subscriptionStatus) {
                this.subscriptionData = {
                  status: userData.subscriptionStatus,
                  token: userData.payfastToken
                };
              } else {
                this.subscriptionData = null;
              }
            });
        }
      }, error => {
        console.error('Error loading subscription data:', error);
        this.subscriptionData = null;
      });
  }

  getFieldError(fieldName: string): string {
    const field = this.accountForm.get(fieldName);
    if (field && field.invalid && (field.touched || field.dirty)) {
      if (field.hasError('required')) {
        return `${this.getFieldLabel(fieldName)} is required.`;
      }
      if (field.hasError('email')) {
        return 'Enter a valid email address.';
      }
      if (field.hasError('minlength')) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors?.['minlength'].requiredLength} characters long.`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'name': 'First name',
      'surname': 'Surname',
      'email': 'Email',
      'phone': 'Phone number',
      'password': 'Password',
      'cardHolderName': 'Card Holder Name',
      'cardNumber': 'Card number',
      'cvv': 'CVV',
      'expiryDate': 'Expiry Date'
    };
    return labels[fieldName] || fieldName;
  }
}

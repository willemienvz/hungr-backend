import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { PayFastService } from '../../shared/services/payfast.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  isSaving: boolean = false;
  isResending: boolean = false;
  userEmail: string = '';

  constructor(
    public authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly auth: AngularFireAuth,
    private readonly firestore: AngularFirestore,
    private readonly payfastService: PayFastService
  ) {}

  ngOnInit() {
    // Check for dev mode query parameter
    const isDevMode = this.route.snapshot.queryParamMap.get('dev') === 'true';

    // Get stored form data
    const formDataString = localStorage.getItem('formData');
    if (!formDataString) {
      if (!isDevMode) {
        this.toastr.error('No registration data found');
        this.router.navigate(['/register-user/step1']);
        return;
      } else {
        // In dev mode, show a message but don't redirect
        this.toastr.info('Dev mode: No registration data found, but continuing anyway');
        return;
      }
    }

    const formData = JSON.parse(formDataString);
    this.userEmail = formData.userEmail; // Store email for template

    // Create user account
    this.createUserAccount(formData);

    // Notify payment success
    this.payfastService.notifyPaymentSuccess();
  }

  private async createUserAccount(formData: any) {
    try {
      // Check if user already exists in Firestore (created by ITN)
      const existingUser = await this.authService.getUserByEmail(formData.userEmail);
      
      if (existingUser) {
        // User exists in Firestore (created by ITN), create Firebase Auth account
        const userCredential = await this.auth.createUserWithEmailAndPassword(
          formData.userEmail,
          formData.password
        );

        if (userCredential.user) {
          const authUid = userCredential.user.uid;
          
          // CRITICAL: Get the existing user document to preserve data (especially payfastToken)
          const existingUserQuery = await this.firestore.collection('users', ref => 
            ref.where('email', '==', formData.userEmail)
          ).get().toPromise();
          
          if (existingUserQuery && !existingUserQuery.empty) {
            const existingDoc = existingUserQuery.docs[0];
            const existingDocId = existingDoc.id;
            const existingData = existingDoc.data();
            
            // If document ID doesn't match Auth UID, we need to migrate
            if (existingDocId !== authUid) {
              console.log(`Migrating user from ${existingDocId} to ${authUid}`);
              this.toastr.info('Merging account data...');
              
              // 1. Create new document with Auth UID, preserving all existing data including payfastToken
              const userRef = this.firestore.doc(`users/${authUid}`);
              await userRef.set({
                ...existingData, // Preserve all existing data including payfastToken, subscriptionStatus, etc.
                uid: authUid,
                emailVerified: userCredential.user.emailVerified,
                // Merge form data (form data takes precedence for these fields)
                firstName: formData.firstName || existingData['firstName'],
                Surname: formData.lastName || existingData['lastName'],
                cellphoneNumber: formData.cellphone || existingData['phoneNumber'] || existingData['cellphoneNumber'],
                marketingConsent: formData.receiveMarketingInfo !== undefined ? formData.receiveMarketingInfo : existingData['marketingConsent'],
                tipsTutorials: formData.receiveMarketingInfo !== undefined ? formData.receiveMarketingInfo : existingData['tipsTutorials'],
                userInsights: formData.receiveMarketingInfo !== undefined ? formData.receiveMarketingInfo : existingData['userInsights'],
                subscriptionType: formData.billingOption || existingData['subscriptionPlan'] || existingData['subscriptionType'],
                accountType: existingData['accountType'] || 'admin',
                parentId: existingData['parentId'] || '',
                aboutUsDisplayed: existingData['aboutUsDisplayed'] || false,
                updated_at: new Date()
              }, { merge: true });
              
              console.log('User document created/updated with preserved data including payfastToken:', existingData['payfastToken'] ? 'YES' : 'NO');
              
              // 2. Update all subscriptions to use new userId
              const subscriptionsQuery = await this.firestore.collection('subscriptions', ref =>
                ref.where('userId', '==', existingDocId)
              ).get().toPromise();
              
              if (subscriptionsQuery && !subscriptionsQuery.empty) {
                const batch = this.firestore.firestore.batch();
                subscriptionsQuery.docs.forEach(doc => {
                  batch.update(doc.ref, { userId: authUid });
                  console.log(`Updating subscription ${doc.id} to use userId ${authUid}`);
                });
                await batch.commit();
                console.log(`Updated ${subscriptionsQuery.docs.length} subscription(s) to use new userId`);
                this.toastr.success(`Migrated ${subscriptionsQuery.docs.length} subscription(s)`);
              }
              
              // 3. Optionally delete old user document (or keep as backup)
              // For now, we'll keep it as a backup and log a warning
              console.log(`WARNING: Old user document ${existingDocId} still exists. Consider deleting after verification.`);
              
            } else {
              // Document ID matches Auth UID, just update it with merge
              await this.authService.SetUserData(userCredential.user, formData);
            }
          } else {
            // Should not happen, but fallback to standard flow
            console.warn('Existing user query returned empty, using standard flow');
            await this.authService.SetUserData(userCredential.user, formData);
          }
          
          // Send verification email
          await userCredential.user.sendEmailVerification();

          // Clear stored form data
          localStorage.removeItem('formData');

          this.toastr.success('Account created successfully! Please check your email for verification.');
        }
      } else {
        // Create new user account (original flow - no existing user from ITN)
        const userCredential = await this.auth.createUserWithEmailAndPassword(
          formData.userEmail,
          formData.password
        );

        if (userCredential.user) {
          // Send verification email
          await userCredential.user.sendEmailVerification();
          
          // Update user profile with additional data
          await this.authService.SetUserData(userCredential.user, formData);

          // Clear stored form data
          localStorage.removeItem('formData');

          this.toastr.success('Account created successfully! Please check your email for verification.');
        }
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      
      // Handle specific error: user already exists in Firebase Auth
      if (error.code === 'auth/email-already-in-use') {
        this.toastr.warning('This email is already registered. Please sign in instead.');
        this.router.navigate(['/sign-in']);
      } else {
        this.toastr.error(error.message || 'Failed to create account. Please contact support.');
      }
    }
  }

  async resendVerificationEmail() {
    this.isResending = true;
    try {
      const user = await this.auth.currentUser;
      if (user) {
        await user.sendEmailVerification();
        this.toastr.success('Verification email sent! Please check your inbox.');
      } else {
        this.toastr.error('No user found. Please try signing in again.');
      }
    } catch (error: any) {
      this.toastr.error(error.message || 'Error sending verification email. Please try again.');
      console.error('Error:', error);
    } finally {
      this.isResending = false;
    }
  }
}

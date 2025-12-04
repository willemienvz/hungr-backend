import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';
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
    private readonly toast: ToastService,
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
        this.toast.error('No registration data found');
        this.router.navigate(['/register-user/step1']);
        return;
      } else {
        // In dev mode, show a message but don't redirect
        this.toast.info('Dev mode: No registration data found, but continuing anyway');
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

  /**
   * Maps payment document fields to canonical schema
   * Handles field name mapping and conflict resolution
   */
  private mapPaymentFieldsToCanonical(paymentData: any, formData: any): any {
    // Map field names from payment document to canonical schema
    return {
      // User-provided fields (form data takes precedence)
      firstName: formData.firstName || paymentData.firstName,
      Surname: formData.lastName || paymentData.lastName || paymentData['Surname'],
      cellphoneNumber: formData.cellphone || paymentData.phoneNumber || paymentData.cellphoneNumber,
      marketingConsent: formData.receiveMarketingInfo !== undefined 
        ? formData.receiveMarketingInfo 
        : (paymentData.marketingConsent || false),
      tipsTutorials: formData.receiveMarketingInfo !== undefined 
        ? formData.receiveMarketingInfo 
        : (paymentData.tipsTutorials || false),
      userInsights: formData.receiveMarketingInfo !== undefined 
        ? formData.receiveMarketingInfo 
        : (paymentData.userInsights || false),
      
      // Payment/subscription fields (payment data takes precedence)
      subscriptionStatus: paymentData.subscriptionStatus || 'active',
      subscriptionType: this.mapSubscriptionPlan(
        paymentData.subscriptionPlan || paymentData.subscriptionType
      ),
      payfastToken: paymentData.payfastToken || paymentData.payfastToken, // Preserve token
      lastPaymentDate: paymentData.lastPaymentDate,
      
      // System fields
      accountType: paymentData.accountType || 'admin',
      parentId: paymentData.parentId || '',
      aboutUsDisplayed: paymentData.aboutUsDisplayed || false,
      
      // Timestamps
      created_at: paymentData.created_at || new Date(),
      updated_at: new Date()
    };
  }

  /**
   * Maps subscription plan values to canonical schema
   * 'once-off' stays 'once-off', monthly/recurring → 'digitalMenu'
   */
  private mapSubscriptionPlan(plan: string): string {
    // Map 'once-off' to 'once-off', any monthly/recurring to 'digitalMenu'
    if (plan === 'once-off') return 'once-off';
    // If it's a recurring subscription (monthly, quarterly, etc.), use 'digitalMenu'
    if (plan && plan !== 'once-off') return 'digitalMenu';
    return 'digitalMenu'; // Default for monthly subscriptions
  }

  private async createUserAccount(formData: any) {
    try {
      // Get Auth UID from localStorage (set during sign-up before payment)
      let authUid = localStorage.getItem('authUid');
      
      if (!authUid) {
        // Fallback: try to get current user
        const currentUser = await this.auth.currentUser;
        if (!currentUser) {
          throw new Error('No user found. Please complete sign-up again.');
        }
        authUid = currentUser.uid;
      }
      
      // Check if user document already exists (created before payment)
      const userRef = this.firestore.doc(`users/${authUid}`);
      const userDoc = await userRef.get().toPromise();
      
      if (!userDoc || !userDoc.exists) {
        // User document doesn't exist - create it (fallback scenario)
        const currentUser = await this.auth.currentUser;
        if (currentUser) {
          await this.authService.SetUserData(currentUser, formData);
        } else {
          throw new Error('User account not found');
        }
      }
      
      // Send verification email
      const currentUser = await this.auth.currentUser;
      if (currentUser && !currentUser.emailVerified) {
        await currentUser.sendEmailVerification();
      }
      
      // Link any subscriptions created without userId (from PayFast ITN before sign-up - edge case)
      try {
        const orphanedSubscriptions = await this.firestore.collection('subscriptions', ref =>
          ref.where('email', '==', formData.userEmail)
        ).get().toPromise();
        
        if (orphanedSubscriptions && !orphanedSubscriptions.empty) {
          const batch = this.firestore.firestore.batch();
          let linkedCount = 0;
          orphanedSubscriptions.docs.forEach(doc => {
            const subData = doc.data() as any;
            // Link subscriptions that don't have userId or have different userId
            if (!subData.userId || subData.userId !== authUid) {
              batch.update(doc.ref, { userId: authUid });
              console.log(`Linking subscription ${doc.id} to user ${authUid}`);
              linkedCount++;
            }
          });
          if (linkedCount > 0) {
            await batch.commit();
            console.log(`Linked ${linkedCount} subscription(s) to user ${authUid}`);
          }
        }
      } catch (linkError) {
        console.error('Failed to link orphaned subscriptions:', linkError);
        // Non-critical - continue
      }
      
      // Update user document with subscription data from PayFast ITN
      // PayFast ITN should have already updated the user document, but ensure it's complete
      try {
        let userSubscriptions;
        try {
          // Try with orderBy first (requires index)
          userSubscriptions = await this.firestore.collection('subscriptions', ref =>
            ref.where('userId', '==', authUid)
              .orderBy('updated_at', 'desc')
              .limit(1)
          ).get().toPromise();
        } catch (indexError: any) {
          // Index not ready - get all and sort manually
          if (indexError.code === 9 || indexError.message?.includes('index')) {
            const allSubs = await this.firestore.collection('subscriptions', ref =>
              ref.where('userId', '==', authUid)
            ).get().toPromise();
            
            if (allSubs && !allSubs.empty) {
              // Sort by updated_at manually
              const sorted = allSubs.docs.sort((a, b) => {
                const aData = a.data() as any;
                const bData = b.data() as any;
                const aTime = aData.updated_at?.toMillis?.() || 0;
                const bTime = bData.updated_at?.toMillis?.() || 0;
                return bTime - aTime;
              });
              userSubscriptions = {
                empty: false,
                docs: [sorted[0]]
              } as any;
            } else {
              userSubscriptions = { empty: true, docs: [] } as any;
            }
          } else {
            throw indexError;
          }
        }
        
        if (userSubscriptions && !userSubscriptions.empty) {
          const latestSubscription = userSubscriptions.docs[0].data();
          await userRef.update({
            subscriptionStatus: latestSubscription.status || 'active',
            subscriptionPlan: latestSubscription.plan || formData.billingOption,
            subscriptionType: latestSubscription.plan || formData.billingOption,
            payfastToken: latestSubscription.token || null,
            lastPaymentDate: latestSubscription.updated_at || null,
            emailVerified: currentUser?.emailVerified || false,
            updated_at: new Date()
          });
          console.log('User document updated with subscription data');
        }
      } catch (updateError) {
        console.error('Failed to update user with subscription data:', updateError);
        // Non-critical - PayFast ITN should have already updated it
      }
      
      // Clear stored form data
      localStorage.removeItem('formData');
      localStorage.removeItem('authUid');
      
      this.toast.success('Account created successfully! Please check your email for verification.');
    } catch (error: any) {
      console.error('Error in verify-email:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        this.toast.warning('This email is already registered. Please sign in instead.');
        this.router.navigate(['/sign-in']);
      } else {
        this.toast.error(error.message || 'Failed to complete account setup. Please contact support.');
      }
    }
  }

  async resendVerificationEmail() {
    this.isResending = true;
    try {
      const user = await this.auth.currentUser;
      if (user) {
        await user.sendEmailVerification();
        this.toast.success('Verification email sent! Please check your inbox.');
      } else {
        this.toast.error('No user found. Please try signing in again.');
      }
    } catch (error: any) {
      this.toast.error(error.message || 'Error sending verification email. Please try again.');
      console.error('Error:', error);
    } finally {
      this.isResending = false;
    }
  }
}

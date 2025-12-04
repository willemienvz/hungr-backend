# Quickstart: Fix Duplicate User Documents in Sign-Up

**Feature**: Fix Duplicate User Documents in Sign-Up  
**Date**: 2025-01-20

## Overview

This guide helps developers quickly understand and implement the fix for duplicate user document creation during sign-up. The feature merges payment-created user documents (with random IDs) with sign-up-created documents (with Auth UIDs), preserves all payment data including payfastToken, maps field names correctly, and ensures monthly subscriptions use 'digitalMenu' instead of 'once-off'.

## Prerequisites

- Firebase CLI installed and authenticated
- Node.js 20+ installed
- Angular 17+ development environment
- Access to Firebase project: `hungr-firebase`
- Understanding of existing sign-up flow (`verify-email.component.ts`)
- Understanding of PayFast ITN handler (`functions/src/payfastItn.ts`)
- Understanding of Auth service (`auth.service.ts`)

## Architecture Overview

```
User Registration Flow:
1. User completes payment → PayFast ITN creates user document (random ID)
   └─→ payfastItn.ts: updateUserSubscription()
       └─→ Creates/updates user document with:
           - Random document ID (via .add())
           - paymentData: lastName, phoneNumber, subscriptionPlan
           - payfastToken: SAVED (fix)
           - subscriptionPlan: 'digitalMenu' for monthly (fix)

2. User verifies email → Email verification creates user document (Auth UID)
   └─→ verify-email.component.ts: createUserAccount()
       └─→ Checks for existing user by email
           └─→ If found (payment document exists):
               ├─→ Merge payment document into Auth UID document
               ├─→ Map fields: lastName→Surname, phoneNumber→cellphoneNumber
               ├─→ Map subscriptionPlan→subscriptionType ('digitalMenu' for monthly)
               ├─→ Preserve payfastToken
               ├─→ Update subscriptions to use Auth UID
               └─→ Keep old document (optional delete)
           └─→ If not found:
               └─→ Create new Auth UID document normally

Result: Single unified user document with Auth UID as document ID
```

## Implementation Steps

### Step 1: Fix PayFast ITN Handler (payfastItn.ts)

Update `updateUserSubscription()` to save payfastToken and use correct plan values:

**File**: `functions/src/payfastItn.ts`

```typescript
// In updateUserSubscription() function
// Around line 454-464: When creating new user document

const newUserData = {
  email: itnData.email_address,
  firstName: itnData.name_first,
  lastName: itnData.name_last,
  phoneNumber: itnData.cell_number || '',
  subscriptionStatus: 'active',
  subscriptionPlan: userPlanName, // Will be mapped later, but set correctly here
  payfastToken: itnData.token || itnData.tokenisation, // FIX: Save token here
  lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
  created_at: admin.firestore.FieldValue.serverTimestamp(),
  updated_at: admin.firestore.FieldValue.serverTimestamp()
};

// Around line 614-620: When updating existing user document
const tokenToSave = itnData.token || itnData.tokenisation;
await db.collection('users').doc(userId).update({
  subscriptionStatus: 'active',
  subscriptionPlan: planName, // Use the same planName determined above
  subscriptionType: planName, // FIX: Also set subscriptionType for consistency
  payfastToken: tokenToSave, // FIX: Ensure token is saved
  lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
  updated_at: admin.firestore.FieldValue.serverTimestamp()
});

// Around line 420-452: Fix plan name determination
// Determine if recurring subscription
const hasToken = !!(itnData.token || itnData.tokenisation);
const hasSubscriptionType = itnData.subscription_type === '1';
const hasRecurringAmount = !!itnData.recurring_amount;
const isRecurring = hasSubscriptionType || hasRecurringAmount || hasToken;

// Determine plan name
let userPlanName = 'once-off';
if (isRecurring) {
  // For monthly subscriptions (sign-ups), use 'digitalMenu'
  if (itnData.frequency === '3') {
    userPlanName = 'digitalMenu'; // FIX: Monthly recurring subscription
  } else if (itnData.frequency) {
    // Other frequencies could map to other plan names if needed
    userPlanName = 'digitalMenu'; // Default to digitalMenu for recurring
  } else {
    userPlanName = 'digitalMenu'; // If recurring but no frequency, default to monthly
  }
} else {
  userPlanName = 'once-off'; // One-time payment
}
```

### Step 2: Update Email Verification Component (verify-email.component.ts)

Update `createUserAccount()` to check for existing payment documents and merge them:

**File**: `src/app/components/verify-email/verify-email.component.ts`

```typescript
// Add field mapping helper function
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

// Add subscription plan mapping helper
private mapSubscriptionPlan(plan: string): string {
  // Map 'once-off' to 'once-off', any monthly/recurring to 'digitalMenu'
  if (plan === 'once-off') return 'once-off';
  // If it's a recurring subscription (monthly, quarterly, etc.), use 'digitalMenu'
  if (plan && plan !== 'once-off') return 'digitalMenu';
  return 'digitalMenu'; // Default for monthly subscriptions
}

// Update createUserAccount() method around line 57-178
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
          const existingData = (existingDoc.data() || {}) as Record<string, any>;
          
          // If document ID doesn't match Auth UID, we need to migrate
          if (existingDocId !== authUid) {
            console.log(`Migrating user from ${existingDocId} to ${authUid}`);
            this.toastr.info('Merging account data...');
            
            // 1. Map payment fields to canonical schema
            const mappedData = this.mapPaymentFieldsToCanonical(existingData, formData);
            
            // 2. Create new document with Auth UID, preserving all existing data
            const userRef = this.firestore.doc(`users/${authUid}`);
            await userRef.set({
              ...existingData, // Preserve all existing data including payfastToken
              ...mappedData, // Apply mapped fields (form data takes precedence for user fields)
              uid: authUid,
              emailVerified: userCredential.user.emailVerified,
              updated_at: new Date()
            }, { merge: true });
            
            console.log('User document created/updated with preserved data including payfastToken:', 
              existingData['payfastToken'] ? 'YES' : 'NO');
            
            // 3. Update all subscriptions to use new userId
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
            
            // 4. Optionally delete old user document (or keep as backup)
            // For now, we'll keep it as a backup and log a warning
            console.log(`WARNING: Old user document ${existingDocId} still exists. Consider deleting after verification.`);
            
          } else {
            // Document ID matches Auth UID, just update it with merge
            const mappedData = this.mapPaymentFieldsToCanonical(existingData, formData);
            await userRef.set({
              ...existingData,
              ...mappedData,
              uid: authUid,
              emailVerified: userCredential.user.emailVerified,
              updated_at: new Date()
            }, { merge: true });
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
```

### Step 3: Update Auth Service (Optional - for consistency)

Update `SetUserData()` to handle field mapping if needed:

**File**: `src/app/shared/services/auth.service.ts`

```typescript
// In SetUserData() method around line 257-285
SetUserData(user: any, formData: any) {
  const userRef: AngularFirestoreDocument<any> = this.afs.doc(
    `users/${user.uid}`
  );

  const userData: User = {
    uid: user.uid,
    firstName: formData.firstName,
    Surname: formData.lastName, // FIX: Use canonical field name
    email: formData.userEmail,
    cellphoneNumber: formData.cellphone, // FIX: Use canonical field name
    emailVerified: user.emailVerified,
    marketingConsent: formData.receiveMarketingInfo,
    tipsTutorials: formData.receiveMarketingInfo,
    userInsights: formData.receiveMarketingInfo,
    aboutUsDisplayed: false,
    cardHolderName: '',
    cardNumber: '',
    cvv: 0,
    expiryDate: '',
    accountType: 'admin',
    subscriptionType: formData.billingOption, // FIX: Use canonical field name
    parentId: '',
  };
  
  return userRef.set(userData, {
    merge: true, // FIX: Use merge to preserve existing fields like payfastToken
  });
}
```

### Step 4: Test Locally

1. **Test Payment Flow**:
   ```bash
   # Start Firebase emulators
   firebase emulators:start --only functions
   
   # Trigger PayFast ITN (simulated)
   curl -X POST http://localhost:5001/hungr-firebase/us-central1/payfastItn \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "email_address=test@example.com&name_first=Test&name_last=User&token=test_token123&subscription_type=1&frequency=3&..."
   ```

2. **Test Sign-up Flow**:
   ```bash
   # Start Angular dev server
   ng serve
   
   # Complete sign-up flow:
   # 1. Go to registration page
   # 2. Fill out form with same email as payment
   # 3. Complete payment
   # 4. Verify email
   # 5. Check Firestore: Should see single user document with Auth UID
   ```

3. **Verify in Firestore Console**:
   - Check `users` collection: Should see single document per email with Auth UID as document ID
   - Check document fields: Should have payfastToken, subscriptionType: 'digitalMenu' for monthly
   - Check `subscriptions` collection: Should reference Auth UID, not random ID

### Step 5: Deploy

```bash
# Build and deploy Firebase Functions
cd functions
npm run build
firebase deploy --only functions:payfastItn

# Build and deploy Angular app
npm run build
firebase deploy --only hosting
```

## Key Files to Modify

1. **functions/src/payfastItn.ts**
   - Save payfastToken when creating/updating user documents
   - Set subscriptionPlan/subscriptionType to 'digitalMenu' for monthly subscriptions
   - Also set subscriptionType field for consistency

2. **src/app/components/verify-email/verify-email.component.ts**
   - Add field mapping helper functions
   - Update createUserAccount() to check for existing payment documents
   - Merge payment documents into Auth UID documents
   - Update subscription references to use Auth UID

3. **src/app/shared/services/auth.service.ts** (Optional)
   - Use merge: true in SetUserData() to preserve existing fields
   - Ensure canonical field names are used

## Testing Checklist

- [ ] Payment ITN creates user document with payfastToken saved
- [ ] Payment ITN sets subscriptionPlan to 'digitalMenu' for monthly subscriptions
- [ ] Email verification finds existing payment document by email
- [ ] Email verification merges payment document into Auth UID document
- [ ] Field mapping works correctly (lastName→Surname, phoneNumber→cellphoneNumber)
- [ ] Subscription plan mapping works ('once-off' stays 'once-off', monthly→'digitalMenu')
- [ ] payfastToken is preserved during merge
- [ ] Subscriptions are updated to use Auth UID
- [ ] Only one user document exists per email after merge
- [ ] Old random ID document is kept as backup (or deleted after verification)
- [ ] Sign-up without payment creates single Auth UID document normally

## Common Issues

**Issue**: payfastToken not saved on user document  
**Solution**: Ensure payfastItn.ts saves token in both create and update paths

**Issue**: Subscription plan still 'once-off' for monthly subscriptions  
**Solution**: Check plan determination logic in payfastItn.ts - ensure isRecurring check is correct

**Issue**: Field mapping not working (still using lastName instead of Surname)  
**Solution**: Ensure mapPaymentFieldsToCanonical() is called and merged correctly

**Issue**: Duplicate documents still created  
**Solution**: Verify email-based query in verify-email component is working correctly

**Issue**: Subscriptions not updated to use Auth UID  
**Solution**: Check batch write in verify-email component - ensure userId field is updated correctly

## Next Steps

After implementation:
1. Monitor Firestore for duplicate documents (should see zero after fix)
2. Verify payfastToken is present on all active subscription user documents
3. Verify subscriptionType is 'digitalMenu' for all monthly subscriptions
4. Consider cleanup script to migrate existing duplicate documents (separate task)
5. Monitor subscription references to ensure they point to Auth UID documents




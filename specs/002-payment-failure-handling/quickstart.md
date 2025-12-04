# Quickstart: Enhanced Payment Failure Handling

**Feature**: Enhanced Payment Failure Handling for Subscriptions  
**Date**: 2024-12-20

## Overview

This guide helps developers quickly understand and implement the enhanced payment failure handling feature. The feature extends the existing PayFast ITN handler to track consecutive failures, implement a grace period, send email notifications, and flag subscriptions for manual review.

## Prerequisites

- Firebase CLI installed and authenticated
- Node.js 20+ installed
- Access to Firebase project: `hungr-firebase`
- Understanding of existing PayFast ITN handler (`functions/src/payfastItn.ts`)
- Access to AWS Lambda email service endpoint

## Architecture Overview

```
PayFast ITN Webhook
    ↓
payfastItn() [HTTP Handler]
    ↓
processPayment() [Main Processing]
    ├─→ Handle PENDING/PROCESSING (log only)
    ├─→ Handle COMPLETE (activate, reset counter)
    ├─→ Handle FAILED (track failures, apply grace period)
    └─→ Handle CANCELLED (cancel subscription)
         ↓
    handleSubscriptionFailure() [Enhanced Failure Handler]
         ├─→ Increment consecutiveFailures counter
         ├─→ Apply grace period logic (1-2 failures)
         ├─→ Flag for manual review (at 2 failures)
         ├─→ Cancel subscription (at 3 failures)
         └─→ sendPaymentFailureEmail() [Email Notifications]
              ↓
         AWS Lambda Email Service → Brevo → User
```

## Implementation Steps

### Step 1: Update Subscription Data Model

Add new fields to subscription documents:

```typescript
// In functions/src/payfastItn.ts or subscription utils
interface SubscriptionUpdate {
  consecutiveFailures: number; // Default: 0
  needsManualReview: boolean; // Default: false
  manualReviewReason?: string;
  manualReviewFlaggedAt?: Timestamp;
  // ... existing fields
}
```

**Migration**: Existing subscriptions will default these fields to:
- `consecutiveFailures`: 0 (or current count if known)
- `needsManualReview`: false
- `manualReviewReason`: undefined

### Step 2: Enhance Payment Status Handling

Update `processPayment()` in `payfastItn.ts`:

```typescript
// Handle all payment statuses
if (itnData.payment_status === 'COMPLETE') {
  await updateUserSubscription(itnData);
}

if (itnData.payment_status === 'CANCELLED' && itnData.token) {
  await handleSubscriptionCancellation(itnData);
}

// ENHANCED: Handle all statuses, not just FAILED
if (itnData.payment_status === 'FAILED' && itnData.token) {
  await handleSubscriptionFailure(itnData);
}

// NEW: Log PENDING/PROCESSING statuses (no subscription changes)
if (itnData.payment_status === 'PENDING' || itnData.payment_status === 'PROCESSING') {
  // Transaction already logged in processPayment()
  // No subscription state changes needed
}

// NEW: Log unknown statuses for review
if (!['PENDING', 'PROCESSING', 'COMPLETE', 'FAILED', 'CANCELLED'].includes(itnData.payment_status)) {
  console.warn('Unknown payment status received:', itnData.payment_status);
  // Transaction already logged, subscription unchanged
}
```

### Step 3: Refactor handleSubscriptionFailure()

Replace existing `handleSubscriptionFailure()` with enhanced version:

```typescript
async function handleSubscriptionFailure(itnData: PayFastItnData): Promise<void> {
  const db = admin.firestore();
  
  // Find subscription by token
  const subscriptionToken = itnData.token || itnData.tokenisation;
  const subscriptionQuery = await db
    .collection('subscriptions')
    .where('token', '==', subscriptionToken)
    .get();
  
  if (subscriptionQuery.empty) {
    console.error('Subscription not found for token:', subscriptionToken);
    return; // May be one-off payment, no subscription
  }

  const subscriptionDoc = subscriptionQuery.docs[0];
  const subscriptionData = subscriptionDoc.data();
  const userId = subscriptionData.userId;
  
  // Get current consecutive failure count (default to 0)
  const currentFailures = subscriptionData.consecutiveFailures || 0;
  const newFailures = currentFailures + 1;
  
  // Prepare update object
  const updateData: any = {
    consecutiveFailures: newFailures,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Apply grace period and cancellation logic
  if (newFailures === 1) {
    // First failure: Send email, keep subscription active
    await sendPaymentFailureEmail({
      email: itnData.email_address,
      emailType: 'first_failure',
      subscriptionData: {
        subscriptionId: subscriptionDoc.id,
        userId: userId,
        plan: subscriptionData.plan,
        amount: subscriptionData.amount,
        consecutiveFailures: 1
      },
      paymentData: {
        paymentId: itnData.pf_payment_id,
        failedAt: new Date().toISOString(),
        amount: parseFloat(itnData.amount_gross),
        reason: itnData.item_description
      }
    });
    
    // Log audit
    await logFailureTracking(db, userId, subscriptionDoc.id, newFailures, 'first_failure');
    
  } else if (newFailures === 2) {
    // Second failure: Flag for manual review, send warning, keep active
    updateData.needsManualReview = true;
    updateData.manualReviewReason = `Payment failed - 2 consecutive failures (payment IDs: ${subscriptionData.lastFailurePaymentId || 'unknown'}, ${itnData.pf_payment_id})`;
    updateData.manualReviewFlaggedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await sendPaymentFailureEmail({
      email: itnData.email_address,
      emailType: 'grace_period_warning',
      subscriptionData: {
        subscriptionId: subscriptionDoc.id,
        userId: userId,
        plan: subscriptionData.plan,
        amount: subscriptionData.amount,
        consecutiveFailures: 2,
        remainingGraceAttempts: 1
      },
      paymentData: {
        paymentId: itnData.pf_payment_id,
        failedAt: new Date().toISOString(),
        amount: parseFloat(itnData.amount_gross),
        reason: itnData.item_description
      }
    });
    
    // Log audit
    await logFailureTracking(db, userId, subscriptionDoc.id, newFailures, 'grace_period_warning');
    await logManualReviewFlag(db, userId, subscriptionDoc.id, updateData.manualReviewReason);
    
  } else if (newFailures >= 3) {
    // Third failure: Cancel subscription
    updateData.status = 'cancelled';
    updateData.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
    updateData.cancellationReason = `Cancelled due to ${newFailures} consecutive payment failures`;
    
    // Update user document
    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'cancelled',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await sendPaymentFailureEmail({
      email: itnData.email_address,
      emailType: 'cancellation',
      subscriptionData: {
        subscriptionId: subscriptionDoc.id,
        userId: userId,
        plan: subscriptionData.plan,
        amount: subscriptionData.amount,
        consecutiveFailures: newFailures
      },
      paymentData: {
        paymentId: itnData.pf_payment_id,
        failedAt: new Date().toISOString(),
        amount: parseFloat(itnData.amount_gross),
        reason: itnData.item_description
      }
    });
    
    // Log audit
    await logFailureTracking(db, userId, subscriptionDoc.id, newFailures, 'cancellation');
    await logCancellation(db, userId, subscriptionDoc.id, updateData.cancellationReason);
  }
  
  // Update subscription document
  await subscriptionDoc.ref.update(updateData);
}
```

### Step 4: Create sendPaymentFailureEmail Function

Create new file `functions/src/sendPaymentFailureEmail.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const EMAIL_SERVICE_URL = 'https://2xajnvt3eg.execute-api.us-east-1.amazonaws.com/default/sendEmail';

export const sendPaymentFailureEmail = async (data: {
  email: string;
  emailType: 'first_failure' | 'grace_period_warning' | 'cancellation';
  subscriptionData: any;
  paymentData: any;
}): Promise<{ success: boolean; error?: any }> => {
  try {
    // Get user data for personalization
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(data.subscriptionData.userId)
      .get();
    
    const userData = userDoc.data();
    
    // Determine template ID based on email type
    const templateMap = {
      'first_failure': 'payment-failure-first',
      'grace_period_warning': 'payment-failure-warning',
      'cancellation': 'payment-cancellation'
    };
    
    const emailPayload = {
      to: data.email,
      subject: getEmailSubject(data.emailType, data.subscriptionData),
      templateId: templateMap[data.emailType],
      templateData: {
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        subscriptionPlan: data.subscriptionData.plan,
        amount: data.subscriptionData.amount,
        paymentId: data.paymentData.paymentId,
        failedAt: data.paymentData.failedAt,
        consecutiveFailures: data.subscriptionData.consecutiveFailures,
        remainingGraceAttempts: data.subscriptionData.remainingGraceAttempts || 0,
        supportEmail: 'support@hungr.com',
        appName: 'Hungr',
        logoUrl: 'https://your-domain.com/assets/images/logo.png'
      }
    };
    
    // Call AWS Lambda email service
    const response = await fetch(EMAIL_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });
    
    if (!response.ok) {
      throw new Error(`Email service returned ${response.status}`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Failed to send payment failure email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

function getEmailSubject(
  emailType: string,
  subscriptionData: any
): string {
  switch (emailType) {
    case 'first_failure':
      return 'Payment Failed - Action Required';
    case 'grace_period_warning':
      return `Payment Failed Again - ${subscriptionData.remainingGraceAttempts} Attempt${subscriptionData.remainingGraceAttempts !== 1 ? 's' : ''} Remaining`;
    case 'cancellation':
      return 'Subscription Cancelled - Payment Failed';
    default:
      return 'Payment Failed - Action Required';
  }
}
```

### Step 5: Add Success Payment Handler

Update `updateUserSubscription()` to reset failure counter on successful payment:

```typescript
// In updateUserSubscription() function
// After subscription is activated

// Reset consecutive failures counter on successful payment
await subscriptionDoc.ref.update({
  consecutiveFailures: 0,
  needsManualReview: false,
  manualReviewReason: admin.firestore.FieldValue.delete(),
  manualReviewFlaggedAt: admin.firestore.FieldValue.delete(),
  updated_at: admin.firestore.FieldValue.serverTimestamp()
});

// Log counter reset
await db.collection('audit_logs').add({
  type: 'subscription_management',
  action: 'failure_counter_reset',
  userId: userId,
  subscriptionId: subscriptionDoc.id,
  result: 'success',
  source: 'payfast_itn',
  metadata: {
    payment_id: itnData.pf_payment_id,
    reason: 'Payment succeeded - counter reset'
  },
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  createdAt: new Date().toISOString()
});
```

### Step 6: Create Email Templates

Create email templates in `email-templates/`:

1. `payment-failure-first.html` - First failure notification
2. `payment-failure-warning.html` - Grace period warning
3. `payment-cancellation.html` - Cancellation notification

See existing email templates for structure. Use Brevo template variables documented in `email-templates/README.md`.

### Step 7: Test Locally

```bash
cd functions
npm run build
firebase emulators:start --only functions
```

Test with PayFast ITN simulator or curl:

```bash
curl -X POST http://localhost:5001/hungr-firebase/us-central1/payfastItn \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "m_payment_id=test123&pf_payment_id=test456&payment_status=FAILED&amount_gross=999.00&token=test_token&..."
```

### Step 8: Deploy

```bash
cd functions
npm run build
firebase deploy --only functions:payfastItn
```

## Key Files to Modify

1. **functions/src/payfastItn.ts**
   - Enhance `processPayment()` to handle all statuses
   - Refactor `handleSubscriptionFailure()` with new logic
   - Update `updateUserSubscription()` to reset failure counter

2. **functions/src/sendPaymentFailureEmail.ts** (NEW)
   - Create email notification function

3. **functions/src/index.ts**
   - Export new functions if needed (email function may be internal only)

4. **email-templates/** (NEW)
   - Create payment failure email templates

## Testing Checklist

- [ ] PENDING status logged, subscription unchanged
- [ ] PROCESSING status logged, subscription unchanged
- [ ] COMPLETE status resets failure counter
- [ ] First failure increments counter, email sent, subscription active
- [ ] Second failure flags for review, warning email sent, subscription active
- [ ] Third failure cancels subscription, cancellation email sent
- [ ] Email failures don't block payment processing
- [ ] Duplicate notifications handled correctly
- [ ] Unknown statuses logged with warning

## Common Issues

**Issue**: Email service returns 403/401  
**Solution**: Verify AWS Lambda endpoint URL and authentication

**Issue**: Subscription not found error  
**Solution**: May be one-off payment (no subscription). Log and continue.

**Issue**: Counter not resetting on success  
**Solution**: Ensure `updateUserSubscription()` updates counter field

## Next Steps

After implementation:
1. Monitor audit logs for payment failures
2. Set up alerts for subscriptions flagged for manual review
3. Create support dashboard to view flagged subscriptions (future enhancement)
4. Consider analytics dashboard for failure patterns (future enhancement)




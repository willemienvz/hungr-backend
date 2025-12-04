# Research: Fix Duplicate User Documents in Sign-Up

**Feature**: 003-fix-duplicate-user-docs  
**Date**: 2025-01-20  
**Purpose**: Research document merging strategies, field mapping patterns, and race condition handling for fixing duplicate user document creation during sign-up.

## Research Questions

1. How to merge Firestore documents with different schemas while preserving all data?
2. How to handle field name mapping (e.g., lastName → Surname, subscriptionPlan → subscriptionType)?
3. How to handle race conditions when payment ITN and email verification happen simultaneously?
4. How to atomically update related documents (subscriptions, transactions) during migration?
5. What is the best practice for ensuring payfastToken is saved on user document during payment processing?

## Findings

### 1. Firestore Document Merging Strategy

**Decision**: Use `set()` with `merge: true` option to preserve existing fields while updating with new data.

**Rationale**:
- Firestore's `set()` with `merge: true` is the standard way to update documents while preserving existing fields
- This allows us to merge payment-created document data with sign-up form data
- We can explicitly specify which fields to take from which source in case of conflicts

**Alternatives considered**:
- Using `update()`: Rejected because it fails if document doesn't exist, requiring existence check first
- Manual field-by-field merge: Rejected because it's error-prone and doesn't handle nested objects well
- Transaction with explicit field copying: Considered but rejected for simplicity - merge:true handles most cases

**Implementation Pattern**:
```typescript
// Get existing payment document
const existingDoc = await firestore.collection('users')
  .where('email', '==', email)
  .get();

if (!existingDoc.empty && existingDoc.docs[0].id !== authUid) {
  const existingData = existingDoc.docs[0].data();
  
  // Merge with conflict resolution
  await firestore.doc(`users/${authUid}`).set({
    ...existingData, // Preserve all existing fields
    uid: authUid, // Override with Auth UID
    // Explicitly merge form data for user-provided fields
    firstName: formData.firstName || existingData.firstName,
    Surname: formData.lastName || existingData.lastName,
    // Payment data takes precedence for subscription fields
    subscriptionStatus: existingData.subscriptionStatus || 'active',
    payfastToken: existingData.payfastToken || formData.token,
    subscriptionType: existingData.subscriptionPlan === 'once-off' 
      ? 'once-off' 
      : (existingData.subscriptionPlan || 'digitalMenu'),
  }, { merge: true });
}
```

### 2. Field Name Mapping Strategy

**Decision**: Use a mapping function that normalizes field names to the canonical schema during merge operations.

**Rationale**:
- Payment documents use: `lastName`, `subscriptionPlan`, `phoneNumber`
- Sign-up documents use: `Surname`, `subscriptionType`, `cellphoneNumber`
- We need a canonical schema (using sign-up schema as base) and map payment document fields during merge

**Canonical Schema** (matches sign-up flow):
- `firstName` (both use same)
- `Surname` (map from `lastName` in payment docs)
- `cellphoneNumber` (map from `phoneNumber` in payment docs)
- `subscriptionType` (map from `subscriptionPlan` in payment docs, but also handle value mapping: 'once-off' → 'once-off', monthly → 'digitalMenu')
- `payfastToken` (new field, must be preserved from payment or subscriptions)
- `subscriptionStatus` (preserve from payment)
- `email`, `emailVerified`, `accountType`, `uid`, `created_at`, `updated_at`

**Implementation Pattern**:
```typescript
function mapPaymentFieldsToCanonical(paymentData: any): any {
  return {
    // Map field names
    Surname: paymentData.lastName || paymentData.Surname,
    cellphoneNumber: paymentData.phoneNumber || paymentData.cellphoneNumber,
    subscriptionType: mapSubscriptionPlan(paymentData.subscriptionPlan || paymentData.subscriptionType),
    // Preserve other fields
    firstName: paymentData.firstName,
    email: paymentData.email,
    subscriptionStatus: paymentData.subscriptionStatus,
    payfastToken: paymentData.payfastToken,
    lastPaymentDate: paymentData.lastPaymentDate,
    created_at: paymentData.created_at,
    updated_at: paymentData.updated_at,
  };
}

function mapSubscriptionPlan(plan: string): string {
  // Map 'once-off' to 'once-off', any monthly/recurring to 'digitalMenu'
  if (plan === 'once-off') return 'once-off';
  // If it's a recurring subscription (monthly, quarterly, etc.), use 'digitalMenu'
  if (plan && plan !== 'once-off') return 'digitalMenu';
  return 'digitalMenu'; // Default for monthly subscriptions
}
```

**Alternatives considered**:
- Migrate all documents to payment schema: Rejected because sign-up schema is more established and has more fields
- Support both schemas: Rejected because it causes confusion and inconsistency
- Create a separate migration script: Rejected - should be fixed at creation time, not via migration

### 3. Race Condition Handling

**Decision**: Use email-based query to check for existing documents before creating new ones, with retry logic for concurrent operations.

**Rationale**:
- Both PayFast ITN and email verification can happen simultaneously
- We need to check for existing documents by email before creating new ones
- If both processes try to create a document at the same time, one will succeed and one should merge

**Implementation Pattern**:
```typescript
// In verify-email component (email verification flow)
async createUserAccount(formData: any) {
  // 1. Check for existing user by email (created by ITN or previous attempt)
  const existingUser = await this.authService.getUserByEmail(formData.userEmail);
  
  if (existingUser) {
    // User exists - merge instead of create
    // ... merge logic
  } else {
    // No existing user - create new
    // ... create logic
  }
}

// In payfastItn.ts (payment flow)
async updateUserSubscription(itnData: PayFastItnData) {
  // Find user by email
  const userQuery = await db.collection('users')
    .where('email', '==', itnData.email_address)
    .get();
  
  if (userQuery.empty) {
    // Create new user document
    // But if Auth UID is available, use that as document ID
    // Otherwise use random ID (will be migrated later)
  } else {
    // Update existing user document
    // Ensure payfastToken is saved
  }
}
```

**Race condition scenarios**:
1. Payment ITN arrives before email verification: Payment creates random ID document → Email verification finds it → Merges to Auth UID
2. Email verification happens before payment ITN: Email verification creates Auth UID document → Payment ITN finds it → Updates with token
3. Both happen simultaneously: One succeeds first, other merges/updates accordingly

**Alternatives considered**:
- Firestore transactions: Considered but rejected because transactions have limitations (max 500 operations, must read/write same document within transaction) and we're dealing with potentially different document IDs
- Distributed locking: Rejected as overkill for this use case
- Queue-based processing: Rejected as too complex for immediate fix

### 4. Atomic Updates for Related Documents

**Decision**: Use Firestore batch writes to update subscriptions and user document together, with separate handling for cases where batch isn't feasible.

**Rationale**:
- Firestore batch writes allow up to 500 operations atomically
- When migrating user document from random ID to Auth UID, we need to update all subscription documents that reference the old ID
- If batch write fails, we log the error and can retry or handle manually

**Implementation Pattern**:
```typescript
// When migrating user document
if (existingDocId !== authUid) {
  // 1. Create/update user document with Auth UID
  await firestore.doc(`users/${authUid}`).set(mergedData, { merge: true });
  
  // 2. Update all subscriptions to use new userId
  const subscriptionsQuery = await firestore.collection('subscriptions', ref =>
    ref.where('userId', '==', existingDocId)
  ).get();
  
  if (!subscriptionsQuery.empty) {
    const batch = firestore.firestore.batch();
    subscriptionsQuery.docs.forEach(doc => {
      batch.update(doc.ref, { userId: authUid });
    });
    await batch.commit();
  }
  
  // 3. Optionally delete old document (or keep as backup)
  // Keep old document for now to avoid data loss - can be cleaned up later
}
```

**Alternatives considered**:
- Firestore transactions: Considered but limited to 500 operations and require all reads before writes, making it complex for this scenario
- Sequential updates: Rejected because partial failures would leave inconsistent state
- Event-driven updates: Considered but rejected as over-engineered for immediate fix

### 5. PayfastToken Persistence During Payment Processing

**Decision**: Save payfastToken directly on user document during payment processing in payfastItn.ts, and preserve it during merge operations.

**Rationale**:
- Token is needed for billing history and subscription management
- Currently token is saved in subscriptions collection, but users need direct access on user document
- Token should be saved when payment is processed (ITN handler) and preserved during merge

**Implementation Pattern**:
```typescript
// In payfastItn.ts updateUserSubscription()
// When creating new user document
if (userQuery.empty) {
  const newUserData = {
    email: itnData.email_address,
    firstName: itnData.name_first,
    lastName: itnData.name_last,
    phoneNumber: itnData.cell_number || '',
    subscriptionStatus: 'active',
    subscriptionPlan: planName, // 'digitalMenu' for monthly, 'once-off' for one-time
    payfastToken: itnData.token || itnData.tokenisation, // SAVE TOKEN HERE
    lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  };
  
  await db.collection('users').add(newUserData);
}

// When updating existing user document
await db.collection('users').doc(userId).update({
  subscriptionStatus: 'active',
  subscriptionPlan: planName,
  payfastToken: tokenToSave, // ENSURE TOKEN IS SAVED
  lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
  updated_at: admin.firestore.FieldValue.serverTimestamp()
});

// In verify-email component merge logic
await userRef.set({
  ...existingData,
  payfastToken: existingData.payfastToken || tokenFromSubscription, // PRESERVE TOKEN
  // ... other fields
}, { merge: true });
```

**Alternatives considered**:
- Only store in subscriptions: Rejected because users need direct access for billing features
- Store in both places: This is what we're doing - redundant but necessary for performance (direct user doc lookup faster than querying subscriptions)
- Lazy loading: Considered but rejected - token should be immediately available after payment

### 6. Subscription Plan Value Mapping

**Decision**: Map subscription plan values correctly - 'digitalMenu' for monthly recurring subscriptions, 'once-off' for one-time payments.

**Rationale**:
- Payment documents currently use 'once-off' even for monthly subscriptions
- Sign-up flow expects 'digitalMenu' for monthly subscriptions
- We need to correctly determine if it's a recurring subscription (has token, subscription_type='1', or recurring_amount) and set plan accordingly

**Implementation Pattern**:
```typescript
// In payfastItn.ts
// Determine if recurring subscription
const hasToken = !!(itnData.token || itnData.tokenisation);
const hasSubscriptionType = itnData.subscription_type === '1';
const hasRecurringAmount = !!itnData.recurring_amount;
const isRecurring = hasSubscriptionType || hasRecurringAmount || hasToken;

// Set plan name
let planName = 'once-off';
if (isRecurring) {
  // For monthly subscriptions (sign-ups), use 'digitalMenu'
  // Frequency '3' = monthly, '4' = quarterly, etc.
  if (itnData.frequency === '3') {
    planName = 'digitalMenu'; // Monthly recurring subscription
  } else if (itnData.frequency) {
    // Other frequencies could map to other plan names if needed
    planName = 'digitalMenu'; // Default to digitalMenu for recurring
  } else {
    planName = 'digitalMenu'; // If recurring but no frequency, default to monthly
  }
} else {
  planName = 'once-off'; // One-time payment
}

// Save with correct plan name
await db.collection('users').doc(userId).update({
  subscriptionPlan: planName,
  subscriptionType: planName, // Also set subscriptionType for consistency
  // ...
});
```

**Alternatives considered**:
- Always use 'digitalMenu': Rejected because we need to distinguish one-time payments
- Use PayFast plan names directly: Rejected because they don't match our internal schema
- Create separate mapping table: Rejected as over-engineering - simple conditional logic is sufficient

## Summary

**Key Decisions**:
1. Use `set()` with `merge: true` for document merging
2. Map payment document fields to canonical schema (Surname, subscriptionType, cellphoneNumber)
3. Check for existing documents by email before creating new ones
4. Use batch writes for atomic subscription updates
5. Save payfastToken directly on user document during payment processing
6. Map subscription plans: 'digitalMenu' for monthly recurring, 'once-off' for one-time

**Implementation Approach**:
- Modify `verify-email.component.ts` to check for existing payment documents and merge them
- Modify `payfastItn.ts` to save payfastToken and use correct plan values
- Modify `auth.service.ts` SetUserData to handle field mapping during merge
- Use email-based queries to find existing documents
- Use batch writes for related document updates

**Risk Mitigation**:
- Preserve all existing data during merge (no data loss)
- Keep old documents as backup initially (can be cleaned up later)
- Log migration operations for audit
- Handle race conditions gracefully (last write wins, merge on conflict)




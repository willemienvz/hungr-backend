# Contract: PayFast ITN User Document Creation/Update

**Feature**: 003-fix-duplicate-user-docs  
**Date**: 2025-01-20  
**Type**: Internal Service Contract (Firebase Function)

## Overview

This contract defines how PayFast ITN handler creates and updates user documents during payment processing. This ensures payfastToken is saved and subscription plan values are set correctly.

## Operation: updateUserSubscription

### Input

**Location**: `functions/src/payfastItn.ts`  
**Function**: `updateUserSubscription(itnData: PayFastItnData)`

**Parameters**:
- `itnData`: PayFast ITN data
  - `email_address`: string (required)
  - `name_first`: string (required)
  - `name_last`: string (required)
  - `cell_number`: string (optional)
  - `token` or `tokenisation`: string (conditional - required for recurring subscriptions)
  - `subscription_type`: string (optional - '1' for recurring)
  - `frequency`: string (optional - '3' for monthly)
  - `recurring_amount`: string (optional - indicates recurring)
  - `amount_gross`: string (required)
  - `pf_payment_id`: string (required)

**Preconditions**:
- Payment status is 'COMPLETE'
- ITN data has been validated (signature, merchant ID, etc.)
- Transaction record has been created

### Process Flow

1. **Find user by email**:
   ```typescript
   const userQuery = await db.collection('users')
     .where('email', '==', itnData.email_address)
     .get();
   ```

2. **If user doesn't exist**:
   - Determine if recurring subscription (has token, subscription_type='1', or recurring_amount)
   - Determine plan name ('digitalMenu' for monthly recurring, 'once-off' for one-time)
   - Create new user document with random ID (via `.add()`)
   - **Save payfastToken** in document

3. **If user exists**:
   - Update existing user document
   - **Save payfastToken** in document
   - Set subscriptionPlan and subscriptionType to correct value

4. **Create or update subscription document**:
   - Link subscription to userId
   - Save token in subscription document
   - Update subscription status

### Output

**Result**: User document in `users` collection with:
- Email address (for lookup)
- First name, last name (from payment data)
- Phone number (if provided)
- subscriptionStatus: 'active'
- subscriptionPlan: 'digitalMenu' (monthly recurring) or 'once-off' (one-time)
- subscriptionType: Same as subscriptionPlan (for consistency)
- **payfastToken**: Saved directly on user document
- lastPaymentDate: Server timestamp
- created_at / updated_at: Server timestamps

**Note**: Document ID may be random (if created by payment) or Auth UID (if created/updated after sign-up). Email verification component will merge random ID documents into Auth UID documents.

## Subscription Plan Determination

**Recurring Subscription Detection**:
```typescript
const hasToken = !!(itnData.token || itnData.tokenisation);
const hasSubscriptionType = itnData.subscription_type === '1';
const hasRecurringAmount = !!itnData.recurring_amount;
const isRecurring = hasSubscriptionType || hasRecurringAmount || hasToken;
```

**Plan Name Mapping**:
- If `isRecurring && frequency === '3'`: `planName = 'digitalMenu'` (monthly)
- If `isRecurring && other frequency`: `planName = 'digitalMenu'` (default for recurring)
- If `!isRecurring`: `planName = 'once-off'` (one-time payment)

**Rationale**: Monthly recurring subscriptions (sign-ups) should use 'digitalMenu', not 'once-off'. The 'once-off' value should only be used for actual one-time payments.

## PayfastToken Persistence

**Requirement**: payfastToken MUST be saved on user document (not just subscriptions collection) to enable:
- Billing history access
- Billing details editing
- Subscription management operations

**Implementation**:
```typescript
// When creating new user document
const newUserData = {
  // ... other fields
  payfastToken: itnData.token || itnData.tokenisation, // SAVE TOKEN
};

// When updating existing user document
await db.collection('users').doc(userId).update({
  // ... other fields
  payfastToken: tokenToSave, // ENSURE TOKEN IS SAVED
});
```

## Field Names

**Note**: Payment-created documents may use different field names:
- `lastName` (instead of `Surname`)
- `phoneNumber` (instead of `cellphoneNumber`)
- `subscriptionPlan` (instead of `subscriptionType`)

These will be mapped to canonical schema during merge operation in email verification component. However, to reduce mapping complexity, consider using canonical field names directly in payment flow (optional enhancement).

## Error Handling

**Error**: User query fails  
**Response**: Log error, retry operation, throw error if persistent

**Error**: Token not provided for recurring subscription  
**Response**: Log warning, continue with one-time payment handling

**Error**: Document creation/update fails  
**Response**: Log error, retry operation, throw error if persistent

## Performance Requirements

- User document creation/update completes within 2 seconds for 95% of requests
- Subscription creation/update completes within 1 second for 95% of requests

## Testing

**Test Scenarios**:
1. New user with recurring subscription → Creates document with 'digitalMenu', saves token
2. New user with one-time payment → Creates document with 'once-off', no token
3. Existing user with recurring subscription → Updates document with 'digitalMenu', saves token
4. Token missing for recurring subscription → Logs warning, handles gracefully
5. Multiple ITN notifications for same payment → Handles duplicates correctly


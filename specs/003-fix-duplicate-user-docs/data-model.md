# Data Model: Fix Duplicate User Documents in Sign-Up

**Feature**: 003-fix-duplicate-user-docs  
**Date**: 2025-01-20  
**Purpose**: Define the canonical user document schema, field mappings, and relationships.

## User Document Schema (Canonical)

**Collection**: `users`  
**Document ID**: Firebase Auth UID (must match `uid` field)

### Core Fields

| Field | Type | Required | Description | Source |
|-------|------|----------|-------------|--------|
| `uid` | string | Yes | Firebase Auth UID (matches document ID) | Firebase Auth |
| `email` | string | Yes | User email address | Sign-up form / Payment |
| `firstName` | string | Yes | User first name | Sign-up form / Payment |
| `Surname` | string | Yes | User last name | Sign-up form (lastName) / Payment (lastName → Surname) |
| `cellphoneNumber` | string | No | User phone number | Sign-up form (cellphone) / Payment (phoneNumber → cellphoneNumber) |
| `emailVerified` | boolean | Yes | Email verification status | Firebase Auth |
| `accountType` | string | Yes | Account type (admin, editor) | Sign-up form / Default: 'admin' |
| `parentId` | string | No | Parent account ID (for editors) | Sign-up form / Payment |
| `created_at` | timestamp | Yes | Document creation timestamp | Server timestamp |
| `updated_at` | timestamp | Yes | Last update timestamp | Server timestamp |

### Subscription & Payment Fields

| Field | Type | Required | Description | Source | Notes |
|-------|------|----------|-------------|--------|-------|
| `subscriptionStatus` | string | Yes | Subscription status (active, cancelled, etc.) | Payment ITN | Payment data takes precedence |
| `subscriptionType` | string | Yes | Subscription plan type | Payment / Sign-up form | 'digitalMenu' for monthly, 'once-off' for one-time |
| `subscriptionPlan` | string | Deprecated | Legacy field (use subscriptionType) | Payment | Map from payment doc during merge |
| `payfastToken` | string | Conditional | PayFast subscription token | Payment ITN | Required for billing access |
| `lastPaymentDate` | timestamp | No | Last successful payment date | Payment ITN | Payment data takes precedence |

### User Preferences Fields

| Field | Type | Required | Description | Source |
|-------|------|----------|-------------|--------|
| `marketingConsent` | boolean | Yes | Marketing email consent | Sign-up form |
| `tipsTutorials` | boolean | Yes | Tips and tutorials preference | Sign-up form |
| `userInsights` | boolean | Yes | User insights preference | Sign-up form |
| `aboutUsDisplayed` | boolean | Yes | Whether about us was shown | Default: false |

### Legacy Payment Card Fields (Deprecated)

| Field | Type | Required | Description | Notes |
|-------|------|----------|-------------|-------|
| `cardHolderName` | string | No | Card holder name | Legacy, not used |
| `cardNumber` | string | No | Card number | Legacy, not used |
| `cvv` | number | No | CVV code | Legacy, not used |
| `expiryDate` | string | No | Card expiry date | Legacy, not used |

## Field Mapping Rules

### Payment Document → Canonical Schema

Payment-created documents use different field names that must be mapped to canonical schema during merge:

| Payment Field | Canonical Field | Mapping Rule |
|---------------|-----------------|--------------|
| `lastName` | `Surname` | Direct mapping: `Surname: paymentData.lastName` |
| `phoneNumber` | `cellphoneNumber` | Direct mapping: `cellphoneNumber: paymentData.phoneNumber` |
| `subscriptionPlan` | `subscriptionType` | Value mapping: See subscription plan mapping below |
| `subscriptionPlan` | `subscriptionPlan` | Deprecated field preserved for backward compatibility |

### Subscription Plan Value Mapping

**From Payment Document (`subscriptionPlan`)**:
- `'once-off'` → `'once-off'` (one-time payment)
- Any monthly/recurring value → `'digitalMenu'` (monthly recurring subscription)
- Missing or undefined → `'digitalMenu'` (default for recurring subscriptions with token)

**To User Document (`subscriptionType`)**:
- `'digitalMenu'` for monthly recurring subscriptions
- `'once-off'` for one-time payments

**Determination Logic**:
```typescript
// If payment has token or subscription_type='1' or recurring_amount → recurring subscription
const isRecurring = hasToken || subscriptionType === '1' || hasRecurringAmount;
const planName = isRecurring ? 'digitalMenu' : 'once-off';
```

## Conflict Resolution Rules

When merging payment-created and sign-up-created documents:

### User-Provided Fields (Form Data Takes Precedence)

- `firstName`: Form data takes precedence (user input is most accurate)
- `Surname`: Form data takes precedence (user input is most accurate)
- `cellphoneNumber`: Form data takes precedence (user input is most accurate)
- `marketingConsent`: Form data takes precedence (user choice)
- `tipsTutorials`: Form data takes precedence (user choice)
- `userInsights`: Form data takes precedence (user choice)

### Payment/Subscription Fields (Payment Data Takes Precedence)

- `subscriptionStatus`: Payment data takes precedence (source of truth)
- `subscriptionType` / `subscriptionPlan`: Payment data takes precedence (payment determines plan)
- `payfastToken`: Payment data takes precedence (only available from payment)
- `lastPaymentDate`: Payment data takes precedence (payment determines date)

### System Fields

- `uid`: Must be Firebase Auth UID (document ID)
- `email`: Should match (both sources should have same email)
- `emailVerified`: Firebase Auth value takes precedence
- `accountType`: Existing value or default 'admin' takes precedence
- `created_at`: Earliest timestamp preserved
- `updated_at`: Server timestamp on merge

## Related Collections

### Subscription Document

**Collection**: `subscriptions`  
**Key Relationship**: `userId` field references `users/{uid}`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Reference to user document ID (must be Auth UID after migration) |
| `token` | string | PayFast subscription token |
| `status` | string | Subscription status (active, cancelled, paused) |
| `plan` | string | Subscription plan (monthly, quarterly, etc.) |

**Migration Rule**: When user document is migrated from random ID to Auth UID, all subscription documents with `userId` matching old ID must be updated to use new Auth UID.

### Transaction Document

**Collection**: `transactions`  
**Key Relationship**: `email_address` field matches `users/{uid}.email`

| Field | Type | Description |
|-------|------|-------------|
| `email_address` | string | User email (used to link transactions to user) |
| `pf_payment_id` | string | PayFast payment ID |
| `payment_status` | string | Payment status (COMPLETE, FAILED, etc.) |

**Note**: Transactions are linked to users via email, not user ID. No migration needed when user document ID changes.

## Document ID Strategy

### Current Problem

- **Payment Flow**: Creates user documents with random IDs using `db.collection('users').add()`
- **Sign-up Flow**: Creates user documents with Auth UID using `afs.doc('users/${user.uid}').set()`

### Solution

- **Canonical**: All user documents MUST use Firebase Auth UID as document ID
- **Migration**: When payment-created document has random ID and sign-up creates Auth UID document, merge data into Auth UID document
- **Old Document**: Keep old random ID document temporarily for backup (can be deleted after verification)

## Validation Rules

1. **Document ID Validation**: Document ID must match `uid` field
2. **Email Uniqueness**: Only one user document per email address (enforced by merge logic)
3. **Token Presence**: If subscriptionStatus is 'active', payfastToken should be present
4. **Plan Consistency**: subscriptionType and subscriptionPlan (if present) should be consistent
5. **Required Fields**: uid, email, firstName, Surname, emailVerified, accountType, subscriptionStatus, subscriptionType must be present

## State Transitions

### User Document Creation

1. **Payment First** (Random ID) → **Sign-up** (Auth UID): Merge random ID document into Auth UID document
2. **Sign-up First** (Auth UID) → **Payment** (Updates): Update existing Auth UID document with payment data
3. **Sign-up Only** (No Payment): Create Auth UID document with form data only
4. **Payment Only** (No Sign-up Yet): Create random ID document (will be merged later when sign-up occurs)

### Migration Flow

```
Payment Document (Random ID) → Check by email → Found → Merge into Auth UID Document → Update Subscriptions → Keep Old Document (Optional Delete)
```

## Example Documents

### Payment-Created Document (Before Merge)

```json
{
  "email": "kb@kosoftgo.com",
  "firstName": "KB",
  "lastName": "RED TEST",
  "phoneNumber": "",
  "subscriptionStatus": "active",
  "subscriptionPlan": "once-off",
  "lastPaymentDate": "2025-11-19T16:00:27Z",
  "created_at": "2025-11-19T16:00:26Z",
  "updated_at": "2025-11-19T16:00:27Z"
}
```

### Sign-up Created Document (Before Merge)

```json
{
  "uid": "MggImfUcLTZ0RmMyIf3REOQ082",
  "email": "kb@kosoftgo.com",
  "firstName": "KB",
  "Surname": "RED TEST",
  "cellphoneNumber": "+27123456789",
  "emailVerified": false,
  "accountType": "admin",
  "subscriptionType": "digitalMenu",
  "marketingConsent": false,
  "tipsTutorials": false,
  "userInsights": false,
  "aboutUsDisplayed": false,
  "parentId": ""
}
```

### Merged Document (After Merge)

```json
{
  "uid": "MggImfUcLTZ0RmMyIf3REOQ082",
  "email": "kb@kosoftgo.com",
  "firstName": "KB",
  "Surname": "RED TEST",
  "cellphoneNumber": "+27123456789",
  "emailVerified": false,
  "accountType": "admin",
  "subscriptionStatus": "active",
  "subscriptionType": "digitalMenu",
  "payfastToken": "abc123...",
  "lastPaymentDate": "2025-11-19T16:00:27Z",
  "marketingConsent": false,
  "tipsTutorials": false,
  "userInsights": false,
  "aboutUsDisplayed": false,
  "parentId": "",
  "created_at": "2025-11-19T16:00:26Z",
  "updated_at": "2025-11-19T16:00:27Z"
}
```




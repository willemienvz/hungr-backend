# Contract: User Document Merge Operation

**Feature**: 003-fix-duplicate-user-docs  
**Date**: 2025-01-20  
**Type**: Internal Service Contract

## Overview

This contract defines the user document merge operation that consolidates payment-created user documents (with random IDs) into sign-up-created user documents (with Auth UIDs). This is an internal operation within the sign-up flow, not an external API.

## Operation: mergeUserDocument

### Input

**Location**: `src/app/components/verify-email/verify-email.component.ts`  
**Method**: `createUserAccount(formData: any)`

**Parameters**:
- `formData`: User registration form data
  - `userEmail`: string (required)
  - `password`: string (required)
  - `firstName`: string (required)
  - `lastName`: string (required)
  - `cellphone`: string (optional)
  - `receiveMarketingInfo`: boolean (optional)
  - `billingOption`: string (optional) - subscription plan selection

**Preconditions**:
- User email not verified in Firebase Auth yet
- Payment ITN may have already created a user document with random ID
- Firebase Auth account will be created during this operation

### Process Flow

1. **Check for existing user document by email**:
   ```typescript
   const existingUser = await authService.getUserByEmail(formData.userEmail);
   ```

2. **If existing user found**:
   - Create Firebase Auth account (if not exists)
   - Query Firestore for existing user document by email
   - If document ID doesn't match Auth UID:
     - Map payment document fields to canonical schema
     - Merge data into Auth UID document
     - Update subscription references to use Auth UID
     - Keep old document as backup (optional delete)

3. **If no existing user**:
   - Create Firebase Auth account
   - Create new user document with Auth UID

### Output

**Result**: Single unified user document in `users` collection with:
- Document ID = Firebase Auth UID
- All payment data preserved (payfastToken, subscriptionStatus, lastPaymentDate)
- All form data merged (firstName, Surname, cellphoneNumber, marketing preferences)
- Field names mapped to canonical schema (Surname, subscriptionType, cellphoneNumber)

**Related Updates**:
- All `subscriptions` documents updated to reference Auth UID
- Old random ID document optionally deleted (or kept as backup)

### Side Effects

- Creates Firebase Auth account
- Sends email verification email
- Updates subscription document references
- Logs migration operations for audit

## Field Mapping Rules

See [data-model.md](../data-model.md#field-mapping-rules) for complete field mapping specification.

**Key Mappings**:
- `lastName` (payment) → `Surname` (canonical)
- `phoneNumber` (payment) → `cellphoneNumber` (canonical)
- `subscriptionPlan` (payment) → `subscriptionType` (canonical)
- `subscriptionPlan: 'once-off'` → `subscriptionType: 'once-off'`
- `subscriptionPlan: monthly/recurring` → `subscriptionType: 'digitalMenu'`

## Conflict Resolution

See [data-model.md](../data-model.md#conflict-resolution-rules) for complete conflict resolution specification.

**User-provided fields**: Form data takes precedence  
**Payment/subscription fields**: Payment data takes precedence  
**System fields**: System values take precedence (uid, emailVerified, timestamps)

## Error Handling

**Error**: User already exists in Firebase Auth  
**Response**: Redirect to sign-in page with warning message

**Error**: Payment document not found  
**Response**: Continue with normal sign-up flow (create new document)

**Error**: Subscription update fails  
**Response**: Log error, continue with user document merge (manual fix required)

**Error**: Merge operation fails  
**Response**: Log error, show user-friendly error message, preserve existing documents

## Performance Requirements

- Merge operation completes within 5 seconds for 95% of requests
- Batch subscription updates complete within 2 seconds for typical subscriptions (1-5 subscriptions per user)

## Testing

**Test Scenarios**:
1. Payment document exists with random ID → Merge into Auth UID document
2. Payment document exists with Auth UID → Update existing document
3. No payment document exists → Create new Auth UID document
4. Multiple subscriptions exist → All updated to use Auth UID
5. Field mapping works correctly → All fields mapped to canonical schema
6. Token preservation works → payfastToken preserved during merge

